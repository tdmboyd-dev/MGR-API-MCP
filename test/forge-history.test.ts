import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ForgeStudioCatalogClient} from '../src/forge-catalog-client.js';
import {listForgeSavedJobsMcp,reopenForgeSavedJobMcp,registerForgeMcpTools,type ForgeMcpToolOptions} from '../src/forge-mcp-tools.js';
import {forgeTriangleGlb} from './fixtures/forge-glb.js';

const audience='https://forge-history.invalid/mcp',requestId='saved-creature-0001',jobId='a'.repeat(24);
const blob=forgeTriangleGlb(),sha=createHash('sha256').update(blob).digest('hex');
const native={schema:'mgr.forge.saved-jobs.v1',status:'JOURNAL_OBSERVATION',
  items:[{kind:'creature',request_id:requestId,job_id:jobId,status:'MATERIALIZED',artifact_verified:false}],
  total:1,unavailable_kinds:[],next_cursor:null,order:'kind_then_request_id',creates_jobs:false};
function fixture(){
  let calls=0,reads=0;
  const options:ForgeMcpToolOptions={auth:{actorId:'owner',tenantId:'tenant',audience,scopes:['tools:read'],expiresAt:Date.now()+60000},
    resourceAudience:audience,allowedTenantId:'tenant',allowedActorId:'owner',forge:{
      search:async()=>({}),listSavedJobs:async()=>{calls++;return structuredClone(native);},
      reopenSavedJob:async()=>{calls++;return {status:'MATERIALIZED',request_id:requestId,job_id:jobId,creature_sha256:sha,creature_bytes:blob.length};},
      readArtifact:async()=>{reads++;return {blobBase64:blob.toString('base64'),sha256:sha,bytes:blob.length,mimeType:'model/gltf-binary'};}
    }};
  return {options,get calls(){return calls;},get reads(){return reads;}};
}

test('saved-jobs typed client forwards only original read routes and translates reopen identity',async()=>{
  const sent:Array<{path:string;body:any;token:string|null}>=[];
  const client=new ForgeStudioCatalogClient({baseUrl:'http://127.0.0.1:8444',token:'private-fixture-token',transport:async(url,init)=>{
    sent.push({path:new URL(String(url)).pathname,body:JSON.parse(String(init?.body)),token:new Headers(init?.headers).get('X-MGR-Forge-Token')});return Response.json(native);
  }});
  await client.listSavedJobs({kind:'creature',limit:2,cursor:'b'.repeat(64)+':2'});
  await client.reopenSavedJob({kind:'creature',requestId});
  assert.deepEqual(sent.map(x=>[x.path,x.body]),[
    ['/api/saved-jobs',{kind:'creature',limit:2,cursor:'b'.repeat(64)+':2'}],
    ['/api/saved-job-reopen',{kind:'creature',request_id:requestId}]]);
  assert.ok(sent.every(x=>x.token==='private-fixture-token'));
  for(const bad of [{limit:21},{limit:0},{limit:1.5},{kind:'other'},{cursor:'not-pinned'}, {approve:true}]){
    await assert.rejects(client.listSavedJobs(bad as any));
  }
  for(const bad of [{kind:'all',requestId},{kind:'creature',requestId:'short'}, {kind:'creature',requestId,create:true}]){
    await assert.rejects(client.reopenSavedJob(bad as any));
  }
  assert.equal(sent.length,2,'invalid requests must never reach native transport');
});

test('saved journal listing reports observation without promoting files or reading GLBs',async()=>{
  const f=fixture(),result=await listForgeSavedJobsMcp(f.options,{});
  assert.equal(result.accepted,true);assert.equal(result.status,'JOURNAL_OBSERVATION');
  assert.equal(result.artifactReady,false);assert.equal(result.artifactVerified,false);
  assert.equal(result.creationPerformed,false);assert.equal(result.artifactSha256,undefined);
  assert.equal(f.calls,1);assert.equal(f.reads,0);
  assert.equal((result.journal as typeof native).items[0]?.artifact_verified,false);
});

test('both saved creation reads require the current exact actor tenant audience scope and expiry before native dispatch',async()=>{
  for(const mutate of [(o:any)=>o.auth.actorId='stranger',(o:any)=>o.auth.tenantId='other',(o:any)=>o.auth.audience='other',
    (o:any)=>o.auth.scopes=[],(o:any)=>o.auth.expiresAt=0,(o:any)=>o.allowedActorId='']){
    const f=fixture();mutate(f.options);
    assert.equal((await listForgeSavedJobsMcp(f.options,{})).state,'DENY');
    assert.equal((await reopenForgeSavedJobMcp(f.options,{kind:'creature',requestId})).state,'DENY');
    assert.equal(f.calls,0);assert.equal(f.reads,0);
  }
});

test('saved journal schema refuses leaked private fields false integrity promotions and foreign kind rows',async()=>{
  for(const change of [(x:any)=>x.items[0].prompt='private prompt',(x:any)=>x.items[0].artifact_verified=true,
    (x:any)=>x.creates_jobs=true,(x:any)=>x.total=8001,(x:any)=>x.items[0].job_id='../private',
    (x:any)=>x.items[0].kind='world']){
    const f=fixture(),wrong=structuredClone(native);change(wrong);f.options.forge.listSavedJobs=async()=>wrong;
    const result=await listForgeSavedJobsMcp(f.options,{kind:'creature'});
    assert.equal(result.accepted,false);assert.equal(result.journal,undefined);
    assert.equal(JSON.stringify(result).includes('private prompt'),false);
  }
});

test('reopen independently checks exact existing native GLB bytes while returning no binary or new create',async()=>{
  const f=fixture(),result=await reopenForgeSavedJobMcp(f.options,{kind:'creature',requestId});
  assert.equal(result.accepted,true);assert.equal(result.status,'SAVED_CREATION_GLTF_VERIFIED');
  assert.equal(result.artifactBytesVerified,true);assert.equal(result.artifactSha256,sha);
  assert.equal(result.creationPerformed,false);assert.equal(result.blobBase64,undefined);
  assert.equal(f.calls,1);assert.equal(f.reads,1);
});

test('reopen preserves unfinished missing and failed state without fetching artifacts or retrying',async()=>{
  for(const state of ['NOT_FOUND','RUNNING','FAILED','NEEDS_RECONCILIATION']){
    const f=fixture();f.options.forge.reopenSavedJob=async()=>({status:state,request_id:requestId,job_id:jobId});
    const result=await reopenForgeSavedJobMcp(f.options,{kind:'creature',requestId});
    assert.equal(result.accepted,false);assert.equal(result.state,state);assert.equal(result.artifactReady,false);
    assert.equal(result.creationPerformed,false);assert.equal(f.reads,0);
  }
});

test('reopen rejects native identity substitution metadata size mismatch tampering and unavailable reader',async()=>{
  for(const change of [(o:any)=>o.forge.reopenSavedJob=async()=>({status:'MATERIALIZED',request_id:'different-saved-0001',job_id:jobId,creature_sha256:sha,creature_bytes:blob.length}),
    (o:any)=>o.forge.reopenSavedJob=async()=>({status:'MATERIALIZED',request_id:requestId,job_id:jobId,creature_sha256:sha,creature_bytes:blob.length+1}),
    (o:any)=>o.forge.readArtifact=async()=>({blobBase64:blob.toString('base64'),sha256:'f'.repeat(64),bytes:blob.length,mimeType:'model/gltf-binary'}),
    (o:any)=>delete o.forge.readArtifact]){
    const f=fixture();change(f.options);const result=await reopenForgeSavedJobMcp(f.options,{kind:'creature',requestId});
    assert.equal(result.accepted,false);assert.equal(result.artifactSha256,undefined);assert.equal(result.blobBase64,undefined);
  }
});

test('authority withdrawn while list reopen or binary fetch waits withholds all returned saved identities',async()=>{
  for(const method of ['listSavedJobs','reopenSavedJob','readArtifact'] as const){
    const f=fixture(),original=f.options.forge[method]!,held=new Promise<void>(resolve=>setTimeout(resolve,1));
    f.options.forge[method]=(async(...args:any[])=>{await held;f.options.auth.scopes=[];return (original as any)(...args);}) as any;
    const result=method==='listSavedJobs'?await listForgeSavedJobsMcp(f.options,{}):await reopenForgeSavedJobMcp(f.options,{kind:'creature',requestId});
    assert.equal(result.accepted,false);assert.equal(result.journal,undefined);assert.equal(result.artifactSha256,undefined);assert.equal(result.jobId,undefined);
  }
});

test('optional saved creation methods register read-only tools and preserve older client catalog',async()=>{
  const f=fixture(),registered=new Map<string,{definition:any;callback:any}>();
  registerForgeMcpTools({registerTool:(name:string,definition:any,callback:any)=>registered.set(name,{definition,callback})} as any,f.options);
  for(const [name,input] of [['mgr_forge_saved_jobs',{}],['mgr_forge_saved_job_reopen',{kind:'creature',requestId}]] as const){
    const tool=registered.get(name)!;assert.ok(tool);const response=await tool.callback(tool.definition.inputSchema.parse(input));
    assert.equal(response.isError,false);assert.equal(response.content.some((x:any)=>x.type==='resource'),false);
  }
  delete f.options.forge.listSavedJobs;delete f.options.forge.reopenSavedJob;registered.clear();
  registerForgeMcpTools({registerTool:(name:string,definition:any,callback:any)=>registered.set(name,{definition,callback})} as any,f.options);
  assert.equal(registered.has('mgr_forge_saved_jobs'),false);assert.equal(registered.has('mgr_forge_saved_job_reopen'),false);
});

test('registered saved reads enforce final publication authority after serialized content exists',async()=>{
  for(const [name,input,status] of [['mgr_forge_saved_jobs',{},'JOURNAL_OBSERVATION'],
    ['mgr_forge_saved_job_reopen',{kind:'creature',requestId},'SAVED_CREATION_GLTF_VERIFIED']] as const){
    const f=fixture(),registered=new Map<string,any>();
    registerForgeMcpTools({registerTool:(tool:string,_definition:any,callback:any)=>registered.set(tool,callback)} as any,f.options);
    const stringify=JSON.stringify;let fired=false;
    JSON.stringify=function(value:any,...args:any[]){const text=Reflect.apply(stringify,JSON,[value,...args]);
      if(value?.status===status){fired=true;f.options.auth.scopes=[];}return text;} as typeof JSON.stringify;
    try{const result=await registered.get(name)(input);assert.equal(fired,true);assert.equal(result.isError,true);
      const text=stringify(result);assert.equal(text.includes(requestId),false);assert.equal(text.includes(sha),false);
    }finally{JSON.stringify=stringify;}
  }
});
