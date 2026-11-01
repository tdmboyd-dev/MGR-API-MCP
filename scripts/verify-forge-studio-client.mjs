// Real local process boundary: Node MCP policy helpers call Python Forge Studio HTTP.
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {ForgeStudioCatalogClient} from "../src/forge-catalog-client.ts";
import {searchForgeMcp,createForgeWorldMcp,statusForgeWorldMcp,createForgeCreatureMcp,statusForgeCreatureMcp} from "../src/forge-mcp-tools.ts";

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
  resourceAudience:"https://mcp.example/mcp",allowedTenantId:"forge-owner-smoke",allowedActorId:"smoke",forge:client
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
// Real new creation bridge: input -> hashed GLB on Forge disk -> same SHA on token-gated byte read.
const creatureInput={requestId:"mcp-owner-creature-smoke-0001",
  prompt:"Invent an armored winged fantasy creature with a long tail",
  seed:41,variants:3,morph:{height:1.12,width:1.1}};
const creature=await createForgeCreatureMcp(options,creatureInput);
assert.equal(creature.accepted,true,JSON.stringify(creature));
assert.equal(creature.status,"ORIGINAL_CREATURE_MATERIALIZED_LOCAL");
assert.equal(creature.replayed,false);
assert.equal(creature.neuralInference,false);
assert.equal(creature.ownerArtAccepted,false);
assert.ok(Number(creature.artifactBytes)>5000);
const creatureAgain=await createForgeCreatureMcp(options,creatureInput);
assert.equal(creatureAgain.accepted,true);
assert.equal(creatureAgain.replayed,true);
assert.equal(creatureAgain.artifactSha256,creature.artifactSha256);
const creatureStatus=await statusForgeCreatureMcp(options,creatureInput.requestId);
assert.equal(creatureStatus.accepted,true);
assert.equal(creatureStatus.artifactSha256,creature.artifactSha256);
const denyCreature=await createForgeCreatureMcp({...options,allowedTenantId:"wrong-tenant"},creatureInput);
assert.equal(denyCreature.state,"DENY");
const denyCreatureWrite=await createForgeCreatureMcp({...options,auth:{...options.auth,scopes:["tools:read"]}},creatureInput);
assert.equal(denyCreatureWrite.state,"DENY");
const glbPath=new URL(String(creature.localArtifactUrl),baseUrl);
const tokenless=await fetch(glbPath,{redirect:"error"});
assert.equal(tokenless.status,403);
const secured=await fetch(glbPath,{
  headers:{"X-MGR-Forge-Token":token},redirect:"error"});
assert.equal(secured.status,200);
const glb=Buffer.from(await secured.arrayBuffer());
assert.equal(glb.toString("ascii",0,4),"glTF");
assert.equal(glb.length,creature.artifactBytes);
assert.equal(createHash("sha256").update(glb).digest("hex"),creature.artifactSha256);
console.log(JSON.stringify({status:"PASS",scope:"actual Forge Studio process HTTP + authorized API/MCP policies",
  source_results:sources.count,model_cache_items:models.listings.length,
  real_world_sha256:first.artifactSha256,world_bytes:first.artifactBytes,
  duplicate_replay_same_digest:true,unauthorized_tenant_denied:true,
  missing_write_scope_denied:true,original_creature_sha256:creature.artifactSha256,
  original_creature_bytes:creature.artifactBytes,original_creature_triangles:creature.triangles,
  creature_replay_identical:true,creature_artifact_digest_retrieved_and_verified:true,
  creature_tokenless_download_denied:true,creature_wrong_tenant_denied:true,
  creature_missing_execute_scope_denied:true,hosted_chatgpt_verified:false,
  hosted_tevin_verified:false,
  remote_mcp_protocol_verified:false}));
