// Real client-side half of the opt-in Forge Studio bridge smoke test.
import assert from "node:assert/strict";
import {ForgeStudioCatalogClient} from "../src/forge-catalog-client.ts";
import {searchForgeMcp} from "../src/forge-mcp-tools.ts";

const baseUrl=process.env.MGR_FORGE_STUDIO_URL;
const token=process.env.MGR_FORGE_STUDIO_TOKEN;
if(!baseUrl || !token) throw new Error("ephemeral local Forge Studio connection required");
const client=new ForgeStudioCatalogClient({baseUrl,token});
const sources=await client.search({mode:"sources",query:"fantasy"});
assert.equal(sources.status,"DIRECTORY_ONLY");
assert.ok(Number(sources.count)>=1);
const models=await client.search({mode:"models",query:"dragon",live:false});
assert.equal(models.status,"CACHED_SOURCE_METADATA");
assert.ok(Array.isArray(models.listings));
const options={
  auth:{actorId:"smoke",tenantId:"forge-owner-smoke",audience:"https://mcp.example/mcp",
        scopes:["tools:read"],expiresAt:Date.now()+30_000},
  resourceAudience:"https://mcp.example/mcp",allowedTenantId:"forge-owner-smoke",forge:client
};
const bound=await searchForgeMcp(options,{mode:"sources",query:"skin"});
assert.equal(bound.accepted,true);
const wrong=await searchForgeMcp({...options,allowedTenantId:"wrong-tenant"},
                                  {mode:"sources",query:"skin"});
assert.equal(wrong.state,"DENY");
console.log(JSON.stringify({status:"PASS",scope:"actual loopback Forge Studio HTTP + MCP read/auth method",
                            source_results:sources.count,model_cache_items:models.listings.length,
                            unauthorized_tenant_denied:true,remote_mcp_protocol_verified:false}));
