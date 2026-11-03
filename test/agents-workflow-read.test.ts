import assert from "node:assert/strict";
import test from "node:test";
import type { McpServer } from "@modelcontextprotocol/server";
import { registerAgentsWorkflowRead } from "../src/agents-workflow-read.js";

test("Agents workflow read binds the owner, credential, response identity and size", async t => {
  const runId = "22222222-2222-4222-8222-222222222222";
  const origin = "https://agents.example";
  const token = "fixture-token-".repeat(3);
  const auth = { actorId: "foreign", tenantId: "tenant", audience: "edge",
    scopes: ["tools:read", "workflows:read"], expiresAt: Date.now() + 60_000 };
  let reply = JSON.stringify({ id: runId, workflowId: "workflow" });
  const send = t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.href, origin + "/api/workflows/run?runId=" + runId);
    assert.equal(new Headers(init.headers).get("authorization"), "Bearer " + token);
    assert.equal(init.redirect, "error");
    return new Response(reply);
  });
  let call!: (input: {runId:string}) => Promise<{isError?:boolean;content: {text:string}[]}>;
  const server = { registerTool(name:string, _definition:unknown, handler:typeof call) {
    assert.equal(name,"mgr_agents_workflow_read");
    call = handler;
  } } as unknown as McpServer;
  registerAgentsWorkflowRead(server, { auth, origin, token, resourceAudience:"edge",
    owner:{actorId:"owner",tenantId:"tenant"} });
  assert.equal((await call({runId})).isError,true);
  assert.equal(send.mock.callCount(),0);
  auth.actorId="owner";
  assert.equal((await call({runId})).content[0]?.text,reply);
  reply=JSON.stringify({id:"different",workflowId:"workflow"});
  assert.equal((await call({runId})).isError,true);
  reply="x".repeat(12_001);
  assert.match((await call({runId})).content[0]?.text??"",/exceeds read limit/);
});
