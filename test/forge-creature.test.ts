import test from "node:test";
import assert from "node:assert/strict";
import {ForgeStudioCatalogClient} from "../src/forge-catalog-client.js";
import {createForgeCreatureMcp,statusForgeCreatureMcp} from "../src/forge-mcp-tools.js";

const audience="https://api.mgr.test/mcp";
const auth={actorId:"user",tenantId:"owner",audience,
            scopes:["tools:read","tools:execute"],expiresAt:Date.now()+90_000};
const input={requestId:"mgr-creature-job-0001",prompt:"Invent a winged stone dragon",
             seed:40,variants:3,morph:{length:1.2}};
const glb={status:"MATERIALIZED",job_id:"a".repeat(24),
           creature_sha256:"d".repeat(64),creature_bytes:14552,triangles:1000,
           glb_url:"/files/"+"a".repeat(24)+"/creature/creature.glb",
           manifest_url:"/files/"+"a".repeat(24)+"/creature/creature.json",
           model_inference_used:false,owner_art_accepted:false,replayed:false};
const options=(override:Record<string,unknown>={})=>({
 auth,resourceAudience:audience,allowedTenantId:"owner",allowedActorId:auth.actorId,
 forge:{async search(){return {};},async createCreature(){return glb;},
        async creatureStatus(){return glb;}},...override
});

test("auth user gets hashed native creature receipt, not false completed art",async()=>{
 const result=await createForgeCreatureMcp(options(),input);
 assert.equal(result.accepted,true);
 assert.equal(result.artifactSha256,glb.creature_sha256);
 assert.equal(result.hostedChatgptVerified,false);
 assert.equal(result.ownerArtAccepted,false);
 assert.equal(result.neuralInference,false);
});

test("tenant scope and audience denied before upstream call",async()=>{
 let calls=0;
 const forge={async search(){return {};},async createCreature(){calls++;return glb;}};
 for(const x of [
  options({forge,allowedTenantId:"foreign"}),
  options({forge,auth:{...auth,scopes:["tools:read"]}}),
  options({forge,auth:{...auth,audience:"https://wrong.test"}}),
 ]){
  const result=await createForgeCreatureMcp(x,input);
  assert.equal(result.state,"DENY");
 }
 assert.equal(calls,0);
});

test("Forge unavailable, interrupted or invented output cannot be promoted",async()=>{
 for(const wrong of [
  {status:"MATERIALIZED"}, {...glb,creature_sha256:"bad"},
  {...glb,model_inference_used:true}, {...glb,owner_art_accepted:true},
 ]){
  const result=await createForgeCreatureMcp(options({
   forge:{async search(){return {};},async createCreature(){return wrong;}}
  }),input);
  assert.equal(result.accepted,false);
  assert.equal(result.state,"UNVERIFIED_ARTIFACT");
 }
 const stalled=await createForgeCreatureMcp(options({
   forge:{async search(){return {};},
          async createCreature(){return {status:"NEEDS_RECONCILIATION"};}}
 }),input);
 assert.equal(stalled.state,"RECONCILIATION_REQUIRED");
});

test("Studio adapter posts exactly one bounded native job and reads status",async()=>{
 const found:Array<{path:string;body:unknown;auth:string|null}>=[];
 const client=new ForgeStudioCatalogClient({
  baseUrl:"http://127.0.0.1:7332",token:"studio-token",
  transport:async(url,init)=>{
   found.push({path:new URL(String(url)).pathname,
       body:JSON.parse(String(init?.body)),
       auth:new Headers(init?.headers).get("X-MGR-Forge-Token")});
   return Response.json(glb);
  }
 });
 await client.createCreature(input);
 await client.creatureStatus(input.requestId);
 assert.deepEqual(found.map(a=>a.path),["/api/creature-create","/api/creature-status"]);
 assert.equal(found[0]?.auth,"studio-token");
 assert.deepEqual(found[0]?.body,{request_id:input.requestId,prompt:input.prompt,
                                  seed:input.seed,variants:input.variants,
                                  morph:input.morph});
 await assert.rejects(client.createCreature({...input,prompt:"bad"}),/bounded/);
});

test("read-only status protects tenant and preserves unknown reconciliation state",async()=>{
 const ok=await statusForgeCreatureMcp(options(),input.requestId);
 assert.equal(ok.accepted,true);
 const wrong=await statusForgeCreatureMcp(options({allowedTenantId:"not-owner"}),input.requestId);
 assert.equal(wrong.state,"DENY");
 const pending=await statusForgeCreatureMcp(options({forge:{
  async search(){return {};},async creatureStatus(){return {status:"NEEDS_RECONCILIATION"};}
 }}),input.requestId);
 assert.equal(pending.accepted,false);
 assert.equal(pending.reconciliationRequired,true);
});
