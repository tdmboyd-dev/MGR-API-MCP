import test from "node:test";
import assert from "node:assert/strict";
import {ForgeStudioCatalogClient} from "../src/forge-catalog-client.js";
import {searchForgeMcp} from "../src/forge-mcp-tools.js";

const audience="https://mcp.mgr.example/mcp";
const auth={actorId:"time",tenantId:"mgr-owner",audience,
            scopes:["tools:read"],expiresAt:Date.now()+60_000};

test("Forge Studio read-only adapter forwards only bounded source search and its token",async()=>{
  let received:{url:string;path:string;token:string;payload:any}|undefined;
  const client=new ForgeStudioCatalogClient({
    baseUrl:"http://127.0.0.1:8444",token:"local-secret",
    transport:async(input,init)=>{
      const url=new URL(String(input));
      received={url:url.origin,path:url.pathname,
                token:new Headers(init?.headers).get("X-MGR-Forge-Token") ?? "",
                payload:JSON.parse(String(init?.body))};
      return Response.json({status:"CACHED_SOURCE_METADATA",listings:[{title:"Dragon",rights_status:"SOURCE_CC0_CLAIM_REVIEW_PENDING"}]});
    }
  });
  const result=await client.search({mode:"models",query:"dragon",live:true,limit:4});
  assert.equal(received?.url,"http://127.0.0.1:8444");
  assert.equal(received?.path,"/api/asset-search");
  assert.equal(received?.token,"local-secret");
  assert.deepEqual(received?.payload,{query:"dragon",live:true,limit:4,
                                      provider:"3dassets",kind:"models"});
  assert.equal(result.status,"CACHED_SOURCE_METADATA");
});

test("Forge Studio client rejects insecure off-device transport",()=>{
  assert.throws(()=>new ForgeStudioCatalogClient({baseUrl:"http://forge.internal:8444",token:"token"}),/HTTPS/);
  assert.throws(()=>new ForgeStudioCatalogClient({baseUrl:"http://127.0.0.1:8444",token:""}),/token/);
  assert.throws(()=>new ForgeStudioCatalogClient({baseUrl:"https://evil:pass@example.com",token:"token"}),/HTTPS/);
});

test("Forge Studio failed upstream request cannot be mistaken for a model receipt",async()=>{
  const client=new ForgeStudioCatalogClient({baseUrl:"http://127.0.0.1:8444",token:"token",
    transport:async()=>Response.json({error:"no"},{status:403})});
  await assert.rejects(client.search({mode:"sources",query:""}),/HTTP 403/);
});

test("MCP Forge discovery requires read scope and the bound single-tenant owner",async()=>{
  let calls=0;
  const forge={async search(){calls++;return {count:17};}};
  const options={auth,resourceAudience:audience,allowedTenantId:"mgr-owner",forge};
  const allowed=await searchForgeMcp(options,{mode:"sources",query:"faces"});
  assert.equal(allowed.accepted,true);
  assert.deepEqual((allowed.catalog as any).count,17);
  assert.equal(calls,1);
  const wrongTenant=await searchForgeMcp({...options,allowedTenantId:"another-tenant"},
                                         {mode:"sources",query:"faces"});
  assert.equal(wrongTenant.state,"DENY");
  const missingScope=await searchForgeMcp({...options,auth:{...auth,scopes:[]}},
                                          {mode:"sources",query:"faces"});
  assert.equal(missingScope.state,"DENY");
  const wrongAudience=await searchForgeMcp({...options,auth:{...auth,audience:"https://wrong.example"}},
                                           {mode:"sources",query:"faces"});
  assert.equal(wrongAudience.state,"DENY");
  assert.equal(calls,1);
});

test("MCP Forge discovery keeps downloads and creation outside this read tool",async()=>{
  let calls=0;
  const options={auth,resourceAudience:audience,allowedTenantId:"mgr-owner",
    forge:{async search(){calls++;return {listings:[]};}}};
  const input={mode:"models" as const,query:"x".repeat(121),live:true};
  const denied=await searchForgeMcp(options,input);
  assert.equal(denied.state,"DENY");
  assert.equal(calls,0);
});
