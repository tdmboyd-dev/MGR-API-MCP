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

test("catalog requires read scope even when Legacy is disconnected",async()=>{
  const audience="https://api.mgr.example/mcp";
  const handler=createAuthorizedMgrMcpHttpHandler({
    verifier:{async verify(token){
      const verified=await verifier.verify("good");
      if(!verified || !["good","execute-only"].includes(token)) return null;
      return {...verified,scopes:token==="good"?verified.scopes:["tools:execute"]};
    }},
    resourceAudience:audience,
    requiredScopes:["tools:execute"],
    resourceMetadataUrl:"https://api.mgr.example/.well-known/oauth-protected-resource"
  });
  async function catalog(token:string){
    const response=await handler.fetch(new Request(audience,{
      method:"POST",
      headers:{authorization:"Bearer "+token,"content-type":"application/json",accept:"application/json, text/event-stream"},
      body:JSON.stringify({jsonrpc:"2.0",id:1,method:"tools/call",params:{name:"mgr_ecosystem_catalog",arguments:{repoId:"MGR-LEGACY"}}})
    }));
    assert.equal(response.status,200);
    return response.text();
  }
  try{
    const denied=await catalog("execute-only");
    assert.match(denied,/"isError":true/);
    assert.match(denied,/missing required scopes: tools:read/);
    assert.doesNotMatch(denied,/localVerification/);
    const allowed=await catalog("good");
    assert.match(allowed,/localVerification/);
    assert.doesNotMatch(allowed,/"isError":true/);
  }finally{await handler.close();}
});
