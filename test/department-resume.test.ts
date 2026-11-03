import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {DepartmentGateway,canonicalDepartmentJson} from '../src/department-gateway.js';import {LegacyEdgeClient,legacyRequestDigest} from '../src/legacy-client.js';
const endpoint={baseUrl:'http://127.0.0.1:1/',token:'OWNED-SYNTHETIC-DEPARTMENT-TOKEN-ONLY'},command={operation:'creation.document.render' as const,requestId:'owned-accepted',input:{workspaceId:'owned-workspace',title:'Owned title',sections:[{heading:'Owned',body:'Owned bytes'}],rightsRefs:['owner-fixture']}};
const digest=createHash('sha256').update(canonicalDepartmentJson({requestId:command.requestId,tenantId:'tenant',workspaceId:command.input.workspaceId,capability:'document.markdown',input:{actorId:'actor',correlationId:command.requestId,payload:{title:command.input.title,sections:command.input.sections,rightsRefs:command.input.rightsRefs}},acceptanceCriteria:['nonempty durable Markdown artifact with matching SHA256'],maxCost:0})).digest('hex'),bytes=Buffer.from('# Owned bytes');
function fixture({state='QUEUED',wrongDigest=false,loseAck=false,afterRead=()=>{}}={}){const calls:{path:string;method:string}[]=[];const artifact={id:'owned-artifact',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};const gateway=new DepartmentGateway({actorId:'actor',tenantId:'tenant',creation:endpoint,voice:endpoint,signme:endpoint,legacy:new LegacyEdgeClient({baseUrl:endpoint.baseUrl}),fetcher:async(url,init)=>{const path=new URL(url.toString()).pathname,method=init?.method??'GET';calls.push({path,method});assert.equal(init?.redirect,'error');if(path.includes('/artifacts/'))return new Response(bytes);if(method==='POST'){assert.equal(path,'/v1/creation/jobs/'+command.requestId+'/run');if(loseAck)throw Error('OWNED_LOST_ACK');return Response.json({requestId:command.requestId,inputDigest:digest,status:'SUCCEEDED',artifacts:[artifact]});}afterRead();return Response.json({requestId:command.requestId,inputDigest:wrongDigest?'0'.repeat(64):digest,status:state,artifacts:state==='SUCCEEDED'?[artifact]:[]});}});return{gateway,calls};}
test('explicit queued resume reads exact accepted job then one existing run POST and verified artifact',async()=>{const f=fixture();let fences=0;const result=await f.gateway.resume(command,()=>{fences++;});assert.equal(result.status,'SUCCEEDED');assert.equal(result.readbackVerified,true);assert.equal(fences,2);assert.deepEqual(f.calls.map(c=>[c.method,c.path]),[['GET','/v1/creation/jobs/'+command.requestId],['POST','/v1/creation/jobs/'+command.requestId+'/run'],['GET','/v1/creation/artifacts/owned-artifact']]);});
test('already succeeded resume verifies saved bytes and performs no POST',async()=>{const f=fixture({state:'SUCCEEDED'}),result=await f.gateway.resume(command);assert.equal(result.readbackVerified,true);assert.equal(f.calls.length,2);assert.equal(f.calls.every(c=>c.method==='GET'),true);});
for(const state of ['RUNNING','FAILED','CANCELLED','BLOCKED','UNKNOWN'])test('resume reconciles '+state+' without a new mutation',async()=>{const f=fixture({state}),r=await f.gateway.resume(command);assert.equal(r.status,state);assert.equal(f.calls.length,1);assert.equal(f.calls[0]?.method,'GET');});
test('wrong immutable input digest denies before resume POST',async()=>{const f=fixture({wrongDigest:true});await assert.rejects(f.gateway.resume(command),/input mismatch/);assert.equal(f.calls.length,1);});
test('current authority withdrawn during queued read denies before POST',async()=>{let current=true;const f=fixture({afterRead:()=>{current=false;}});await assert.rejects(f.gateway.resume(command,()=>{if(!current)throw Error('OWNED_AUTHORITY_REVOKED');}),/OWNED_AUTHORITY_REVOKED/);assert.equal(f.calls.length,1);});
test('lost run acknowledgment is never retried inside the gateway',async()=>{const f=fixture({loseAck:true});await assert.rejects(f.gateway.resume(command),/OWNED_LOST_ACK/);assert.equal(f.calls.filter(c=>c.method==='POST').length,1);});
test('other department operation cannot enter native Markdown resume',async()=>{const f=fixture();await assert.rejects(f.gateway.resume({operation:'legacy.contact.create',requestId:'owned-other',input:{displayName:'Owned'}}),/Only accepted native Markdown/);assert.equal(f.calls.length,0);});

test('Legacy contact acknowledgment needs the same owning receipt and entity readback',async()=>{
 const context={tenantId:'tenant',actorId:'actor',correlationId:'legacy-owned',idempotencyKey:'legacy-owned'};
 const command={operation:'legacy.contact.create' as const,requestId:context.correlationId,input:{displayName:'Owned Contact'}};
 const request={action:'crm.create_contact',payload:{firstName:command.input.displayName}};
 for(const readback of [null,'different-receipt','exact-receipt']){
  const calls:string[]=[];
  const legacy=new LegacyEdgeClient({baseUrl:endpoint.baseUrl,fetcher:async url=>{
   const path=new URL(url.toString()).pathname;calls.push(path);
   if(path==='/v1/commands')return Response.json({accepted:true,receiptId:'exact-receipt'});
   if(path==='/v1/truth/receipts')return Response.json(readback?[{receiptId:readback,tenantId:context.tenantId,scope:{tenantId:context.tenantId},actor:{tenantId:context.tenantId,actorId:context.actorId,actorType:'service'},action:request.action,correlationId:context.correlationId,evidence:{idempotencyKey:context.idempotencyKey,requestDigest:legacyRequestDigest(context,request)},status:'succeeded',outcome:{result:{id:'contact'}}}]:[]);
   return Response.json({id:'contact',attributes:request.payload});
  }});
  const gateway=new DepartmentGateway({actorId:context.actorId,tenantId:context.tenantId,legacy});
  if(readback==='exact-receipt')assert.equal((await gateway.execute(command)).status,'SUCCEEDED');
  else await assert.rejects(gateway.execute(command),/receipt is not confirmed/);
  assert.equal(calls.filter(path=>path==='/v1/commands').length,1);
 }
});
