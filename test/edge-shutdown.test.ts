// Socket-free lifecycle fixtures; the real SDK handles actual Request objects.
import test from 'node:test';
import assert from 'node:assert/strict';
import {McpServer} from '@modelcontextprotocol/server';
import {createAuthorizedMgrMcpHttpHandler} from '../src/mcp-http.js';
import {LegacyEdgeClient} from '../src/legacy-client.js';
const audience='https://owned-shutdown.fixture.invalid/mcp';
const auth=()=>({subject:'owned-actor',tenantId:'owned-tenant',audience,scopes:['tools:read','legacy:events:read'],expiresAt:Date.now()+60000});
const request=()=>new Request(audience,{method:'POST',headers:{authorization:'Bearer owned-synthetic','content-type':'application/json',accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'owned-memory-only',version:'1'}}})});
async function status(result:Promise<Response>){const response=await result;await response.text();return response.status;}
function fixture(verify:()=>Promise<ReturnType<typeof auth>|null>,maximumPendingRequests?:number,read?:()=>Promise<Response>){let calls=0;const legacy=new LegacyEdgeClient({baseUrl:'https://never-dispatched.fixture.invalid',fetcher:async()=>{calls++;if(read)return read();throw Error('unexpected domain dispatch');}});return{handler:createAuthorizedMgrMcpHttpHandler({verifier:{verify},resourceAudience:audience,requiredScopes:['tools:read'],resourceMetadataUrl:'https://owned-shutdown.fixture.invalid/.well-known/oauth-protected-resource',legacy,...(maximumPendingRequests===undefined?{}:{maximumPendingRequests})}),calls:()=>calls};}
test('closed authenticated edge refuses a fresh request before verifier or SDK server construction',async()=>{
 let verifies=0,registrations=0;const original=McpServer.prototype.registerTool;McpServer.prototype.registerTool=function(this:McpServer,...args:any[]){registrations++;return Reflect.apply(original,this,args);} as typeof original;
 const f=fixture(async()=>{verifies++;return auth();});
 try{await f.handler.close();const response=await f.handler.fetch(request());assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'MCP service unavailable'});assert.equal(verifies,0);assert.equal(registrations,0);assert.equal(f.calls(),0);}finally{await f.handler.close();McpServer.prototype.registerTool=original;}
});
test('authentication released after completed close cannot construct or dispatch a new MCP server',async()=>{
 let release!:(value:ReturnType<typeof auth>)=>void,entered!:()=>void;const ready=new Promise<void>(resolve=>entered=resolve);let registrations=0;const original=McpServer.prototype.registerTool;McpServer.prototype.registerTool=function(this:McpServer,...args:any[]){registrations++;return Reflect.apply(original,this,args);} as typeof original;
 const f=fixture(()=>{entered();return new Promise(resolve=>release=resolve);});let pending:Promise<Response>|undefined;
 try{pending=f.handler.fetch(request());await ready;await f.handler.close();release(auth());const response=await pending;assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'MCP service unavailable'});assert.equal(registrations,0);assert.equal(f.calls(),0);}finally{release?.(auth());await pending?.catch(()=>{});await f.handler.close();McpServer.prototype.registerTool=original;}
});
test('fixed64 outer budget counts pending authentication before SDK construction and drains originals',async()=>{
 const releases:((value:ReturnType<typeof auth>)=>void)[]=[];let verifies=0,hold=true;const f=fixture(()=>{verifies++;return hold?new Promise(resolve=>releases.push(resolve)):Promise.resolve(auth());});
 const pending=Array.from({length:64},()=>f.handler.fetch(request()));
 try{assert.equal(verifies,64);const denied=await f.handler.fetch(request());assert.equal(denied.status,503);assert.deepEqual(await denied.json(),{error:'MCP service unavailable'});assert.equal(verifies,64);hold=false;for(const release of releases)release(auth());for(const response of await Promise.all(pending)){assert.equal(response.status,200);await response.text();}assert.equal(await status(f.handler.fetch(request())),200);assert.equal(verifies,65);assert.equal(f.calls(),0);}finally{for(const release of releases)release(auth());await Promise.allSettled(pending);await f.handler.close();}
});
test('trusted lower budget denial and invalid authentication release exactly their own admission slots',async()=>{
 const releases:((value:ReturnType<typeof auth>|null)=>void)[]=[];let verifies=0,hold=true;const f=fixture(()=>{verifies++;return hold?new Promise(resolve=>releases.push(resolve)):Promise.resolve(auth());},2),pending=[f.handler.fetch(request()),f.handler.fetch(request())];
 try{assert.equal(verifies,2);assert.equal(await status(f.handler.fetch(request())),503);assert.equal(verifies,2);for(const release of releases)release(null);for(const response of await Promise.all(pending))assert.equal(response.status,401);hold=false;assert.equal(await status(f.handler.fetch(request())),200);assert.equal(verifies,3);assert.equal(f.calls(),0);}finally{for(const release of releases)release(null);await Promise.allSettled(pending);await f.handler.close();}
});
test('outer slot remains held through actual SDK tool dispatch and final handler cleanup',async()=>{
 let release!:()=>void,entered!:()=>void,count=0;const ready=new Promise<void>(resolve=>entered=resolve),gate=new Promise<void>(resolve=>release=resolve);
 const f=fixture(async()=>auth(),2,async()=>{if(++count===2)entered();await gate;return Response.json({protocol:'mgr-legacy-events-v1',tenantId:'owned-tenant',actorId:'owned-actor',scopeType:'workspace',scopeId:'owned-records',subjectType:'person',subjectId:null,eventTypes:['crm.create_contact.completed'],cursor:null,nextCursor:null,events:[]});});
 const tool=()=>new Request(audience,{method:'POST',headers:{authorization:'Bearer owned-synthetic','content-type':'application/json',accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'mgr_legacy_events',arguments:{scopeType:'workspace',scopeId:'owned-records',subjectType:'person'}}})});
 const pending=[f.handler.fetch(tool()),f.handler.fetch(tool())];
 try{await Promise.race([ready,Promise.all(pending).then(()=>{throw Error('SDK must reach both held real tool callbacks');})]);assert.equal(f.calls(),2);assert.equal(await status(f.handler.fetch(request())),503);release();for(const response of await Promise.all(pending)){assert.equal(response.status,200);assert.doesNotMatch(await response.text(),/isError":true/);}assert.equal(await status(f.handler.fetch(request())),200);assert.equal(f.calls(),2);}finally{release();await Promise.allSettled(pending);await f.handler.close();}
});
test('closing is sticky and idempotent while an independent wrapper remains usable',async()=>{
 const f=fixture(async()=>auth()),other=fixture(async()=>auth());
 try{await Promise.all([f.handler.close(),f.handler.close()]);assert.equal(await status(f.handler.fetch(request())),503);assert.equal(await status(other.handler.fetch(request())),200);await f.handler.close();assert.equal(await status(f.handler.fetch(request())),503);}finally{await Promise.all([f.handler.close(),other.handler.close()]);}
});
test('host cannot disable or enlarge the fixed pending request ceiling',()=>{
 for(const limit of [0,-1,65,Infinity,NaN,1.5,true as unknown as number,null as unknown as number])assert.throws(()=>fixture(async()=>auth(),limit),/pending request limit/);
});
test('an actual verifier exception releases only its reservation without dispatch retry',async()=>{
 const failure=Error('owned verifier failure');let verifies=0;const f=fixture(async()=>{if(++verifies===1)throw failure;return auth();},1);
 try{await assert.rejects(f.handler.fetch(request()),error=>error===failure);assert.equal(await status(f.handler.fetch(request())),200);assert.equal(verifies,2);assert.equal(f.calls(),0);}finally{await f.handler.close();}
});
