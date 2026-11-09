import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHash, createHmac } from "node:crypto";
import type { AuthContext } from "../src/authz.js";
import {
  codeMonsterActionDigest, codeMonsterCanonicalV1, CodeMonsterBridgeClient,
  CodeMonsterTransportError,
} from "../src/code-monster-client.js";
import { callCodeMonsterMcp, type CodeMonsterApprovalResolver } from "../src/code-monster-mcp-tools.js";

const secret = Buffer.alloc(32, 0x3b);
const auth: AuthContext = {
  actorId: "actor-1", tenantId: "tenant-1", audience: "https://api.mgr.example/mcp",
  scopes: ["tools:read", "tools:execute"], expiresAt: Date.now() + 600_000,
};
const base = { auth, resourceAudience: auth.audience, allowedTenantId: "tenant-1" };

test("exact Code Monster canonical digest matches live sibling contract gold fixture", () => {
  assert.equal(codeMonsterActionDigest({
    method: "repair.stage", actorId: "actor-1", tenantId: "tenant-1",
    args: { filePath: "src/a.ts", newText: "fixed", oldText: "broken" },
  }), "2eb41a92c7a1c5e160a941d42e55543a3487ed28a74906fad92fc71045e7ac6f");
  assert.equal(codeMonsterCanonicalV1({ z: 1, a: [2, { b: true, a: "test" }] }),
    '{"a":[2,{"a":"test","b":true}],"z":1}');
  assert.throws(() => codeMonsterCanonicalV1({ text: "e\u0301" }), /non-NFC/);
  assert.throws(() => codeMonsterCanonicalV1({ amount: -0 }), /invalid JSON/);
});

test("real loopback HTTP signs bounded body and binds verified OAuth actor/tenant", async () => {
  const seen = new Set<string>();
  const server = createServer(async (req, res) => {
    let body = Buffer.alloc(0);
    for await (const chunk of req) body = Buffer.concat([body, Buffer.from(chunk)]);
    const timestamp = Number(req.headers["x-mgr-date"]);
    const nonce = String(req.headers["x-mgr-nonce"]);
    const provided = req.headers["x-mgr-signature"];
    const expected = createHmac("sha256", secret).update(
      `mgr-code-monster-v1\n${timestamp}\n${nonce}\n${createHash("sha256").update(body).digest("hex")}`,
    ).digest("hex");
    assert.equal(provided, expected);
    assert.ok(Math.abs(Date.now() - timestamp) < 60_000);
    assert.ok(!seen.has(nonce));
    seen.add(nonce);
    assert.equal(req.method, "POST");
    assert.equal(req.url, "/v1/mgr-code-monster/invoke");
    const message = JSON.parse(body.toString("utf8"));
    assert.equal(message.principal.actorId, auth.actorId);
    assert.equal(message.principal.tenantId, auth.tenantId);
    assert.equal(message.principal.audience, "mgr-code-monster");
    assert.equal(message.method, "portfolio.plan");
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, result: { state: "DISCOVERY_ONLY_NOT_EXECUTED" } }));
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("loopback server unavailable");
    const codeMonster = new CodeMonsterBridgeClient({
      baseUrl: `http://127.0.0.1:${address.port}/`, secret,
    });
    const result = await callCodeMonsterMcp({ ...base, codeMonster }, "portfolio.plan");
    assert.equal(result.accepted, true);
    assert.deepEqual(result.result, { ok: true, result: { state: "DISCOVERY_ONLY_NOT_EXECUTED" } });
    assert.equal(seen.size, 1);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});

test("public plain HTTP, missing key, unsanctioned scopes, forged approval are denied before dispatch", async () => {
  assert.throws(() => new CodeMonsterBridgeClient({ baseUrl: "http://example.com/", secret }), /HTTPS/);
  assert.throws(() => new CodeMonsterBridgeClient({ baseUrl: "https://example.com/", secret: Buffer.alloc(7) }), /32 bytes/);
  let calls = 0;
  const codeMonster = new CodeMonsterBridgeClient({ baseUrl: "https://api.example.com/", secret,
    fetcher: async () => { calls++; return new Response(JSON.stringify({ ok: true })); } });
  await assert.rejects(codeMonster.invoke({ auth: { ...auth, scopes: ["tools:read"] }, method: "repair.stage" }), /scope/);
  await assert.rejects(codeMonster.invoke({ auth, method: "repair.stage", approval: {
    state: "approved", actionDigest: "0".repeat(64), expiresAt: Date.now() + 120_000,
  } }), /exact-action/);
  assert.equal(calls, 0);
});

test("MCP tenant and scope denials fail closed without hitting Code Monster", async () => {
  let calls = 0;
  const codeMonster = { async invoke() { calls++; return { ok: true }; } };
  const wrong = await callCodeMonsterMcp({ ...base, allowedTenantId: "tenant-other", codeMonster }, "capabilities");
  assert.equal(wrong.state, "DENY");
  const readOnly = await callCodeMonsterMcp({ ...base, auth: { ...auth, scopes: ["tools:read"] }, codeMonster }, "repair.stage", {}, "approval-1");
  assert.equal(readOnly.state, "DENY");
  const absent = await callCodeMonsterMcp({ ...base, codeMonster }, "repair.stage", {}, "approval-1");
  assert.equal(absent.state, "APPROVAL_UNAVAILABLE");
  assert.equal(calls, 0);
});

test("MCP resolves independent exact-action approval and never accepts caller authority", async () => {
  const args = { filePath: "src/handler.mjs", expectedCommit: "a".repeat(40) };
  const digest = codeMonsterActionDigest({ method: "repair.stage", actorId: auth.actorId, tenantId: auth.tenantId, args });
  let calls = 0;
  const codeMonster = { async invoke(input: { approval?: { actionDigest: string }, method: string }) {
    calls++;
    assert.equal(input.method, "repair.stage");
    assert.equal(input.approval?.actionDigest, digest);
    return { ok: true, state: "candidate-pending-independent-verification" };
  } };
  let returnedActor = "actor-other";
  const approvalResolver: CodeMonsterApprovalResolver = {
    async resolve({ approvalId, actorId, tenantId, actionDigest }) {
      assert.equal(actionDigest, digest);
      return { approvalId, actorId: returnedActor, tenantId,
        state: "approved", actionDigest: digest, expiresAt: Date.now() + 60_000 };
    },
  };
  const blocked = await callCodeMonsterMcp({ ...base, codeMonster, approvalResolver }, "repair.stage", args, "approved-abc123");
  assert.equal(blocked.state, "DENY");
  returnedActor = "actor-1";
  const allowed = await callCodeMonsterMcp({ ...base, codeMonster, approvalResolver }, "repair.stage", args, "approved-abc123");
  assert.equal(allowed.accepted, true);
  assert.equal(calls, 1);
});

test("write timeout returns UNKNOWN_EXTERNAL_STATE and requires reconciliation, not automatic retry", async () => {
  let calls = 0;
  const codeMonster = new CodeMonsterBridgeClient({ baseUrl: "https://api.example.com/", secret,
    fetcher: async () => { calls++; throw new TypeError("connection dropped after send"); } });
  const args = { filePath: "src/x.mjs" };
  const digest = codeMonsterActionDigest({ method: "repair.stage", actorId: auth.actorId, tenantId: auth.tenantId, args });
  const approvalResolver: CodeMonsterApprovalResolver = {
    async resolve({ approvalId, actorId, tenantId }) {
      return { approvalId, actorId, tenantId, state: "approved", actionDigest: digest, expiresAt: Date.now() + 60_000 };
    },
  };
  const result = await callCodeMonsterMcp({ ...base, codeMonster, approvalResolver }, "repair.stage", args, "approved-abc123");
  assert.equal(result.state, "UNKNOWN_EXTERNAL_STATE");
  assert.equal(result.reconciliationRequired, true);
  assert.equal(calls, 1);
  await assert.rejects(codeMonster.invoke({ auth, method: "portfolio.plan" }), (error: unknown) => {
    assert.ok(error instanceof CodeMonsterTransportError);
    assert.equal(error.state, "SOURCE_UNAVAILABLE");
    return true;
  });
});

test("domain rejection inside HTTP success is never reported as a completed repair", async () => {
  const args = { filePath: "src/x.mjs" };
  const digest = codeMonsterActionDigest({ method: "repair.stage", actorId: auth.actorId, tenantId: auth.tenantId, args });
  const result = await callCodeMonsterMcp({ ...base,
    codeMonster: { async invoke() { return { ok: true, result: { accepted: false, state: "NO_REPAIR_CONSENSUS" } }; } },
    approvalResolver: { async resolve({ approvalId, actorId, tenantId }) {
      return { approvalId, actorId, tenantId, state: "approved", actionDigest: digest, expiresAt: Date.now() + 60_000 };
    } },
  }, "repair.stage", args, "approved-abc123");
  assert.equal(result.accepted, false);
  assert.equal(result.state, "NO_REPAIR_CONSENSUS");
  assert.equal(result.productionReady, false);
});
