import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {forgeUvInput,forgeNativeVerifyInput} from '../src/forge-asset-inputs.js';
import {ForgeStudioCatalogClient} from '../src/forge-catalog-client.js';
import {nativeAssetMcp,registerForgeMcpTools,listForgeSavedJobsMcp,reopenForgeSavedJobMcp,type ForgeMcpToolOptions} from '../src/forge-mcp-tools.js';
import {forgeDepartmentCommands} from '../src/forge-department.js';
import {forgeTriangleGlb} from './fixtures/forge-glb.js';

const blob=forgeTriangleGlb(),sha=createHash('sha256').update(blob).digest('hex'),requestId='native-uv-owner-0001',jobId='c'.repeat(24);
const input=forgeUvInput.parse({requestId,glbBase64:blob.toString('base64'),expectedSha256:sha});
function fixture(){
 const calls={create:0,status:0,verify:0,read:0},audience='https://uv.fixture.invalid/mcp';
 const native={status:'MATERIALIZED',kind:'uv',request_id:requestId,job_id:jobId,asset_sha256:sha,asset_bytes:blob.length,model_inference_used:false,owner_art_accepted:false};
 const options:ForgeMcpToolOptions={auth:{actorId:'owner',tenantId:'tenant',audience,scopes:['tools:read','tools:execute'],expiresAt:Date.now()+60000},
  allowedActorId:'owner',allowedTenantId:'tenant',resourceAudience:audience,forge:{search:async()=>({}),
   createUv:async()=>{calls.create++;return {...native};},uvStatus:async()=>{calls.status++;return {...native,replayed:true};},
   verifyRequest:async()=>{calls.verify++;return {...native,input_verified:true,input_fingerprint:'a'.repeat(64),request_kind:'uv'};},
   readArtifact:async()=>{calls.read++;return {blobBase64:blob.toString('base64'),sha256:sha,bytes:blob.length,mimeType:'model/gltf-binary'};}}};
 return {options,calls,native};
}
test('UV schema uses native exact choices and explicit normalized defaults without changing owner operation union',()=>{
 assert.equal(input.atlasSize,2048);assert.equal(input.padding,2);assert.equal(forgeDepartmentCommands.length,5);
 assert.equal(forgeNativeVerifyInput.safeParse({kind:'uv',input}).success,true);
 for(const size of [256,512,1024,2048,4096])assert.equal(forgeUvInput.safeParse({...input,atlasSize:size}).success,true);
 for(const bad of [{atlasSize:300},{atlasSize:true},{padding:0},{padding:17},{padding:1.5},{path:'private.glb'}])assert.equal(forgeUvInput.safeParse({...input,...bad}).success,false);
});
test('UV typed adapter routes defaulted exact input status verification and private artifact allowlist',async()=>{
 const sent:Array<{route:string;body:any}>=[];
 const client=new ForgeStudioCatalogClient({baseUrl:'http://127.0.0.1:8123',token:'fixture',transport:async(url,init)=>{
  const route=new URL(String(url)).pathname;sent.push({route,body:init?.body?JSON.parse(String(init.body)):null});return route.startsWith('/files/')?new Response(blob):Response.json({});}});
 await client.createUv(input);await client.uvStatus(requestId);await client.verifyRequest({kind:'uv',input});await client.readArtifact({kind:'uv',jobId,expectedSha256:sha});
 assert.deepEqual(sent.map(x=>x.route),['/api/uv-create','/api/uv-status','/api/request-verify','/files/'+jobId+'/uv/uv-mapped.glb']);
 assert.deepEqual(sent[0]!.body,{request_id:requestId,glb_base64:input.glbBase64,expected_sha256:sha,atlas_size:2048,padding:2});
 assert.deepEqual(sent[2]!.body,{kind:'uv',request:sent[0]!.body});
});
test('UV create/status accepts only original native input and independently checked GLB',async()=>{
 const f=fixture();for(const create of [true,false]){const out=await nativeAssetMcp(f.options,'uv',input,create);assert.equal(out.accepted,true);assert.equal(out.status,'NATIVE_UV_GLTF_VERIFIED');assert.equal(out.artifactSha256,sha);assert.equal(out.artifactBytesVerified,true);assert.equal(out.neuralInference,false);}
 assert.deepEqual(f.calls,{create:1,status:1,verify:2,read:2});
 for(const change of [{request_kind:'morph'},{input_verified:false},{input_fingerprint:'bad'},{asset_sha256:'b'.repeat(64)},{asset_bytes:800001}]){
  const f=fixture(),verify=f.options.forge.verifyRequest!;f.options.forge.verifyRequest=async request=>({...await verify(request),...change});assert.equal((await nativeAssetMcp(f.options,'uv',input,true)).accepted,false);
 }
 const tampered=fixture();tampered.options.forge.readArtifact=async()=>({blobBase64:Buffer.from('wrong').toString('base64'),sha256:sha,bytes:blob.length,mimeType:'model/gltf-binary'});
 assert.equal((await nativeAssetMcp(tampered.options,'uv',input,false)).accepted,false);
});
test('UV authority denial withdrawal and unknown create keep identity and bytes unpublished',async()=>{
 for(const change of [(o:any)=>o.auth.scopes=['tools:read'],(o:any)=>o.auth.actorId='foreign',(o:any)=>o.auth.tenantId='foreign',(o:any)=>o.auth.expiresAt=0]){
  const f=fixture();change(f.options);assert.equal((await nativeAssetMcp(f.options,'uv',input,true)).state,'DENY');assert.equal(f.calls.create,0);
 }
 for(const method of ['createUv','verifyRequest','readArtifact'] as const){const f=fixture(),original=f.options.forge[method]!;
  f.options.forge[method]=(async(...args:any[])=>{const result=await (original as any)(...args);f.options.auth.scopes=[];return result;}) as any;
  const answer=await nativeAssetMcp(f.options,'uv',input,true);assert.equal(answer.accepted,false);assert.equal(answer.artifactSha256,undefined);assert.equal(answer.jobId,undefined);
 }
 const f=fixture();f.options.forge.createUv=async()=>{f.calls.create++;throw Error('unknown');};assert.equal((await nativeAssetMcp(f.options,'uv',input,true)).reconciliationRequired,true);assert.equal(f.calls.create,1);
});
test('UV saved kind permits eight journals but keeps exact artifact transfer bound',async()=>{
 const f=fixture();f.options.forge.listSavedJobs=async()=>({schema:'mgr.forge.saved-jobs.v1',status:'JOURNAL_OBSERVATION',items:[],total:8000,unavailable_kinds:[],next_cursor:null,order:'kind_then_request_id',creates_jobs:false});
 assert.equal((await listForgeSavedJobsMcp(f.options,{kind:'uv'})).accepted,true);
 f.options.forge.reopenSavedJob=async()=>({...f.native});assert.equal((await reopenForgeSavedJobMcp(f.options,{kind:'uv',requestId})).accepted,true);
 f.native.asset_bytes=800001;assert.equal((await reopenForgeSavedJobMcp(f.options,{kind:'uv',requestId})).accepted,false);
});
test('UV optional create/status registrations keep execution and final publication fence',async()=>{
 const f=fixture(),tools=new Map<string,any>();registerForgeMcpTools({registerTool:(name:string,schema:any,callback:any)=>tools.set(name,{schema,callback})} as any,f.options);
 assert.ok(tools.has('mgr_forge_uv_create'));assert.ok(tools.has('mgr_forge_uv_status'));
 const stringify=JSON.stringify;let withdrew=false;JSON.stringify=function(value:any,...args:any[]){const text=Reflect.apply(stringify,JSON,[value,...args]);if(value?.status==='NATIVE_UV_GLTF_VERIFIED'){withdrew=true;f.options.auth.scopes=[];}return text;} as typeof JSON.stringify;
 try{const out=await tools.get('mgr_forge_uv_create').callback(input);assert.equal(withdrew,true);assert.equal(out.isError,true);assert.equal(stringify(out).includes(sha),false);}finally{JSON.stringify=stringify;}
});
