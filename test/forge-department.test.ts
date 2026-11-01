import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {DepartmentGateway,departmentCommand} from '../src/department-gateway.js';
import {forgeDepartmentDigest} from '../src/forge-department.js';
import {forgeTriangleGlb} from './fixtures/forge-glb.js';
import {registerDepartmentTools} from '../src/department-gateway.js';
import {createLocalDepartmentEdge,OWNER_DEPARTMENT_REQUEST_BYTES} from '../src/local-department-edge.js';
import {createOwnerDepartmentClient} from '../scripts/owner-department-client.js';
import {createServer,connect} from 'node:net';
const bytes=forgeTriangleGlb(),sha=createHash('sha256').update(bytes).digest('hex');
const commands:any[]=[
 {operation:'forge.world.create',requestId:'owned-world-0001',input:{workspaceId:'studio',edits:{schema:'mgr.forge.world-edit.v1',asset_sha256:'b'.repeat(64),buildings:[{id:'building',center:[-1.25,0,4],size:[1,2,3],material:'Blue'}]}}},
 {operation:'forge.creature.create',requestId:'owned-creature-0001',input:{workspaceId:'studio',prompt:'Original winged creature',seed:42,variants:1,morph:{bend_degrees:-12.5}}},
 {operation:'forge.biome.create',requestId:'owned-biome-0001',input:{workspaceId:'studio',biome:'forest',seed:3,resolution:10}},
 {operation:'forge.human.lipsync',requestId:'owned-human-0001',input:{workspaceId:'studio',fps:24,timings:{schema:'mgr.forge.phoneme-timeline.v1',actor_id:'owner',language:'en-US',duration_ms:100,phonemes:[{phoneme:'AA',start_ms:0,end_ms:100}]}}},
 {operation:'forge.world.compose',requestId:'owned-compose-0001',input:{workspaceId:'studio',biomeRequestId:'owned-biome-0001'}}
];
function fixture(){let calls=0,state='MATERIALIZED',change:any={};const client:any={search:async()=>({}),readArtifact:async()=>({blobBase64:bytes.toString('base64'),sha256:sha,bytes:bytes.length,mimeType:'model/gltf-binary'}),verifyRequest:async(r:any)=>({request_id:r.input.requestId,request_kind:r.kind,input_verified:true,input_fingerprint:'c'.repeat(64),job_id:'a'.repeat(24),status:state,world_sha256:sha,world_bytes:bytes.length,creature_sha256:sha,creature_bytes:bytes.length,biome_sha256:sha,biome_bytes:bytes.length,human_sha256:sha,human_bytes:bytes.length,combined_world_sha256:sha,combined_bytes:bytes.length,...change})};for(const method of ['createWorld','createCreature','createBiome','startHumanLipSync','createComposition'])client[method]=async()=>{calls++;return {};};const gateway=new DepartmentGateway({tenantId:'tenant',actorId:'owner',forge:{workspaceId:'studio',client}});return {gateway,client,get calls(){return calls;},set state(s:string){state=s;},set change(v:any){change=v;}};}
for(const raw of commands)test(raw.operation+' uses exact native input proof and actual bounded GLB readback',async()=>{const f=fixture(),c=departmentCommand.parse(raw);const r=await f.gateway.execute(c);assert.equal(f.calls,1);assert.equal(r.status,'SUCCEEDED');assert.equal(r.nativeInputVerified,true);assert.equal(r.artifacts[0].sha256,sha);assert.equal(r.workspaceId,'studio');assert.equal(r.commandSha256,forgeDepartmentDigest(c as any,'tenant','owner'));const a=await f.gateway.artifact(c);assert.deepEqual(Buffer.from(a.contentBase64,'base64'),bytes);assert.equal(f.calls,1);});
test('foreign workspace and asynchronous/current dispatch fences cannot create jobs',async()=>{const f=fixture();await assert.rejects(f.gateway.execute({...commands[1],input:{...commands[1].input,workspaceId:'foreign'}}),/workspace/);for(const fence of [async()=>{},()=>Promise.reject(Error('fixture')),()=>{throw Error('revoked');}])await assert.rejects(f.gateway.execute(commands[1],fence as any));assert.equal(f.calls,0);});
test('all five preparations use only the original native read and never create or fetch artifacts',async()=>{
 const f=fixture();f.client.readArtifact=async()=>{throw Error('preparation must not fetch artifacts');};for(const raw of commands){const p=await f.gateway.prepare(raw);assert.equal(p.prepared,true);assert.equal(p.sideEffects,false);assert.equal(p.requestExists,true);assert.equal(p.commandSha256,forgeDepartmentDigest(departmentCommand.parse(raw) as any,'tenant','owner'));}assert.equal(f.calls,0);
 f.client.verifyRequest=async(r:any)=>({request_id:r.input.requestId,request_kind:r.kind,status:'NOT_FOUND',input_verified:false});const p=await f.gateway.prepare(commands[1]);assert.equal(p.requestExists,false);assert.equal(p.nativeInputVerified,false);assert.equal('nativeJobId' in p,false);assert.equal(f.calls,0);
});
test('preparation refuses wrong workspace, unsupported domain and unavailable or inconsistent native proof',async()=>{
 const f=fixture();for(const raw of [{...commands[1],input:{...commands[1].input,workspaceId:'foreign'}},{operation:'legacy.contact.create',requestId:'contact',input:{displayName:'Example'}}])await assert.rejects(f.gateway.prepare(raw as any));
 for(const change of [{request_id:'foreign-request-001'},{input_verified:false},{input_fingerprint:'bad'},{job_id:'bad'},{status:'UNRECOGNIZED'},{status:'NOT_FOUND',input_verified:false}]){f.change=change;await assert.rejects(f.gateway.prepare(commands[1]));}
 f.client.verifyRequest=async()=>{throw Error('native unavailable or changed original source');};await assert.rejects(f.gateway.prepare(commands[1]));assert.equal(f.calls,0);
});
test('read-scoped registered preparation has no execution authority and withholds changed authority after read',async()=>{
 const f=fixture(),callbacks=new Map<string,any>(),auth={actorId:'owner',tenantId:'tenant',audience:'https://dept.example/mcp',expiresAt:Date.now()+60000,scopes:['departments:read']};registerDepartmentTools({registerTool:(name:string,_d:any,fn:any)=>callbacks.set(name,fn)} as any,{auth,resourceAudience:auth.audience,gateway:f.gateway});
 assert.equal((await callbacks.get('mgr_department_prepare')(commands[1])).isError,undefined);assert.equal((await callbacks.get('mgr_department_execute')(commands[1])).isError,true);const read=f.client.verifyRequest;f.client.verifyRequest=async(r:any)=>{const value=await read(r);auth.actorId='foreign';return value;};assert.equal((await callbacks.get('mgr_department_prepare')(commands[1])).isError,true);assert.equal(f.calls,0);
});
test('missing/changed exact input proof never becomes terminal success',async()=>{for(const change of [{request_id:'wrong-job-0001'},{input_verified:false},{input_fingerprint:'bad'},{job_id:'bad'}]){const f=fixture();f.change=change;await assert.rejects(f.gateway.status(commands[1]));assert.equal(f.calls,0);}const f=fixture();f.change={status:'NOT_FOUND',input_verified:false};assert.equal((await f.gateway.status(commands[1])).status,'UNKNOWN');});
test('native pending, failure and uncertain states retain their actual meaning',async()=>{for(const [native,expected] of [['RUNNING','RUNNING'],['FAILED','FAILED'],['NEEDS_RECONCILIATION','UNKNOWN']]){const f=fixture();f.state=native!;const r=await f.gateway.status(commands[3]);assert.equal(r.status,expected);assert.equal(r.readbackVerified,false);await assert.rejects(f.gateway.artifact(commands[3]));}});
test('tampered adapter bytes and fake magic-prefix data fail independent receiver checks',async()=>{const f=fixture();f.client.readArtifact=async()=>({blobBase64:bytes.toString('base64')+'\n',sha256:sha,bytes:bytes.length,mimeType:'model/gltf-binary'});await assert.rejects(f.gateway.status(commands[1]));});
test('native adapter cannot mutate validated instructions between approval and readback',async()=>{const f=fixture();f.client.createCreature=async(input:any)=>{input.prompt='changed after validation';return {};};await assert.rejects(f.gateway.execute(commands[1]),TypeError);assert.equal(commands[1].input.prompt,'Original winged creature');});
test('command binding changes with fractional geometry, operation and exact principal',()=>{const a=departmentCommand.parse(commands[0]) as any,b=structuredClone(a);b.input.edits.buildings[0].center[0]=-1.251;assert.notEqual(forgeDepartmentDigest(a,'tenant','owner'),forgeDepartmentDigest(b,'tenant','owner'));assert.notEqual(forgeDepartmentDigest(a,'tenant','owner'),forgeDepartmentDigest(a,'tenant','foreign'));});
test('registered department result pins original authority through awaits and final serialization',async()=>{
 for(const phase of ['await','serialization']){
  const f=fixture(),auth={actorId:'owner',tenantId:'tenant',audience:'https://dept.example/mcp',expiresAt:Date.now()+60000,scopes:['departments:read']},callbacks=new Map<string,any>();
  registerDepartmentTools({registerTool:(name:string,_d:any,fn:any)=>callbacks.set(name,fn)} as any,{auth,resourceAudience:auth.audience,gateway:f.gateway});
  const read=f.client.verifyRequest;f.client.verifyRequest=async(r:any)=>{const response=await read(r);if(phase==='await')auth.expiresAt+=1000;return response;};
  const stringify=JSON.stringify;let fired=false;
  if(phase==='serialization')JSON.stringify=function(value:any,...rest:any[]){const text=Reflect.apply(stringify,JSON,[value,...rest]);if(value?.status==='SUCCEEDED'){fired=true;auth.expiresAt+=1000;}return text;} as typeof JSON.stringify;
  try{const result=await callbacks.get('mgr_department_status')(commands[1]);assert.equal(result.isError,true);assert.equal(stringify(result).includes(sha),false);if(phase==='serialization')assert.equal(fired,true);}finally{JSON.stringify=stringify;}
 }
});
test('native exception details cannot escape through a registered department error',async()=>{
 const f=fixture(),callbacks=new Map<string,any>(),audience='https://dept.example/mcp';f.client.verifyRequest=async()=>{throw Error('private-native-path-and-credential-marker');};
 registerDepartmentTools({registerTool:(name:string,_d:any,fn:any)=>callbacks.set(name,fn)} as any,{auth:{actorId:'owner',tenantId:'tenant',audience,expiresAt:Date.now()+60000,scopes:['departments:read']},resourceAudience:audience,gateway:f.gateway});
 const result=await callbacks.get('mgr_department_status')(commands[1]);assert.equal(result.isError,true);assert.equal(JSON.stringify(result).includes('private-native-path-and-credential-marker'),false);assert.match(JSON.stringify(result),/reconcile/);
});
test('actual trusted SDK accepts a typed world command larger than old32KB while oversized framing denies',async()=>{
 const f=fixture(),reserve=createServer();await new Promise<void>(r=>reserve.listen(0,'127.0.0.1',r));const port=(reserve.address() as any).port;await new Promise<void>(r=>reserve.close(()=>r()));
 const token='OWNER_TRANSPORT_FIXTURE_TOKEN_1234567890123456',edge=createLocalDepartmentEdge({port,accessToken:token,tenantId:'tenant',actorId:'owner',expiresAt:Date.now()+60000,forge:{workspaceId:'studio',client:f.client}});
 await new Promise<void>(r=>edge.server.listen(port,'127.0.0.1',r));const client=createOwnerDepartmentClient({endpoint:edge.baseUrl+'/mcp',accessToken:token,tenantId:'tenant',actorId:'owner',assertCurrent:()=>{}});
 try{
  const raw=structuredClone(commands[0]);raw.input.edits.buildings=Array.from({length:200},(_,i)=>({id:'building-'+i+'x'.repeat(80),center:[-1.25,0,2],size:[1,2,3],material:'m'.repeat(95)}));assert.ok(JSON.stringify(raw).length>32768);
  const result=await client.callTool({name:'mgr_department_execute',arguments:raw});assert.ok('content' in result);assert.equal(result.isError,undefined);assert.equal(f.calls,1);
  const denied=await new Promise<string>((resolve,reject)=>{const socket=connect(port,'127.0.0.1',()=>socket.write('POST /mcp HTTP/1.1\r\nHost: 127.0.0.1:'+port+'\r\nAuthorization: Bearer '+token+'\r\nContent-Length: '+(OWNER_DEPARTMENT_REQUEST_BYTES+1)+'\r\nConnection: close\r\n\r\n'));let text='';socket.setEncoding('utf8');socket.on('data',s=>text+=s);socket.on('end',()=>resolve(text));socket.on('error',reject);socket.setTimeout(5000,()=>socket.destroy(Error('fixture transport timeout')));});assert.match(denied,/413/);assert.equal(f.calls,1);
 }finally{await client.close();await edge.close();}
});
