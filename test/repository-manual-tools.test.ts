import test from 'node:test';import assert from 'node:assert/strict';import {RepositoryReadGateway} from '../src/repository-read-tools.js';import type {McpServer} from '@modelcontextprotocol/server';
const audience='https://owned-manual.invalid/mcp';
function fixture(manualOnly=false){let active=true,root='C:/approved/forge',reads=0,checkoutUnavailable=false,hold:Promise<void>|undefined;const auth={actorId:'owner',tenantId:'tenant',audience,expiresAt:Date.now()+60000,scopes:['tools:read','repositories:read']},tools=new Map<string,any>();const gateway=new RepositoryReadGateway({bindings:manualOnly?[]:[{project:'backpack',root:'C:/backpack',actorId:'owner',tenantId:'tenant'}],...(!manualOnly?{backpack:{project:(id:string)=>({id,root:'C:/backpack'}),capabilityCard:()=>({}),context:()=>({})},registerSourceTools:()=>{}}:{}),assertCurrent:()=>{if(!active)throw Error('revoked');},manuals:{bindings:[{project:'forge',root,actorId:'owner',tenantId:'tenant'}],project:id=>{if(checkoutUnavailable)throw Error('manual-project-unavailable');return {id,root};},read:async id=>{reads++;await hold;return {project:id,kind:'manual-page',text:'Untrusted documented tool procedure'};}}});gateway.register({registerTool:(name:string,_def:any,fn:any)=>tools.set(name,fn)} as unknown as McpServer,auth,audience);return {auth,tools,get reads(){return reads;},revoke(){active=false;},rebind(){root='C:/changed';},disconnectCheckout(){checkoutUnavailable=true;},hold(p:Promise<void>){hold=p;},call:(project='forge')=>tools.get('mgr_repository_manual')({project,document:'index',startLine:1})};}
test('manual-only Forge binding reads knowledge without exposing a Backpack registration or execution method',async()=>{const f=fixture(true);assert.deepEqual([...f.tools.keys()],['mgr_repository_manual']);assert.notEqual((await f.call()).isError,true);assert.equal((await f.call('other')).isError,true);assert.equal(f.reads,1);assert.equal(f.tools.has('mgr_repository_execute'),false);});
test('tenant actor expiry scope and mid-read revocation/rebinding withhold manuals',async()=>{for(const mutation of [(f:any)=>f.auth.tenantId='foreign',(f:any)=>f.auth.actorId='foreign',(f:any)=>f.auth.expiresAt=0,(f:any)=>f.auth.scopes=['tools:read']]){const f=fixture();mutation(f);assert.equal((await f.call()).isError,true);assert.equal(f.reads,0);}for(const mutation of [(f:any)=>f.revoke(),(f:any)=>f.rebind(),(f:any)=>f.auth.actorId='changed']){const f=fixture();let release!:()=>void;f.hold(new Promise<void>(r=>release=r));const pending=f.call();await Promise.resolve();mutation(f);release();assert.equal((await pending).isError,true);}});

test('shared tool rejects an unpinned continuation before calling the owning reader',async()=>{
 const f=fixture(),call=f.tools.get('mgr_repository_manual');
 assert.equal((await call({project:'forge',document:'index',startLine:21})).isError,true);
 assert.equal(f.reads,0);
 assert.notEqual((await call({project:'forge',document:'index',startLine:21,expectedCommit:'a'.repeat(40)})).isError,true);
 assert.equal(f.reads,1);
});

test('manual revision recovery is disclosed only while the original binding remains current',async()=>{
 for(const revoked of [false,true]){
  const f=fixture();
  let rejectRead!:(error:Error)=>void;
  f.hold(new Promise<void>((_resolve,reject)=>{rejectRead=reject;}));
  const pending=f.call();
  if(revoked)f.revoke();
  rejectRead(Error('manual-source-changed'));
  const result=await pending;
  assert.equal(result.isError,true);
  assert.equal(result.content[0].text.includes('restart-manual-index'),!revoked);
 }
});

test('checkout recovery is scoped to the authorized binding and never returns manual content',async()=>{
 const f=fixture();
 f.disconnectCheckout();
 const result=await f.call();
 assert.equal(result.isError,true);
 assert.deepEqual(JSON.parse(result.content[0].text),{error:'manual-project-unavailable',recovery:'verify-enrolled-checkout'});
 assert.equal(f.reads,0);
 assert.doesNotMatch((await f.call('other')).content[0].text,/verify-enrolled-checkout/);
 f.revoke();
 assert.doesNotMatch((await f.call()).content[0].text,/verify-enrolled-checkout/);
});
