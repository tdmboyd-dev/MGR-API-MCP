import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ForgeStudioCatalogClient} from '../src/forge-catalog-client.js';
import {nativeAssetMcp,registerForgeMcpTools,listForgeSavedJobsMcp,reopenForgeSavedJobMcp,type ForgeMcpToolOptions} from '../src/forge-mcp-tools.js';
import {forgeNativeVerifyInput,forgeReconstructionInput,forgeMorphInput} from '../src/forge-asset-inputs.js';
import {forgeVerifyInput} from '../src/forge-inputs.js';
import {forgeDepartmentCommands} from '../src/forge-department.js';
import {forgeTriangleGlb} from './fixtures/forge-glb.js';

const audience='https://native-assets.invalid/mcp',requestId='native-assets-test-001',jobId='a'.repeat(24);
const glb=forgeTriangleGlb(),sha=createHash('sha256').update(glb).digest('hex');
const reconstruction={requestId,frontPngBase64:'AQID',sidePngBase64:'BAUG',bounds:{width:2,height:3,depth:2},grid:16,surface:'smooth' as const};
const morph={requestId,glbBase64:glb.toString('base64'),expectedSha256:sha,morph:{twist_degrees:12}};
const input=(kind:'reconstruction'|'morph')=>kind==='reconstruction'?reconstruction:morph;
function fixture(kind:'reconstruction'|'morph'){
 const counts={create:0,status:0,verify:0,read:0};
 const native={status:'MATERIALIZED',request_id:requestId,job_id:jobId,kind,asset_sha256:sha,asset_bytes:glb.length,
  model_inference_used:false,owner_art_accepted:false,replayed:false};
 const options:ForgeMcpToolOptions={auth:{actorId:'owner',tenantId:'tenant',audience,scopes:['tools:execute','tools:read'],expiresAt:Date.now()+60000},
  resourceAudience:audience,allowedTenantId:'tenant',allowedActorId:'owner',forge:{search:async()=>({}),
   createReconstruction:async()=>{counts.create++;return {...native};},createMorph:async()=>{counts.create++;return {...native};},
   reconstructionStatus:async()=>{counts.status++;return {...native,replayed:true};},morphStatus:async()=>{counts.status++;return {...native,replayed:true};},
   verifyRequest:async()=>{counts.verify++;return {...native,input_verified:true,input_fingerprint:'b'.repeat(64),request_kind:kind};},
   readArtifact:async()=>{counts.read++;return {blobBase64:glb.toString('base64'),sha256:sha,bytes:glb.length,mimeType:'model/gltf-binary'};}}};
 return {options,counts,native};
}

test('native asset schemas preserve five-operation owner authority and refuse malformed parameters',()=>{
 assert.equal(forgeDepartmentCommands.length,5);
 for(const kind of ['reconstruction','morph'] as const){
  assert.equal(forgeNativeVerifyInput.safeParse({kind,input:input(kind)}).success,true);
  assert.equal(forgeVerifyInput.safeParse({kind,input:input(kind)}).success,false);
 }
 for(const change of [{grid:65},{grid:true},{surface:'ai'},{bounds:{width:0,height:1,depth:1}},{frontPngBase64:'A==='},
  {frontPngBase64:'AQID\n'},{sidePngBase64:'A'.repeat(1_200_004)},{filename:'C:/private.png'}])
  assert.equal(forgeReconstructionInput.safeParse({...reconstruction,...change}).success,false);
 for(const change of [{expectedSha256:'bad'},{morph:{width:5}},{morph:{taper:.5}},{morph:{unknown:1}}])
  assert.equal(forgeMorphInput.safeParse({...morph,...change}).success,false);
});

test('typed native transport maps exact body names statuses verification and allowlisted artifacts',async()=>{
 const sent:Array<{path:string;body:any;token:string|null}>=[];
 const client=new ForgeStudioCatalogClient({baseUrl:'http://127.0.0.1:8444',token:'fixture-token',transport:async(url,init)=>{
  const path=new URL(String(url)).pathname;sent.push({path,body:init?.body?JSON.parse(String(init.body)):null,token:new Headers(init?.headers).get('X-MGR-Forge-Token')});
  return path.startsWith('/files/')?new Response(glb):Response.json({});}});
 await client.createReconstruction(reconstruction);await client.reconstructionStatus(requestId);
 await client.createMorph(morph);await client.morphStatus(requestId);
 for(const kind of ['reconstruction','morph'] as const){await client.verifyRequest({kind,input:input(kind)} as any);await client.readArtifact({kind,jobId,expectedSha256:sha});}
 assert.deepEqual(sent.slice(0,4).map(x=>x.path),['/api/reconstruction-create','/api/reconstruction-status','/api/morph-create','/api/morph-status']);
 assert.deepEqual(sent[0]!.body,{request_id:requestId,front_png_base64:'AQID',side_png_base64:'BAUG',bounds:reconstruction.bounds,grid:16,surface:'smooth'});
 assert.deepEqual(sent[2]!.body,{request_id:requestId,glb_base64:morph.glbBase64,expected_sha256:sha,morph:morph.morph});
 assert.equal(sent[4]!.body.kind,'reconstruction');assert.equal(sent[4]!.body.request.requestId,undefined);
 assert.equal(sent[5]!.path,'/files/'+jobId+'/reconstructed/hull.glb');
 assert.equal(sent[7]!.path,'/files/'+jobId+'/morphed/morphed.glb');
 assert.ok(sent.every(x=>x.token==='fixture-token'));
 await assert.rejects(client.createReconstruction({...reconstruction,frontPngBase64:'A'.repeat(800000),sidePngBase64:'A'.repeat(800000)}),/byte budget/);
 assert.equal(sent.length,8,'oversized combined body never reaches network');
});

for(const kind of ['reconstruction','morph'] as const){
 test(kind+' accepts only exact native input plus independently checked actual GLB bytes',async()=>{
  const f=fixture(kind),created=await nativeAssetMcp(f.options,kind,input(kind),true);
  assert.equal(created.accepted,true);assert.equal(created.nativeInputVerified,true);assert.equal(created.artifactBytesVerified,true);
  assert.equal(created.artifactSha256,sha);assert.equal(created.blobBase64,undefined);assert.equal(created.ownerArtAccepted,false);
  const read=await nativeAssetMcp(f.options,kind,input(kind),false);
  assert.equal(read.accepted,true);assert.equal(read.creationPerformed,false);
  assert.deepEqual(f.counts,{create:1,status:1,verify:2,read:2});
 });
 test(kind+' refuses wrong request fingerprints substituted receipts and changed binary bytes',async()=>{
  for(const wrong of [{request_id:'foreign-request-0001'},{request_kind:'creature'},{input_verified:false},{input_fingerprint:'bad'},
   {asset_bytes:800001},{asset_sha256:'c'.repeat(64)},{model_inference_used:true},{owner_art_accepted:true},{job_id:'bad'}]){
   const f=fixture(kind),verify=f.options.forge.verifyRequest!;
   f.options.forge.verifyRequest=async value=>({...await verify(value),...wrong});
   const answer=await nativeAssetMcp(f.options,kind,input(kind),true);
   assert.equal(answer.accepted,false);assert.equal(answer.artifactReady,false);assert.equal(answer.artifactSha256,undefined);
  }
  const f=fixture(kind);f.options.forge.readArtifact=async()=>({blobBase64:Buffer.from('untrusted').toString('base64'),sha256:sha,bytes:glb.length,mimeType:'model/gltf-binary'});
  assert.equal((await nativeAssetMcp(f.options,kind,input(kind),false)).accepted,false);
 });
 test(kind+' enforces current actor tenant audience scopes and all asynchronous publication fences',async()=>{
  for(const mutate of [(f:any)=>f.options.auth.actorId='foreign',(f:any)=>f.options.auth.tenantId='foreign',
   (f:any)=>f.options.auth.audience='foreign',(f:any)=>f.options.auth.scopes=[],(f:any)=>f.options.auth.expiresAt=0]){
   const f=fixture(kind);mutate(f);assert.equal((await nativeAssetMcp(f.options,kind,input(kind),true)).state,'DENY');assert.equal(f.counts.create,0);
  }
  for(const method of [kind==='reconstruction'?'createReconstruction':'createMorph','verifyRequest','readArtifact'] as const){
   const f=fixture(kind),original=f.options.forge[method]!;
   f.options.forge[method]=(async(...args:any[])=>{const value=await (original as any)(...args);f.options.auth.scopes=[];return value;}) as any;
   const answer=await nativeAssetMcp(f.options,kind,input(kind),true);
   assert.equal(answer.accepted,false);assert.equal(answer.jobId,undefined);assert.equal(answer.artifactSha256,undefined);
  }
 });
 test(kind+' unfinished and unknown outcomes stay unresolved without automatic redispatch',async()=>{
  for(const state of ['RUNNING','FAILED','NEEDS_RECONCILIATION']){
   const f=fixture(kind);f.native.status=state;
   const answer=await nativeAssetMcp(f.options,kind,input(kind),true);
   assert.equal(answer.accepted,false);assert.equal(answer.state,state);assert.equal(f.counts.read,0);assert.equal(f.counts.create,1);
  }
  const f=fixture(kind);f.options.forge[kind==='reconstruction'?'createReconstruction':'createMorph']=async()=>{f.counts.create++;throw Error('unknown');};
  const answer=await nativeAssetMcp(f.options,kind,input(kind),true);
  assert.equal(answer.accepted,false);assert.equal(answer.reconciliationRequired,true);assert.equal(f.counts.create,1);
 });
}

test('optional native registrations reuse execute/read guards and final serialized-publication fence',async()=>{
 const f=fixture('reconstruction'),registered=new Map<string,any>();
 registerForgeMcpTools({registerTool:(name:string,definition:any,callback:any)=>registered.set(name,{definition,callback})} as any,f.options);
 for(const kind of ['reconstruction','morph'])for(const action of ['create','status'])assert.ok(registered.has('mgr_forge_'+kind+'_'+action));
 const tool=registered.get('mgr_forge_reconstruction_create');
 f.options.auth.scopes=['tools:read'];assert.equal((await tool.callback(reconstruction)).isError,true);assert.equal(f.counts.create,0);
 f.options.auth.scopes=['tools:execute'];const stringify=JSON.stringify;let fired=false;
 JSON.stringify=function(value:any,...args:any[]){const text=Reflect.apply(stringify,JSON,[value,...args]);if(value?.status==='NATIVE_RECONSTRUCTION_GLTF_VERIFIED'){fired=true;f.options.auth.scopes=[];}return text;} as typeof JSON.stringify;
 try{const result=await tool.callback(reconstruction);assert.equal(fired,true);assert.equal(result.isError,true);assert.equal(stringify(result).includes(sha),false);assert.equal(stringify(result).includes(jobId),false);}finally{JSON.stringify=stringify;}
});

test('seven-kind saved navigation and verified reopen retain unchanged transfer caps',async()=>{
 for(const kind of ['reconstruction','morph'] as const){
  const f=fixture(kind);
  f.options.forge.listSavedJobs=async()=>({schema:'mgr.forge.saved-jobs.v1',status:'JOURNAL_OBSERVATION',items:[{kind,request_id:requestId,job_id:jobId,status:'MATERIALIZED',artifact_verified:false}],total:7000,unavailable_kinds:[],next_cursor:null,order:'kind_then_request_id',creates_jobs:false});
  assert.equal((await listForgeSavedJobsMcp(f.options,{kind})).accepted,true);
  f.options.forge.reopenSavedJob=async()=>({...f.native,replayed:true});
  assert.equal((await reopenForgeSavedJobMcp(f.options,{kind,requestId})).accepted,true);
  f.native.asset_bytes=800001;
  assert.equal((await reopenForgeSavedJobMcp(f.options,{kind,requestId})).accepted,false);
 }
});
