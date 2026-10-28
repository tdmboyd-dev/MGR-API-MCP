import test from "node:test";
import assert from "node:assert/strict";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { createAuthorizedMgrMcpHttpHandler } from "../src/mcp-http.js";
import { LegacyEdgeClient } from "../src/legacy-client.js";

test("authenticated MCP client discovers source catalog without calling a domain provider",async()=>{
  let domainCalls=0;
  const audience="https://api.fixture.invalid/mcp";
  const handler=createAuthorizedMgrMcpHttpHandler({
    verifier:{async verify(token){return token==="isolated-fixture"?{subject:"fixture-actor",tenantId:"fixture-tenant",audience,scopes:["tools:read"],expiresAt:Date.now()+60_000}:null;}},
    resourceAudience:audience,requiredScopes:["tools:read"],resourceMetadataUrl:"https://api.fixture.invalid/.well-known/oauth-protected-resource",
    legacy:new LegacyEdgeClient({baseUrl:"https://fixture.invalid",fetcher:async()=>{domainCalls++;throw new Error("Discovery must not call the business service");}})
  });
  const client=new Client({name:"tevin-discovery-contract",version:"1.0.0"});
  const transport=new StreamableHTTPClientTransport(new URL(audience),{
    authProvider:{token:async()=>"isolated-fixture"},
    fetch:async(input,init)=>handler.fetch(new Request(input,init))
  });
  try{
    const missing=await handler.fetch(new Request(audience));
    assert.equal(missing.status,401);
    await client.connect(transport);
    const list=await client.listTools();
    assert.ok(list.tools.some(t=>t.name==="mgr_ecosystem_catalog"));
    const result=await client.callTool({name:"mgr_ecosystem_catalog",arguments:{repoId:"MGR-SIGN-ME"}});
    assert.notEqual(result.isError,true);
    const block=result.content.find(b=>b.type==="text");
    assert.ok(block && block.type==="text");
    const catalog=JSON.parse(block.text);
    assert.equal(catalog.entries[0].repoId,"MGR-SIGN-ME");
    assert.equal(catalog.entries[0].runtimeVerified,false);
    assert.equal(catalog.entries[0].integration.tools.length,0);
    assert.equal(domainCalls,0);
    const invalid=await client.callTool({name:"mgr_ecosystem_catalog",arguments:{repoId:"unknown"}});
    assert.equal(invalid.isError,true);
  }finally{await client.close();await handler.close();}
});
