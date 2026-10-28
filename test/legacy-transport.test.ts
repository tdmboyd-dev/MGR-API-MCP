import test from 'node:test';
import assert from 'node:assert/strict';
import {LegacyEdgeClient,legacyRequestDigest} from '../src/legacy-client.js';
import {LegacyDispatchCoordinator} from '../src/legacy-dispatch.js';
const context={tenantId:'tenant-a',actorId:'tevin',correlationId:'corr',idempotencyKey:'key'};
const command={action:'crm.update_contact',target:{entityType:'person',entityId:'id'},payload:{firstName:'Test'}};
test('Legacy sends explicit target and trusted identity on command and readback',async()=>{
 const seen:Request[]=[];const client=new LegacyEdgeClient({baseUrl:'http://127.0.0.1:1',fetcher:async(input,init)=>{seen.push(new Request(input,init));return Response.json({accepted:true});}});
 await client.execute(context,command);await client.getEntity(context,'id');
 assert.deepEqual((await seen[0]!.json()).target,command.target);assert.equal(seen[1]!.headers.get('x-actor-id'),'tevin');assert.equal(seen[1]!.headers.get('x-tenant-id'),'tenant-a');
});
test('Legacy deadline includes stalled response body',async()=>{
 const client=new LegacyEdgeClient({baseUrl:'http://127.0.0.1:1',timeoutMs:20,fetcher:async()=>new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{'));}}))});
 await assert.rejects(client.execute(context,command),/timed out/);
});
test('Legacy bounds response bytes and conceals remote body secrets',async()=>{
 const huge=new LegacyEdgeClient({baseUrl:'http://127.0.0.1:1',maxResponseBytes:5,fetcher:async()=>new Response('123456')});await assert.rejects(huge.execute(context,command),/size limit/);
 const failure=new LegacyEdgeClient({baseUrl:'http://127.0.0.1:1',fetcher:async()=>new Response('secret-credential',{status:500})});await assert.rejects(failure.execute(context,command),e=>e instanceof Error&&e.message==='Legacy request failed: HTTP 500');
});
test('receipt reconciliation binds tenant actor action key and exact digest',async()=>{
 const valid={receiptId:'receipt',tenantId:context.tenantId,scope:{tenantId:context.tenantId},actor:{actorType:'service',actorId:context.actorId,tenantId:context.tenantId},action:command.action,correlationId:context.correlationId,status:'succeeded',evidence:{idempotencyKey:context.idempotencyKey,requestDigest:legacyRequestDigest(context,command)},outcome:{result:{id:'id'}}};
 const cases=[{...valid,tenantId:'other'},{...valid,actor:{...valid.actor,actorId:'other'}},{...valid,action:'crm.create_contact'},{...valid,evidence:{...valid.evidence,idempotencyKey:'other'}},{...valid,evidence:{...valid.evidence,requestDigest:'other'}},{...valid,evidence:undefined},valid];
 for(let i=0;i<cases.length;i++){
  let writes=0;const client=new LegacyEdgeClient({baseUrl:'http://127.0.0.1:1',fetcher:async(input,init)=>{const r=new Request(input,init);if(r.method==='POST'){writes++;throw Error('lost');}assert.equal(r.headers.get('x-actor-id'),context.actorId);return Response.json([cases[i]]);}});
  const result=await new LegacyDispatchCoordinator(client).execute(context,command);assert.equal(result.state,i===cases.length-1?'confirmed':'unknown_external_state');assert.equal(writes,1);
 }
});
