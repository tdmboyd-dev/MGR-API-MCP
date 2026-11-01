import test from "node:test";
import assert from "node:assert/strict";
import {ForgeStudioCatalogClient} from "../src/forge-catalog-client.js";
import {startForgeHumanLipSyncMcp,statusForgeHumanLipSyncMcp} from "../src/forge-mcp-tools.js";

const audience="https://mgr.example/mcp";
const auth={actorId:"human-user",tenantId:"human-owner",audience,
            scopes:["tools:read","tools:execute"],expiresAt:Date.now()+90000};
const input={requestId:"mcp-human-lipsync-0001",fps:24,
  timings:{schema:"mgr.forge.phoneme-timeline.v1" as const,actor_id:"human-demo",
    language:"en-US" as const,duration_ms:760,
    phonemes:[{phoneme:"M",start_ms:0,end_ms:160},{phoneme:"AA",start_ms:160,end_ms:490},
              {phoneme:"OW",start_ms:490,end_ms:760}]}};
const running={status:"RUNNING",job_id:"a".repeat(24),replayed:false};
const complete={status:"MATERIALIZED",job_id:"a".repeat(24),human_sha256:"d".repeat(64),
  human_bytes:230000,morph_targets:8,animation_actions:1,
  real_blender_verified:true,audio_alignment_performed:false,owner_visual_approved:false};
const options=(over:Record<string,unknown>={})=>({
  auth,resourceAudience:audience,allowedTenantId:"human-owner",
  forge:{async search(){return {};},async startHumanLipSync(){return running;},
         async humanLipSyncStatus(){return complete;}},...over
});

test("start Human Forge keeps running separate from a completed render",async()=>{
 const result=await startForgeHumanLipSyncMcp(options(),input);
 assert.equal(result.status,"BLENDER_HUMAN_JOB_RUNNING");
 assert.equal(result.artifactReady,false);
 assert.equal(result.neuralAudioAlignment,false);
 assert.equal(result.remotelyHosted,false);
 const status=await statusForgeHumanLipSyncMcp(options(),input.requestId);
 assert.equal(status.status,"BLENDER_HUMAN_FACIAL_ARTIFACT_VERIFIED");
 assert.equal(status.morphTargets,8);
 assert.equal(status.audioAlignment,false);
});

test("Human Forge cannot execute for wrong tenant, scope or audience",async()=>{
 let calls=0;
 const forge={async search(){return {};},
              async startHumanLipSync(){calls++;return running;}};
 for(const opts of [
   options({forge,allowedTenantId:"foreign"}),
   options({forge,auth:{...auth,scopes:["tools:read"]}}),
   options({forge,auth:{...auth,audience:"https://unrelated"}})
 ]){
   assert.equal((await startForgeHumanLipSyncMcp(opts,input)).state,"DENY");
 }
 assert.equal(calls,0);
});

test("fake success, missing Blender proof and unknown results rejected",async()=>{
 for(const bad of [complete,{...complete,real_blender_verified:false},
                   {...complete,audio_alignment_performed:true},{status:"MATERIALIZED"}]){
   const r=await startForgeHumanLipSyncMcp(options({forge:{async search(){return {};},
            async startHumanLipSync(){return bad;}}}),input);
   if(bad===complete)assert.equal(r.accepted,true);
   else assert.equal(r.accepted,false);
 }
 const interrupted=await statusForgeHumanLipSyncMcp(options({forge:{
    async search(){return {};},async humanLipSyncStatus(){return {status:"NEEDS_RECONCILIATION"};}}}),input.requestId);
 assert.equal(interrupted.accepted,false);
 assert.equal(interrupted.reconciliationRequired,true);
});

test("Human Forge transport reuses bound source endpoint, no arbitrary script execution",async()=>{
 const calls:string[]=[];
 const client=new ForgeStudioCatalogClient({baseUrl:"http://127.0.0.1:8788",token:"secret",
 transport:async(url,init)=>{
   calls.push(new URL(String(url)).pathname);
   assert.equal(new Headers(init?.headers).get("X-MGR-Forge-Token"),"secret");
   return Response.json(running);
 }});
 await client.startHumanLipSync(input);
 await client.humanLipSyncStatus(input.requestId);
 assert.deepEqual(calls,["/api/human-lipsync-start","/api/human-lipsync-status"]);
 await assert.rejects(client.startHumanLipSync({...input,fps:1}),/Invalid Human/);
});
