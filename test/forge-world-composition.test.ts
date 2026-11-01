import test from "node:test";
import assert from "node:assert/strict";
import {ForgeStudioCatalogClient} from "../src/forge-catalog-client.js";
import {createForgeCompositionMcp,statusForgeCompositionMcp} from "../src/forge-mcp-tools.js";

const audience="https://mgr.example/mcp";
const auth={actorId:"owner",tenantId:"tenant",audience,
  scopes:["tools:execute","tools:read"],expiresAt:Date.now()+60000};
const input={requestId:"mgr-composition-owner-0001",biomeRequestId:"mgr-biome-source-00001"};
const base={status:"MATERIALIZED",job_id:"a".repeat(24),
  combined_world_sha256:"b".repeat(64),
  world_sha256:"c".repeat(64),biome_sha256:"d".repeat(64),
  independently_blender_verified:true,combined_bytes:78000,triangles:1800,
  full_game_navigation_verified:false,user_art_accepted:false};
const settings=(over:Record<string,unknown>={})=>({
  auth,resourceAudience:audience,allowedTenantId:"tenant",allowedActorId:auth.actorId,
  forge:{async search(){return {};},async createComposition(){return base;},
    async compositionStatus(){return base;}},...over
});

test("authenticated MGR World Forge returns a real, bounded Blender-composed hash",async()=>{
 const created=await createForgeCompositionMcp(settings(),input);
 assert.equal(created.accepted,true);
 assert.equal(created.artifactSha256,base.combined_world_sha256);
 assert.equal(created.godotRuntimeAccepted,false);
 assert.equal(created.ownerArtApproved,false);
 const status=await statusForgeCompositionMcp(settings(),input.requestId);
 assert.equal(status.accepted,true);
 assert.equal(status.artifactReady,true);
});

test("no execution permission, wrong audience or wrong tenant blocks Blender creation",async()=>{
 let calls=0;
 const forge={async search(){return {};},async createComposition(){calls++;return base;}};
 for(const opts of [
  settings({forge,allowedTenantId:"different"}),
  settings({forge,auth:{...auth,scopes:["tools:read"]}}),
  settings({forge,auth:{...auth,audience:"https://not-mgr.example"}})
 ]){
  const result=await createForgeCompositionMcp(opts,input);
  assert.equal(result.state,"DENY");
 }
 assert.equal(calls,0);
});

test("missing independent Blender proof, bogus sha and interrupted states stay refused",async()=>{
 for(const wrong of [
  {...base,combined_world_sha256:"notasha"},
  {...base,independently_blender_verified:false},
  {...base,full_game_navigation_verified:true},
  {...base,combined_bytes:2_000_000},
  {status:"MATERIALIZED"}
 ]){
  const result=await createForgeCompositionMcp(settings({
    forge:{async search(){return {};},async createComposition(){return wrong;}}
  }),input);
  assert.equal(result.accepted,false);
  assert.equal(result.state,"WORLD_COMPOSITION_UNVERIFIED");
 }
 const pending=await createForgeCompositionMcp(settings({forge:{
   async search(){return {};},async createComposition(){return {status:"RUNNING",job_id:"a".repeat(24)};}
 }}),input);
 assert.equal(pending.accepted,true);
 assert.equal(pending.artifactReady,false);
 const busy=await createForgeCompositionMcp(settings({forge:{
  async search(){return {};},async createComposition(){return {status:"BUSY"};}
 }}),input);
 assert.equal(busy.state,"HEAVY_BLENDER_WORKER_BUSY");
});

test("ForgeStudioCatalogClient uses the original authenticated Studio only",async()=>{
 const calls:string[]=[];
 const adapter=new ForgeStudioCatalogClient({
   baseUrl:"http://127.0.0.1:7331",token:"studio-secret",
   transport:async(url,init)=>{
     calls.push(new URL(String(url)).pathname);
     assert.equal(new Headers(init?.headers).get("X-MGR-Forge-Token"),"studio-secret");
     return Response.json(base);
   }
 });
 await adapter.createComposition(input);
 await adapter.compositionStatus(input.requestId);
 assert.deepEqual(calls,["/api/world-compose-create","/api/world-compose-status"]);
 await assert.rejects(adapter.createComposition({...input,biomeRequestId:"../../"}),/Invalid/);
});
