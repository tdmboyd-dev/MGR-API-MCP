import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as tools from '../src/forge-mcp-tools.js';
import type {ForgeMcpToolOptions} from '../src/forge-mcp-tools.js';
import {forgeTriangleGlb} from './fixtures/forge-glb.js';
const audience='https://owned-forge.invalid/mcp',job='a'.repeat(24),sha='b'.repeat(64),requestId='owned-forge-job-0001';
const blob=forgeTriangleGlb(),blobSha=createHash('sha256').update(blob).digest('hex');
const cases=[
 ['directory','search',tools.searchForgeMcp,{mode:'sources',query:''},{}],
 ['world-create','createWorld',tools.createForgeWorldMcp,{requestId,edits:{schema:"mgr.forge.world-edit.v1",asset_sha256:sha,buildings:[{id:"owned-building",center:[0,0,0],size:[1,1,1],material:"owned-material"}]}},{status:'MATERIALIZED',job_id:job,world_sha256:sha,world_bytes:100}],
 ['world-status','worldStatus',tools.statusForgeWorldMcp,requestId,{status:'MATERIALIZED',job_id:job,world_sha256:sha}],
 ['creature-create','createCreature',tools.createForgeCreatureMcp,{requestId,prompt:'Owned original creature',seed:42,variants:1},{status:'MATERIALIZED',job_id:job,creature_sha256:sha,creature_bytes:100,model_inference_used:false,owner_art_accepted:false}],
 ['creature-status','creatureStatus',tools.statusForgeCreatureMcp,requestId,{status:'MATERIALIZED',job_id:job,creature_sha256:sha}],
 ['biome-create','createBiome',tools.createForgeBiomeMcp,{requestId,biome:'alien',seed:42,resolution:10},{status:'MATERIALIZED',job_id:job,biome_sha256:sha,biome_bytes:100,external_model_used:false,editor_world_unchanged:true,added_as_layer:true}],
 ['biome-status','biomeStatus',tools.statusForgeBiomeMcp,requestId,{status:'MATERIALIZED',job_id:job,biome_sha256:sha}],
 ['artifact','readArtifact',tools.readForgeArtifactMcp,{jobId:job,kind:'creature',expectedSha256:blobSha},{blobBase64:blob.toString('base64'),sha256:blobSha,bytes:blob.length,mimeType:'model/gltf-binary'}],
 ['human-start','startHumanLipSync',tools.startForgeHumanLipSyncMcp,{requestId,fps:24,timings:{schema:'mgr.forge.phoneme-timeline.v1',actor_id:'owned-actor',language:'en-US',duration_ms:100,phonemes:[{phoneme:'M',start_ms:0,end_ms:100}]}},{status:'RUNNING',job_id:job}],
 ['human-status','humanLipSyncStatus',tools.statusForgeHumanLipSyncMcp,requestId,{status:'RUNNING',job_id:job}],
 ['composition-create','createComposition',tools.createForgeCompositionMcp,{requestId,biomeRequestId:'owned-biome-job-0001'},{status:'RUNNING',job_id:job}],
 ['composition-status','compositionStatus',tools.statusForgeCompositionMcp,requestId,{status:'RUNNING',job_id:job}],
] as const;
function fixture(method:string,result:unknown){let live=true,calls=0,release!:()=>void;const held=new Promise<void>(r=>release=r);
 const auth={actorId:'owner',tenantId:'tenant',audience,scopes:['tools:read','tools:execute'],expiresAt:Date.now()+60000};
 const forge:any={search:async()=>({}),[method]:async()=>{calls++;await held;return result;}};
 const options:ForgeMcpToolOptions & {allowedActorId:string;assertCurrent:()=>void}={auth,resourceAudience:audience,allowedTenantId:'tenant',allowedActorId:'owner',forge,assertCurrent:()=>{if(!live)throw Error('owned-host-authority-withdrawn');}};
 return {options,release,withdraw:()=>live=false,get calls(){return calls;}};
}
for(const [name,method,fn,input,result] of cases)test('Forge '+name+' rechecks current exact authority after the held upstream result',async()=>{
 const control=fixture(method,result);control.release();assert.equal((await (fn as any)(control.options,input)).accepted,true,'Control must prove the actual success path');
 for(const mutation of [(f:any)=>f.options.auth.expiresAt=0,(f:any)=>f.options.auth.actorId='other-actor',(f:any)=>f.options.auth.scopes=[],(f:any)=>f.withdraw(),(f:any)=>f.options.forge={search:async()=>({})},(f:any)=>f.options.auth={...f.options.auth,expiresAt:Date.now()+120000},(f:any)=>f.options.auth.expiresAt+=1000,(f:any)=>f.options.assertCurrent=()=>{}]){
  const f=fixture(method,result),pending=(fn as any)(f.options,input);await Promise.resolve();assert.equal(f.calls,1);mutation(f);f.release();const answer=await pending;
  assert.equal(answer.accepted,false,name);assert.equal(answer.artifactSha256,undefined);assert.equal(answer.blobBase64,undefined);assert.equal(answer.jobId,undefined);
 }
});
test('async or promise-returning host fences cannot authorize Forge and rejected promises are drained',async()=>{
 for(const asynchronous of [true,false]){const f=fixture('search',{});let invoked=0;f.options.assertCurrent=(asynchronous?async()=>{invoked++;}:()=>{invoked++;return Promise.reject(Error('owned-async-fence-rejected'));}) as any;f.release();const result=await tools.searchForgeMcp(f.options,{mode:'sources',query:''});assert.equal(result.accepted,false);assert.equal(f.calls,0);assert.equal(invoked,asynchronous?0:1);await Promise.resolve();}
});
test('same-tenant foreign actor and missing workstation actor enrollment deny before Forge dispatch',async()=>{
 for(const mutation of [(f:any)=>f.options.auth.actorId='same-tenant-stranger',(f:any)=>delete f.options.allowedActorId]){const f=fixture('search',{});mutation(f);f.release();const result=await tools.searchForgeMcp(f.options,{mode:'sources',query:''});assert.equal(result.accepted,false);assert.equal(f.calls,0);}
});
for(const operation of ['artifact','creature-create'])test('registered Forge '+operation+' withholds serialized content after current host authority changes',async()=>{
 const spec=cases.find(row=>row[0]===operation)!,f=fixture(spec[1],spec[4]),registered=new Map<string,any>();
 tools.registerForgeMcpTools({registerTool:(name:string,_schema:any,fn:any)=>registered.set(name,fn)} as any,f.options);
 const name=operation==='artifact'?'mgr_forge_artifact_read':'mgr_forge_creature_create',status=operation==='artifact'?'VERIFIED_PRIVATE_GLTF_BLOB':'ORIGINAL_CREATURE_MATERIALIZED_LOCAL';
 const stringify=JSON.stringify;let fired=false;JSON.stringify=function(value:any,...args:any[]){const text=Reflect.apply(stringify,JSON,[value,...args]);if(value?.status===status){fired=true;f.withdraw();}return text;} as typeof JSON.stringify;
 try{f.release();const response=await registered.get(name)({...spec[3] as any,includeData:true});assert.equal(fired,true);assert.equal(f.calls,1);assert.equal(response.isError,true);assert.equal(response.content.some((x:any)=>x.type==='resource'),false);const text=stringify(response);assert.equal(text.includes(blobSha),false);assert.equal(text.includes(sha),false);if(operation==='creature-create')assert.equal(JSON.parse(response.content[0].text).reconciliationRequired,true);}finally{JSON.stringify=stringify;}
});
