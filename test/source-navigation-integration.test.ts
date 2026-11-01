import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createServer as netServer} from 'node:net';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {randomBytes} from 'node:crypto';
import {RepositoryReadGateway} from '../src/repository-read-tools.js';
import {createLocalDepartmentEdge} from '../src/local-department-edge.js';
import {createOwnerDepartmentClient} from '../scripts/owner-department-client.js';

const cm=process.env.MGR_CODE_MONSTER_TEST_ROOT,one=process.env.MGR_ONE_TEST_ROOT;
const load=(root:string,file:string)=>import(pathToFileURL(path.resolve(root,file)).href);
test('actual Tevin owner HTTP conversation -> shared SDK/TCP -> Code Monster compiler navigation -> saved SQL/restart', {skip:!cm||!one,timeout:120000},async t=>{
 const [{registerSourceTools},{ReignStore},{ExecutionCoordinator},{createOwnerRepositoryConnection},{createRareServer},{createConversationRuntime},{ModelDispatchHost}]=await Promise.all([
  load(cm!,'src/mcp.mjs'),load(one!,'web/durable-store.mjs'),load(one!,'web/execution-coordinator.mjs'),load(one!,'web/owner-repository-connection.mjs'),load(one!,'web/server.mjs'),load(one!,'web/conversation-runtime.mjs'),load(one!,'web/model-dispatch-host.mjs')
 ]);
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'mgr-native-navigation-')),source=path.join(base,'source'),db=path.join(base,'owner.sqlite');fs.mkdirSync(source);
 const git=(...a:string[])=>execFileSync('git',['-C',source,...a],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git('init','-q');git('config','user.name','Navigation integration fixture');git('config','user.email','fixture@example.invalid');git('config','core.autocrlf','false');
 fs.writeFileSync(path.join(source,'core.ts'),'export function useful(){return 1}\nexport function nested(){const useful=()=>2;return useful()}\n');
 fs.writeFileSync(path.join(source,'use.ts'),"import {useful as compute} from './core.js'; export const result=compute(); const text='useful()';\n");
 fs.writeFileSync(path.join(source,'screen.ts'),"import {result} from './use.js'; export const shown=result;\n");fs.writeFileSync(path.join(source,'page-core.ts'),'export function paginated(){return 1}\n');fs.writeFileSync(path.join(source,'page-use.ts'),"import {paginated} from './page-core.js';\n"+'paginated();\n'.repeat(7));git('add','.');git('commit','-qm','real navigation fixture');const commit=git('rev-parse','HEAD');
 let allowed=true,edge:any,client:any,connection:any,store:any,coordinator:any,ownerServer:any,modelCalls=0,toolCalls=0,origin='',selector='useful',requestedOperation='references';
 const checks:string[]=[],token=randomBytes(32).toString('hex'),ownerToken=randomBytes(32).toString('hex');
 const current=()=>{if(!allowed)throw Error('owned-repository-revoked');};
 const socket=netServer();await new Promise<void>(r=>socket.listen(0,'127.0.0.1',r));const port=(socket.address() as {port:number}).port;await new Promise<void>(r=>socket.close(()=>r()));
 const backpack={project:(id:string)=>({id,root:source}),capabilityCard:(id:string)=>({project:id,status:'fixture-source',card:{id,name:'Owned source',purpose:'Navigation fixture',interfaces:[],evidence:[]}}),context:(id:string)=>({version:1,project:{id,name:'Owned source',purpose:'Navigation fixture'},tasks:[],memories:[]})};
 const repositories=new RepositoryReadGateway({backpack,bindings:[{project:'source',root:source,actorId:'owned-actor',tenantId:'owned-tenant'}],assertCurrent:current,registerSourceTools});
 async function stopOne(){if(ownerServer){ownerServer.closeAllConnections();await new Promise<void>(r=>ownerServer.close(()=>r()));ownerServer=null;}connection?.close();if(store?.db.isOpen)store.close();}
 t.after(async()=>{await stopOne();await client?.close();await edge?.close();assert.equal(path.dirname(fs.realpathSync(base)),fs.realpathSync(os.tmpdir()));assert(path.basename(base).startsWith('mgr-native-navigation-'));fs.rmSync(base,{recursive:true,force:true});});
 edge=createLocalDepartmentEdge({port,accessToken:token,expiresAt:Date.now()+180000,tenantId:'owned-tenant',actorId:'owned-actor',repositories});await new Promise<void>(r=>edge.server.listen(port,'127.0.0.1',r));
 client=createOwnerDepartmentClient({endpoint:edge.baseUrl+'/mcp',accessToken:token,tenantId:'owned-tenant',actorId:'owned-actor',assertCurrent:current});
 const counted={async callToolWithContext(request:any,context:any){if(request.name.startsWith('code_monster_'))toolCalls++;return client.callToolWithContext(request,context);}};
 async function startOne(enroll:boolean){
  store=new ReignStore(db);if(enroll)store.enrollMemoryDeletionJournal(path.join(base,'memory-authority.sqlite'));coordinator=new ExecutionCoordinator(store);const hostContext=coordinator.hostContext();if(enroll)coordinator.enrollFreshHost(hostContext);
  if(!store.db.prepare('SELECT 1 FROM execution_roots WHERE id=?').get('navigation-zero-cost'))coordinator.createRoot(hostContext,{id:'navigation-zero-cost',currency:'USD',scale:6,ceiling:0});
  const host=new ModelDispatchHost({store,coordinator,hostContext,authorize:()=>true,policies:[{id:'navigation-fixture-policy',businessId:null,ownerId:'fixture-owner',policyVersion:'v1',provider:'openai',account:'fixture-no-provider',model:'navigation-fixture',purpose:'conversation',root:'navigation-zero-cost',maximumUnits:0,verifiedNoCharge:true,entitlement:()=>({allowed:true,provider:'openai',account:'fixture-no-provider',model:'navigation-fixture',reference:'injected-response-fixture-no-provider',verifiedNoCharge:true,observedAt:Date.now(),expiresAt:Date.now()+120000})}]});
  connection=await createOwnerRepositoryConnection({store,coordinator,client:counted,projects:['source']});
  const runtime=createConversationRuntime({enabled:true,model:'navigation-fixture',apiKey:'inert-fixture-not-a-provider-key',contextReads:true,dispatchAdmission:()=>host,fetcher:async(_url:any,options:any)=>{
   modelCalls++;const body=JSON.parse(options.body),output=body.input.filter((x:any)=>x.type==='function_call_output').at(-1);
   const items=output?[{type:'message',role:'assistant',content:[{type:'output_text',text:'Actual source result: '+JSON.stringify(JSON.parse(output.output).data.items?.map((x:any)=>x.path??x.source.path)??[])}]}]:[{type:'function_call',name:'repository_read',call_id:'navigation-call-'+modelCalls,arguments:JSON.stringify({operation:requestedOperation,project:'source',symbol:selector})}];
   return Response.json({id:'injected-response-'+modelCalls,status:'completed',output:items,usage:{input_tokens:1,output_tokens:1,total_tokens:2}});
  }});
  const answer=runtime.answer;runtime.answer=async(...args:any[])=>{try{return await answer(...args);}catch(error:any){console.log(JSON.stringify({fixtureConversationFailure:error.message,modelCalls,toolCalls}));throw error;}};
  ownerServer=createRareServer({store,ownerToken,modelDispatchHost:host,ownerRepositoryConnection:connection,conversationRuntime:runtime,modelEnvironment:{}});await new Promise<void>(r=>ownerServer.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+ownerServer.address().port;
 }
 const command=async(text:string,requestId:string)=>{const response=await fetch(origin+'/api/command',{method:'POST',headers:{authorization:'Bearer '+ownerToken,'content-type':'application/json'},body:JSON.stringify({text,requestId})});const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));return result as any;};
 await startOne(true);
 const symbols=await connection.read({operation:'symbols',project:'source',symbol:'useful'});selector=symbols.data.items.find((n:any)=>n.kind==='FunctionDeclaration').id;
 assert.equal(symbols.data.items.length,2);checks.push('real-Git-compiler-scoped-symbols');
 const references=await connection.read({operation:'references',project:'source',symbol:selector});assert.equal(references.data.resolution,'unique');assert.deepEqual(references.data.items.map((r:any)=>[r.name,r.source.path]),[['useful','use.ts'],['compute','use.ts']]);assert.equal(references.data.commit,commit);checks.push('actual-owner-SDK-TCP-bound-references');
 const impact=await connection.read({operation:'impact',project:'source',symbol:selector});assert.deepEqual(impact.data.items.map((r:any)=>r.path),['core.ts','use.ts','screen.ts']);assert.equal(impact.data.items[2].reason,'conservative-module-dependent');checks.push('actual-owner-SDK-TCP-labeled-impact');
 const pageSymbols=await connection.read({operation:'symbols',project:'source',symbol:'paginated'}),pageSelector=pageSymbols.data.items.find((n:any)=>n.kind==='FunctionDeclaration').id;const firstPage=await connection.read({operation:'references',project:'source',symbol:pageSelector});assert.equal(firstPage.data.totalMatches,7);assert.equal(firstPage.data.items.length,5);assert.ok(firstPage.data.nextRequest);const nextPage=await connection.read(firstPage.data.nextRequest);assert.equal(nextPage.data.items.length,2);assert.equal(nextPage.data.nextOffset,null);assert.equal(new Set([...firstPage.data.items,...nextPage.data.items].map((r:any)=>r.source.start)).size,7);checks.push('owner-reference-pages-preserve-all-bound-sites');
 const first=await command('Find the actual uses of the selected function.','native-navigation-conversation-001');assert.match(first.message,/use.ts/);checks.push('actual-owner-HTTP-conversation-dispatch');
 const callsBeforeReplay=modelCalls,sourceCallsBeforeReplay=toolCalls;await command('Find the actual uses of the selected function.','native-navigation-conversation-001');assert.equal(modelCalls,callsBeforeReplay);assert.equal(toolCalls,sourceCallsBeforeReplay);checks.push('exact-conversation-replay-no-redispatch');
 await stopOne();await startOne(false);
 const saved=await fetch(origin+'/api/conversation-result?requestId=native-navigation-conversation-001',{headers:{authorization:'Bearer '+ownerToken}});const reopened=await saved.json() as any;assert.equal(saved.status,200,JSON.stringify(reopened));assert.equal(reopened.message,first.message);assert.equal(reopened.newModelRequests,0);assert.equal(modelCalls,callsBeforeReplay);checks.push('actual-owner-SQL-reopen-saved-answer-no-model-call');
 requestedOperation='impact';const second=await command('Show the potential affected files.','native-navigation-conversation-002');assert.match(second.message,/screen.ts/);checks.push('actual-conversation-impact-after-owner-reopen');
 for(const operation of ['references','impact'])await assert.rejects(connection.read({operation,project:'source',symbol:selector,root:source}));checks.push('caller-root-injection-denied');
 const successes=()=>store.db.prepare("SELECT count(*) n FROM receipts WHERE json_extract(payload,'$.tool')='repository_read' AND json_extract(payload,'$.execution')='read-only-repository-evidence'").get().n;const beforeDenied=successes();allowed=false;await assert.rejects(connection.read({operation:'impact',project:'source',symbol:selector}));assert.equal(successes(),beforeDenied);allowed=true;checks.push('revocation-withholds-success-receipt');
 fs.writeFileSync(path.join(source,'core.ts'),'export function changed(){return 9}\n');git('add','.');git('commit','-qm','changed source');const stale=await connection.read({operation:'references',project:'source',symbol:selector});assert.equal(stale.data.resolution,'not-found');assert.notEqual(stale.data.commit,commit);checks.push('changed-commit-refuses-stale-declaration-identity');await assert.rejects(connection.read(firstPage.data.nextRequest),/source-changed/);checks.push('source-changed-refuses-mixed-commit-continuation');
 assert.equal(git('status','--porcelain'),'');checks.push('source-worktree-unchanged-by-all-reads');
 const evidence={observedAt:new Date().toISOString(),checks,passed:checks.length,scope:'Actual ONE HTTP/conversation/SQLite -> official owner SDK -> authenticated loopback edge -> real Code Monster compiler/worker; injected model responses and local service identity, no live provider or production claim',modelCalls,sourceCalls:toolCalls,commit};
 if(process.env.MGR_NAV_EVIDENCE_DIR){fs.mkdirSync(process.env.MGR_NAV_EVIDENCE_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.MGR_NAV_EVIDENCE_DIR,'real-integration.json'),JSON.stringify(evidence,null,2)+'\n');}console.log(JSON.stringify(evidence));
});
