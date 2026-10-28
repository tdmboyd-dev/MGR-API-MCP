import test from 'node:test';
import assert from 'node:assert/strict';
import {OmniEngineeringClient,omniSha256,canonicalOmniJson,type OmniInput,type OmniClientConfig} from '../src/omnidev-client.js';
import {departmentCommand,DepartmentGateway,registerDepartmentTools} from '../src/department-gateway.js';
const hash=(c:string)=>c.repeat(64),actorId='tevin-proof',tenantId='tenant';
const policy={hostId:'host',launcherSha256:hash('a'),runtimeSha256:hash('b'),qualificationDigest:hash('c')};
const input:OmniInput={workspaceId:'workspace',jobId:'request-'+hash('d'),sourceDigest:hash('e'),candidateDigest:hash('f'),testManifestDigest:hash('0')};
const requestId='proof',assignment={id:'8c80c046-a541-4c82-a55a-1b6b0c9137c3',workerKind:'windows-appcontainer',profile:'snapshot',...policy,profileName:'omni-8c80c046-a541-4c82-a55a-1b6b0c9137c3',sourceDigest:input.sourceDigest,candidateDigest:input.candidateDigest,testManifestDigest:input.testManifestDigest,expiresAt:123456789};
const nativeReceipt={...policy,native:{profileName:assignment.profileName,packageSid:'S-1-15-2-1-2-3-4-5-6-7',tokenIsAppContainer:true,capabilityCount:0,jobAssignedAtCreation:true},cleanup:{verifiedAbsent:true,activeProcessesAfter:0,profileDeletionHResult:0,workspaceAbsent:true}};
function fixture(){
 const report={version:1,actorId,tenantId,...input,policyIdentity:policy,assignment,accepted:true,externalTests:{passed:true,worker:'windows-appcontainer',profile:'snapshot',assignment,nativeReceipt},nativeReceipt};
 const common={requestId,actorId,tenantId,...input,inputDigest:omniSha256(canonicalOmniJson({actorId,tenantId,requestId,...input})),status:'succeeded',cancelRequested:false,receiptId:'receipt',policyIdentity:policy,readbackVerified:true,reportId:'native-report:'+assignment.id,reportSha256:omniSha256(canonicalOmniJson(report)),bytes:Buffer.byteLength(canonicalOmniJson(report)),mediaType:'application/json'};
 return structuredClone({binding:{actorId,tenantId,...input,workerKind:'windows-appcontainer',profile:'snapshot',policyIdentity:policy,currentBindingVerified:true,objective:'PRIVATE',files:['PRIVATE']},common,report});
}
const json=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status});
function client(fetcher:typeof fetch,extras:Partial<OmniClientConfig>={}){return new OmniEngineeringClient({baseUrl:'http://127.0.0.1:8888',token:'p'.repeat(32),actorId,tenantId,expectedPolicy:policy,fetcher,...extras});}
function transport(f=fixture(),override?:(path:string,init?:RequestInit)=>Response|undefined):typeof fetch{return (async(url,init)=>{const path=new URL(String(url)).pathname;const custom=override?.(path,init);if(custom)return custom;if(path.endsWith('/binding'))return json(f.binding);if(path.endsWith('/report'))return json({...f.common,report:f.report});return json(f.common);}) as typeof fetch;}

test('Omni schema bounds exact jobs, rejects model-provided code and malformed hashes',()=>{
 assert.equal(departmentCommand.parse({operation:'omnidev.job.verify',requestId,input}).operation,'omnidev.job.verify');
 for(const invalid of [{...input,sourceDigest:'f'},{...input,jobId:'../../x'},{...input,code:'execute'}])assert.throws(()=>departmentCommand.parse({operation:'omnidev.job.verify',requestId,input:invalid}));
});
test('binding strips private source/objective, verifies configured policy and principal',async()=>{
 const f=fixture();const result=await client(transport(f)).binding({workspaceId:input.workspaceId,jobId:input.jobId});assert.equal('objective' in result,false);assert.equal('files' in result,false);
 for(const mutate of [(x:any)=>x.actorId='foreign',(x:any)=>x.policyIdentity={...policy,hostId:'other'},(x:any)=>x.profile='node-application',(x:any)=>x.jobId='request-'+hash('1')]){const g=fixture();mutate(g.binding);await assert.rejects(client(transport(g)).binding({workspaceId:input.workspaceId,jobId:input.jobId}));}
});
test('realistic accepted report shape is independently hashed and bound to native assignment and cleanup',async()=>{
 const r=await client(transport()).status(requestId,input);assert.equal(r.status,'succeeded');assert.equal(r.readbackVerified,true);assert.equal((r as any).currentBindingVerified,true);assert.equal((r as any).assignmentId,assignment.id);assert.equal('report' in r,false);
});
test('false success, changed exact report bytes and mismatched native cleanup are rejected',async()=>{
 const mutations=[(f:any)=>f.common.reportSha256=hash('9'),(f:any)=>f.common.receiptId=null,(f:any)=>f.report.assignment.id='00000000-0000-4000-8000-000000000000',(f:any)=>f.report.accepted=false,(f:any)=>f.report.nativeReceipt.cleanup.activeProcessesAfter=1,(f:any)=>f.report.nativeReceipt.native.capabilityCount=1,(f:any)=>f.report.externalTests.passed=false,(f:any)=>f.report.actorId='foreign',(f:any)=>f.report.candidateDigest=hash('1')];
 for(const mutate of mutations){const f=fixture();mutate(f);await assert.rejects(client(transport(f)).status(requestId,input));}
});
test('receipt actor/action/input mutation cannot reconcile a different operation',async()=>{
 for(const mutate of [(f:any)=>f.common.actorId='foreign',(f:any)=>f.common.requestId='another',(f:any)=>f.common.sourceDigest=hash('1'),(f:any)=>f.common.inputDigest=hash('2'),(f:any)=>f.common.status='success']){const f=fixture();mutate(f);await assert.rejects(client(transport(f)).status(requestId,input));}
});
test('dispatch rechecks current digest before POST and credential headers are host-bound',async()=>{
 const f=fixture();let posts=0;const fetcher=transport(f,(path,init)=>{assert.equal((init?.headers as any)['x-actor-id'],actorId);assert.equal((init?.headers as any)['x-tenant-id'],tenantId);assert.equal(init?.redirect,'error');if(init?.method==='POST')posts++;return undefined;});
 await client(fetcher).execute(requestId,input);assert.equal(posts,1);
 f.binding.candidateDigest=hash('1');await assert.rejects(client(fetcher).execute('changed',input),/changed before dispatch/);assert.equal(posts,1);
});
test('lost POST acknowledgment never auto-repeats native execution; status can independently reconcile',async()=>{
 let posts=0;const f=fixture();const fetcher=(async(url,init)=>{if(init?.method==='POST'){posts++;throw Error('PRIVATE provider diagnostics');}return transport(f)(url,init);}) as typeof fetch;
 const c=client(fetcher);await assert.rejects(c.execute(requestId,input),/transport unavailable; reconcile/);assert.equal(posts,1);assert.equal((await c.status(requestId,input)).readbackVerified,true);assert.equal(posts,1);
});
test('historical valid report survives workspace edits without current verification claim',async()=>{
 const f=fixture();f.binding.sourceDigest=hash('1');const r=await client(transport(f)).status(requestId,input);assert.equal(r.readbackVerified,true);assert.equal((r as any).currentBindingVerified,false);
});
test('queued cancel and running cancel request remain distinguishable without invented cleanup success',async()=>{
 for(const [status,cancelRequested] of [['cancelled',true],['running',true],['unknown',true]] as const){const f=fixture();f.common.status=status;f.common.cancelRequested=cancelRequested;const result=await client(transport(f)).cancel(requestId,input);assert.equal(result.status,status);assert.equal(result.cancelRequested,true);assert.equal(result.readbackVerified,false);}
});
test('response actual byte cap and safe HTTP errors reject before publication',async()=>{
 await assert.rejects(client((async()=>new Response('x'.repeat(130))) as typeof fetch,{maxResponseBytes:128}).binding({workspaceId:input.workspaceId,jobId:input.jobId}),/byte limit/);
 await assert.rejects(client((async()=>json({secret:'PRIVATE'},409)) as typeof fetch).execute(requestId,input),error=>String(error).includes('HTTP 409')&&!String(error).includes('PRIVATE'));
});
test('whole request deadline bounds hung headers AND hung body even transport ignores abort',async()=>{
 for(const fetcher of [(async()=>new Promise(()=>{})) as typeof fetch,(async()=>new Response(new ReadableStream({start(){}}))) as typeof fetch]){const start=Date.now();await assert.rejects(client(fetcher,{timeoutMs:20}).binding({workspaceId:input.workspaceId,jobId:input.jobId}),/timed out/);assert.ok(Date.now()-start<1000);}
});
test('binding MCP scope and expiry are checked again after asynchronous provider read',async()=>{
 const f=fixture(),handlers=new Map<string,any>(),auth={actorId,tenantId,audience:'edge',scopes:['departments:read'],expiresAt:Date.now()+10000};
 const fetcher=(async(url,init)=>{auth.expiresAt=0;return transport(f)(url,init);}) as typeof fetch;
 const gateway=new DepartmentGateway({actorId,tenantId,creation:{baseUrl:'http://127.0.0.1:1',token:'c'.repeat(32)},voice:{baseUrl:'http://127.0.0.1:2',token:'v'.repeat(32)},signme:{baseUrl:'http://127.0.0.1:3',token:'s'.repeat(32)},legacy:{} as any,omnidev:{baseUrl:'http://127.0.0.1:4',token:'o'.repeat(32),actorId,tenantId,expectedPolicy:policy,fetcher}});
 registerDepartmentTools({registerTool:(name:string,_:unknown,handler:any)=>handlers.set(name,handler)} as any,{gateway,auth,resourceAudience:'edge'});
 const result=await handlers.get('mgr_omnidev_candidate_binding')({workspaceId:input.workspaceId,jobId:input.jobId});assert.equal(result.isError,true);assert.doesNotMatch(JSON.stringify(result),/sourceDigest/);
});


test('invalid UTF8 and excessive JSON depth are rejected; string braces do not count as structure',async()=>{
 for(const bytes of [Buffer.from([0x7b,0x22,0x78,0x22,0x3a,0x22,0xc3,0x28,0x22,0x7d]),Buffer.from('['.repeat(65)+'0'+']'.repeat(65))])await assert.rejects(client((async()=>new Response(bytes)) as typeof fetch).binding({workspaceId:input.workspaceId,jobId:input.jobId}),/invalid JSON/);
 const f=fixture();(f.binding as any).ignored='['.repeat(100)+'}';assert.equal((await client(transport(f)).binding({workspaceId:input.workspaceId,jobId:input.jobId})).jobId,input.jobId);
});
test('aborted body stream is actively cancelled and no late body can become success',async()=>{
 let cancelled=false;const fetcher=(async()=>new Response(new ReadableStream({cancel(){cancelled=true;}}))) as typeof fetch;
 await assert.rejects(client(fetcher,{timeoutMs:20}).binding({workspaceId:input.workspaceId,jobId:input.jobId}),/timed out/);assert.equal(cancelled,true);
});
test('terminal receipt IDs and uint32 AppContainer SID components are validated',async()=>{
 for(const invalid of [' ', 'x\u0000x','r'.repeat(201)]){const f=fixture();f.common.receiptId=invalid;await assert.rejects(client(transport(f)).status(requestId,input));}
 const f=fixture();f.report.nativeReceipt.native.packageSid='S-1-15-2-4294967296-2-3-4-5-6-7';await assert.rejects(client(transport(f)).status(requestId,input),/process receipt/);
});
test('gateway rejects cross-principal service mappings and policy config cannot drift',()=>{
 const config={actorId,tenantId,creation:{baseUrl:'http://127.0.0.1:1',token:'c'.repeat(32)},voice:{baseUrl:'http://127.0.0.1:2',token:'v'.repeat(32)},signme:{baseUrl:'http://127.0.0.1:3',token:'s'.repeat(32)},legacy:{} as any,omnidev:{baseUrl:'http://127.0.0.1:4',token:'o'.repeat(32),actorId:'other',tenantId,expectedPolicy:policy}};
 assert.throws(()=>new DepartmentGateway(config),/principal/);
 const mutable={...policy},c=client(transport(),{expectedPolicy:mutable});mutable.hostId='other';assert.equal(c.config.expectedPolicy.hostId,'host');assert.throws(()=>{c.config.expectedPolicy.hostId='other';});
});


test('accepted failed native tests provide verified canonical report artifact without claiming success',async()=>{
 const f=fixture();f.common.status='failed';f.report.externalTests.passed=false;f.common.reportSha256=omniSha256(canonicalOmniJson(f.report));f.common.bytes=Buffer.byteLength(canonicalOmniJson(f.report));
 const c=client(transport(f)),r=await c.status(requestId,input);assert.equal(r.status,'failed');assert.equal(r.readbackVerified,true);
 const artifact=await c.artifact(requestId,input);const bytes=Buffer.from((artifact as any).contentBase64,'base64');assert.equal(omniSha256(bytes),f.common.reportSha256);assert.equal(bytes.toString(),canonicalOmniJson(f.report));assert.equal((artifact as any).mediaType,'application/json');
});
test('pre-execution failure, unknown and cancelled states cannot fabricate report downloads',async()=>{
 for(const status of ['failed','unknown','cancelled']){const f=fixture();f.common.status=status;delete (f.common as any).reportId;const c=client(transport(f));assert.equal((await c.status(requestId,input)).readbackVerified,false);await assert.rejects(c.artifact(requestId,input),/unavailable/);}
});


test('succeeded receipt missing native report ID fails status, dispatch and cancel',async()=>{
 const f=fixture();delete (f.common as any).reportId;const c=client(transport(f));
 await assert.rejects(c.status(requestId,input),/report ID missing/);await assert.rejects(c.execute(requestId,input),/report ID missing/);await assert.rejects(c.cancel(requestId,input),/report ID missing/);
});
test('gateway artifact retains standard sha256/bytes/base64 envelope for exact accepted JSON report',async()=>{
 const gateway=new DepartmentGateway({actorId,tenantId,creation:{baseUrl:'http://127.0.0.1:1',token:'c'.repeat(32)},voice:{baseUrl:'http://127.0.0.1:2',token:'v'.repeat(32)},signme:{baseUrl:'http://127.0.0.1:3',token:'s'.repeat(32)},legacy:{} as any,omnidev:{baseUrl:'http://127.0.0.1:4',token:'o'.repeat(32),actorId,tenantId,expectedPolicy:policy,fetcher:transport()}});
 const artifact=await gateway.artifact({operation:'omnidev.job.verify',requestId,input});assert.equal(artifact.sha256,omniSha256(Buffer.from(artifact.contentBase64,'base64')));assert.equal(artifact.mediaType,'application/json');assert.equal(artifact.bytes,Buffer.from(artifact.contentBase64,'base64').length);
});

for(const change of ['expiry','scope','actor','tenant'] as const){
 test(`registered execute denies ${change} during held binding before any native POST`,async()=>{
  const f=fixture(),handlers=new Map<string,any>();
  const auth={actorId,tenantId,audience:'edge',scopes:['departments:read','departments:execute'],expiresAt:Date.now()+60000};
  let release!:()=>void,entered!:()=>void,posts=0;
  const held=new Promise<void>(r=>release=r),bindingStarted=new Promise<void>(r=>entered=r);
  const fetcher=(async(url,init)=>{
   if(new URL(String(url)).pathname.endsWith('/binding')){entered();await held;}
   if(init?.method==='POST')posts++;
   return transport(f)(url,init);
  }) as typeof fetch;
  const endpoint={baseUrl:'http://127.0.0.1:1',token:'x'.repeat(32)};
  const gateway=new DepartmentGateway({actorId,tenantId,creation:endpoint,voice:endpoint,signme:endpoint,legacy:{} as any,omnidev:{...endpoint,actorId,tenantId,expectedPolicy:policy,fetcher}});
  registerDepartmentTools({registerTool:(name:string,_:unknown,handler:any)=>handlers.set(name,handler)} as any,{gateway,auth,resourceAudience:'edge'});
  const pending=handlers.get('mgr_department_execute')({operation:'omnidev.job.verify',requestId,input});
  await bindingStarted;
  if(change==='expiry')auth.expiresAt=0;
  if(change==='scope')auth.scopes=['departments:read'];
  if(change==='actor')auth.actorId='another';
  if(change==='tenant')auth.tenantId='another';
  release();
  const response=await pending;
  assert.equal(response.isError,true);assert.equal(posts,0);
  assert.doesNotMatch(JSON.stringify(response),/sourceDigest|reportSha256/);
 });
}

test('expiry after accepted POST suppresses publication and never retries the effect',async()=>{
 const f=fixture(),handlers=new Map<string,any>(),auth={actorId,tenantId,audience:'edge',scopes:['departments:execute'],expiresAt:Date.now()+60000};let posts=0;
 const fetcher=(async(url,init)=>{if(init?.method==='POST'){posts++;auth.expiresAt=0;}return transport(f)(url,init);}) as typeof fetch;
 const endpoint={baseUrl:'http://127.0.0.1:1',token:'x'.repeat(32)};
 const gateway=new DepartmentGateway({actorId,tenantId,creation:endpoint,voice:endpoint,signme:endpoint,legacy:{} as any,omnidev:{...endpoint,actorId,tenantId,expectedPolicy:policy,fetcher}});
 registerDepartmentTools({registerTool:(name:string,_:unknown,handler:any)=>handlers.set(name,handler)} as any,{gateway,auth,resourceAudience:'edge'});
 const response=await handlers.get('mgr_department_execute')({operation:'omnidev.job.verify',requestId,input});
 assert.equal(posts,1);assert.equal(response.isError,true);assert.doesNotMatch(JSON.stringify(response),/reportSha256|sourceDigest/);
});
