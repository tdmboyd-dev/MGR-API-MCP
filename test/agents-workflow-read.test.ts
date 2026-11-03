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
  const workflowId = "33333333-3333-4333-8333-333333333333";
  let history = false, status = 200;
  let reply = JSON.stringify({ id: runId, workflowId: "workflow" });
  const send = t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    if(history) assert.equal(url.href, origin + "/api/workflows/run?workflowId=" + workflowId);
    else assert.equal(url.href, origin + "/api/workflows/run?runId=" + runId + (url.searchParams.has("view") ? "&view=summary" : ""));
    assert.equal(new Headers(init.headers).get("authorization"), "Bearer " + token);
    assert.equal(init.redirect, "error");
    return new Response(url.searchParams.has("view") ? JSON.stringify({id:runId,workflowId:"workflow",view:"summary"}) : reply, {status});
  });
  let call!: (input: {runId:string}|{workflowId:string}) => Promise<{isError?:boolean;content: {text:string}[]}>;
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
  assert.equal(JSON.parse((await call({runId})).content[0]?.text??"{}").view,"summary");
  history=true;
  reply=JSON.stringify({runs:[{id:runId,workflowId}],hasMore:true,nextCursor:runId});
  assert.equal((await call({workflowId})).isError,true);
  reply=JSON.stringify({runs:[{id:runId,workflowId}],hasMore:false});
  assert.equal((await call({workflowId})).content[0]?.text,reply);
  const fullPage = Array.from({length:20}, (_,index)=>({
    id:`22222222-2222-4222-8222-${String(index).padStart(12,"0")}`,workflowId,
    status:"completed",outcomeState:"recorded",startedAt:"2026-11-03T00:00:00.000Z",
    completedAt:"2026-11-03T00:00:01.000Z",stepResults:"fixture-private-output",
  }));
  reply=JSON.stringify({runs:fullPage,hasMore:true,nextCursor:fullPage.at(-1)?.id});
  const page=JSON.parse((await call({workflowId})).content[0]?.text??"{}");
  assert.equal(page.runs.length,20);
  assert.equal(page.runs.some((row:object)=>"stepResults" in row),false);
  assert.equal(page.nextCursor,fullPage.at(-1)?.id);
  reply=JSON.stringify({runs:[{id:runId,workflowId:runId}],hasMore:false});
  assert.equal((await call({workflowId})).isError,true);
  reply=JSON.stringify({runs:[{id:runId,workflowId},{id:runId,workflowId}],hasMore:false});
  assert.equal((await call({workflowId})).isError,true);
  status=404;
  reply="private upstream error";
  assert.deepEqual(JSON.parse((await call({workflowId})).content[0]?.text??"{}"),{readOutcome:"unavailable",workflowId});
});
