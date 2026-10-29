import test from 'node:test';import assert from 'node:assert/strict';
import {LegacyEdgeClient} from '../src/legacy-client.js';import {readLegacyEvents} from '../src/legacy-event-read.js';
const input={scopeType:'workspace' as const,scopeId:'records',subjectType:'person' as const};
const page=()=>({protocol:'mgr-legacy-events-v1',tenantId:'tenant',actorId:'actor',...input,subjectId:null,eventTypes:['crm.create_contact.completed'],cursor:null,nextCursor:null,events:[]});
function fixture(hook:(auth:any)=>any=()=>page()){
 const auth={actorId:'actor',tenantId:'tenant',audience:'edge',scopes:['tools:read','legacy:events:read'],expiresAt:Date.now()+60000};let calls=0;
 const legacy=new LegacyEdgeClient({baseUrl:'https://fixture.invalid',bearerToken:'synthetic',fetcher:async(url,init)=>{calls++;assert.equal(new URL(String(url)).pathname,'/v1/events');assert.equal((init!.headers as any)['x-actor-id'],'actor');assert.equal((init!.headers as any)['x-tenant-id'],'tenant');return Response.json(hook(auth));}});return{auth,options:{auth,resourceAudience:'edge',legacy},calls:()=>calls};
}
test('event read binds verified principal and strict scoped input to domain route',async()=>{const f=fixture();assert.deepEqual(await readLegacyEvents(f.options,input),page());await assert.rejects(readLegacyEvents(f.options,{...input,actorId:'forged'}));assert.equal(f.calls(),1);});
for(const change of ['expiry','scope','actor','tenant'])test('event read withholds private result after '+change,async()=>{const f=fixture(a=>{if(change==='expiry')a.expiresAt=0;if(change==='scope')a.scopes=[];if(change==='actor')a.actorId='other';if(change==='tenant')a.tenantId='other';return page();});await assert.rejects(readLegacyEvents(f.options,input));assert.equal(f.calls(),1);});
test('wrong domain row/stream binding fails rather than reaching consumer',async()=>{const f=fixture(()=>({...page(),tenantId:'other'}));await assert.rejects(readLegacyEvents(f.options,input),/binding/);});
test('event read requires additional explicit scope before contacting service',async()=>{const f=fixture();f.auth.scopes=['tools:read'];await assert.rejects(readLegacyEvents(f.options,input));assert.equal(f.calls(),0);});

function eventWire(){return JSON.stringify({...page(),nextCursor:'signed-fixture-cursor',events:[{eventId:'fixture-event',eventType:'crm.create_contact.completed',eventVersion:1,occurredAt:'2026-10-29T00:00:00Z',actor:{actorType:'service',actorId:'actor',tenantId:'tenant'},scope:{tenantId:'tenant',scopeType:'workspace',scopeId:'records'},subject:{entityType:'person',entityId:'row'},source:'fixture',correlationId:'fixture',idempotencyKey:'fixture',data:{note:'WIRE_MARKER'},evidence:{}}]});}
function wireFixture(bytes:Uint8Array,split=false){const f=fixture();f.options.legacy=new LegacyEdgeClient({baseUrl:'https://fixture.invalid',fetcher:async()=>new Response(split?new ReadableStream<Uint8Array>({start(controller){for(const byte of bytes)controller.enqueue(Uint8Array.of(byte));controller.close();}}):new Uint8Array(bytes).buffer,{status:200})});return f;}
for(const [name,invalid]of [['isolated-byte',[255]],['truncated-sequence',[195]],['overlong-sequence',[192,175]],['surrogate-sequence',[237,160,128]]] as const)test('event transport refuses malformed UTF8 '+name+' before accepting rewritten private evidence',async()=>{
 const [start,end]=eventWire().split('WIRE_MARKER');const bytes=Buffer.concat([Buffer.from(start!),Buffer.from(invalid),Buffer.from(end!)]),f=wireFixture(bytes,true);
 await assert.rejects(readLegacyEvents(f.options,input));
});
test('event transport preserves valid Unicode split across byte chunks exactly',async()=>{
 const note='\u4f60\u597d \ud83c\udf0d',f=wireFixture(Buffer.from(eventWire().replace('WIRE_MARKER',note)),true),result=await readLegacyEvents(f.options,input);
 assert.equal(result.events[0]!.data.note,note);
});
test('event transport retains existing JSON BOM rejection rather than silently stripping bytes',async()=>{
 const f=wireFixture(Buffer.concat([Buffer.from([239,187,191]),Buffer.from(JSON.stringify(page()))]));await assert.rejects(readLegacyEvents(f.options,input));
});
