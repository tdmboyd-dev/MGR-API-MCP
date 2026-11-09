import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { createAuthorizedMgrMcpHttpHandler } from "../src/mcp-http.js";
import { CodeMonsterBridgeClient } from "../src/code-monster-client.js";
import { LegacyEdgeClient } from "../src/legacy-client.js";

async function exerciseProtocol(tenantId: string) {
  const downstream: string[] = [];
  const codeMonster = new CodeMonsterBridgeClient({
    baseUrl: "https://code-monster.internal.example/", secret: Buffer.alloc(32, 5),
    fetcher: async (_url, options) => {
      const body = JSON.parse(String(options?.body));
      downstream.push(`${body.method}:${body.principal.tenantId}`);
      return new Response(JSON.stringify({ ok: true, result: { source: "code-monster", method: body.method } }),
        { headers: { "content-type": "application/json" } });
    },
  });
  const handler = createAuthorizedMgrMcpHttpHandler({
    verifier: { async verify(token) {
      if (token !== "owner") return null;
      return { subject: "rare-actor", tenantId, audience: "http://127.0.0.1/mcp",
        scopes: ["tools:read", "tools:execute"], expiresAt: Date.now() + 60_000 };
    } },
    resourceAudience: "http://127.0.0.1/mcp",
    resourceMetadataUrl: "http://127.0.0.1/.well-known/oauth-protected-resource",
    requiredScopes: ["tools:read"],
    legacy: new LegacyEdgeClient({ baseUrl: "https://legacy.example/", fetcher: async () => new Response("{}") }),
    codeMonster, codeMonsterAllowedTenantId: "owner-tenant",
  });
  const http = createServer(async (req, res) => {
    try {
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (Array.isArray(value)) value.forEach(item => headers.append(key, item));
        else if (value !== undefined) headers.set(key, value);
      }
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const body = Buffer.concat(chunks);
      const request = new Request("http://127.0.0.1/mcp", {
        method: req.method ?? "GET", headers, ...(body.length ? { body } : {}),
      });
      const response = await handler.fetch(request);
      res.statusCode = response.status;
      response.headers.forEach((value, name) => res.setHeader(name, value));
      if (response.body) Readable.fromWeb(response.body as never).pipe(res);
      else res.end();
    } catch (error) { res.statusCode = 500; res.end(String(error)); }
  });
  await new Promise<void>(resolve => http.listen(0, "127.0.0.1", resolve));
  const address = http.address();
  if (!address || typeof address === "string") throw new Error("missing test endpoint");
  const client = new Client({ name: "rare-mgr-acceptance", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${address.port}/mcp`), {
    authProvider: { token: async () => "owner" },
  });
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    assert.ok(tools.tools.some(item => item.name === "mgr_code_monster_portfolio_plan"));
    const portfolio = await client.callTool({ name: "mgr_code_monster_portfolio_plan", arguments: {} });
    assert.equal(portfolio.isError, tenantId !== "owner-tenant");
    const block = portfolio.content?.find(item => item.type === "text");
    if (!block || block.type !== "text") throw new Error("missing MCP tool result");
    const result = JSON.parse(block.text);
    assert.equal(result.accepted, tenantId === "owner-tenant");
    if (tenantId === "owner-tenant") {
      assert.deepEqual(downstream, ["portfolio.plan:owner-tenant"]);
    } else {
      assert.equal(downstream.length, 0);
    }
    const stage = await client.callTool({ name: "mgr_code_monster_repair_stage", arguments: {
      approvalId: "approval-identity-0001", args: { expectedCommit: "a".repeat(40) },
    } });
    assert.equal(stage.isError, true);
    assert.equal(downstream.length, tenantId === "owner-tenant" ? 1 : 0);
  } finally {
    await client.close().catch(() => {});
    await handler.close();
    await new Promise<void>(resolve => http.close(() => resolve()));
  }
}

test("actual MCP client invokes registered Code Monster tool through verified OAuth tenant", async () => {
  await exerciseProtocol("owner-tenant");
});

test("actual MCP protocol blocks different tenant and blocks write without independent approval", async () => {
  await exerciseProtocol("foreign-tenant");
});
