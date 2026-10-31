// Real local process boundary: Node MCP policy helpers call Python Forge Studio HTTP.
import assert from "node:assert/strict";
import {ForgeStudioCatalogClient} from "../src/forge-catalog-client.ts";
import {searchForgeMcp,createForgeWorldMcp,statusForgeWorldMcp} from "../src/forge-mcp-tools.ts";

const baseUrl=process.env.MGR_FORGE_STUDIO_URL;
const token=process.env.MGR_FORGE_STUDIO_TOKEN;
const editsString=process.env.MGR_FORGE_WORLD_EDITS_JSON;
if(!baseUrl || !token || !editsString) throw new Error("local Forge Studio connection and edits required");
const client=new ForgeStudioCatalogClient({baseUrl,token});
const sources=await client.search({mode:"sources",query:"fantasy"});
assert.equal(sources.status,"DIRECTORY_ONLY");
assert.ok(Number(sources.count)>=1);
const models=await client.search({mode:"models",query:"dragon",live:false});
assert.equal(models.status,"CACHED_SOURCE_METADATA");
assert.ok(Array.isArray(models.listings));
const options={
  auth:{actorId:"smoke",tenantId:"forge-owner-smoke",audience:"https://mcp.example/mcp",
        scopes:["tools:read","tools:execute"],expiresAt:Date.now()+60_000},
  resourceAudience:"https://mcp.example/mcp",allowedTenantId:"forge-owner-smoke",forge:client
};
const read=await searchForgeMcp(options,{mode:"sources",query:"skin"});
assert.equal(read.accepted,true);
const wrong=await searchForgeMcp({...options,allowedTenantId:"wrong-tenant"},
                                {mode:"sources",query:"skin"});
assert.equal(wrong.state,"DENY");
const edits=JSON.parse(editsString);
const input={requestId:"mcp-owner-world-smoke-0001",edits};
const first=await createForgeWorldMcp(options,input);
assert.equal(first.accepted,true,JSON.stringify(first));
assert.equal(first.replayed,false);
assert.equal(first.independentlyBlenderVerified,false);
const repeat=await createForgeWorldMcp(options,input);
assert.equal(repeat.accepted,true);
assert.equal(repeat.replayed,true);
assert.equal(repeat.artifactSha256,first.artifactSha256);
const status=await statusForgeWorldMcp(options,input.requestId);
assert.equal(status.artifactSha256,first.artifactSha256);
const denied=await createForgeWorldMcp({...options,allowedTenantId:"wrong-tenant"},input);
assert.equal(denied.state,"DENY");
const missingWrite=await createForgeWorldMcp({...options,auth:{...options.auth,scopes:["tools:read"]}},input);
assert.equal(missingWrite.state,"DENY");
console.log(JSON.stringify({status:"PASS",scope:"actual Forge Studio process HTTP + authorized API/MCP policies",
  source_results:sources.count,model_cache_items:models.listings.length,
  real_world_sha256:first.artifactSha256,world_bytes:first.artifactBytes,
  duplicate_replay_same_digest:true,unauthorized_tenant_denied:true,
  missing_write_scope_denied:true,hosted_tevin_verified:false,
  remote_mcp_protocol_verified:false}));
