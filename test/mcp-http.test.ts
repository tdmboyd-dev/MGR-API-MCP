import assert from "node:assert/strict";
import test from "node:test";
import {
  authorizeAndBindMcpRequest,
  createAuthorizedMgrMcpHttpHandler,
  createMgrMcpHttpHandler
} from "../src/mcp-http.js";
import { LegacyEdgeClient } from "../src/legacy-client.js";

test("remote MCP factory exposes a web-standard fetch handler", () => {
  const handler = createMgrMcpHttpHandler();
  assert.equal(typeof handler.fetch, "function");
  assert.equal(typeof handler.close, "function");
});

const verifier={
  async verify(token:string){
    if(token!=="good") return null;
    return {
      subject:"actor-1",
      tenantId:"tenant-1",
      audience:"https://api.mgr.example/mcp",
      scopes:["tools:read","tools:execute"],
      expiresAt:Date.now()+60_000
    };
  }
};

test("authorized remote MCP binding derives identity from verified token",async()=>{
  const result=await authorizeAndBindMcpRequest(
    new Request("https://api.mgr.example/mcp",{
      headers:{authorization:"Bearer good"}
    }),
    {
      verifier,
      resourceAudience:"https://api.mgr.example/mcp",
      requiredScopes:["tools:read"],
      resourceMetadataUrl:"https://api.mgr.example/.well-known/oauth-protected-resource"
    }
  );
  assert.equal(result.ok,true);
  if(result.ok){
    assert.equal(result.auth.actorId,"actor-1");
    assert.equal(result.auth.tenantId,"tenant-1");
  }
});

test("authorized remote MCP handler fails closed before protocol dispatch",async()=>{
  const legacy=new LegacyEdgeClient({
    baseUrl:"https://legacy.example/",
    fetcher:async()=>new Response(JSON.stringify({accepted:true}),{status:200})
  });
  const handler=createAuthorizedMgrMcpHttpHandler({
    verifier,
    resourceAudience:"https://api.mgr.example/mcp",
    requiredScopes:["tools:read"],
    resourceMetadataUrl:"https://api.mgr.example/.well-known/oauth-protected-resource",
    legacy
  });
  const response=await handler.fetch(new Request("https://api.mgr.example/mcp"));
  assert.equal(response.status,401);
  assert.match(response.headers.get("www-authenticate") ?? "",/resource_metadata=/);
  await handler.close();
});
