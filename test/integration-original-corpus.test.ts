import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:net';
import {randomBytes} from 'node:crypto';
import {RepositoryReadGateway} from '../src/repository-read-tools.js';
import {createLocalDepartmentEdge} from '../src/local-department-edge.js';
import {createOwnerDepartmentClient} from '../scripts/owner-department-client.js';
const cm=process.env.MGR_CODE_MONSTER_TEST_ROOT,one=process.env.MGR_ONE_TEST_ROOT,corpus=process.env.MGR_INTEGRATION_CORPUS;
test('actual Tevin owner SDK reads original licensed integration corpus within unchanged 12KB boundary',{skip:!cm||!one||!corpus,timeout:120000},async()=>{
 const load=(root:string,file:string)=>import(pathToFileURL(path.join(root,file)).href),[{registerSourceTools},{ReignStore},{ExecutionCoordinator},{createOwnerRepositoryConnection}]=await Promise.all([load(cm!,'src/mcp.mjs'),load(one!,'web/durable-store.mjs'),load(one!,'web/execution-coordinator.mjs'),load(one!,'web/owner-repository-connection.mjs')]);
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'mgr-original-owner-intake-')),database=path.join(base,'owner.sqlite'),git=(...args:string[])=>execFileSync('git',['-C',corpus!,...args],{encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim(),commit=git('rev-parse','HEAD'),sourceBefore=git('status','--porcelain');let edge:any,client:any,connection:any,store:any;
 try{
  const socket=createServer();await new Promise<void>(r=>socket.listen(0,'127.0.0.1',r));const port=(socket.address() as {port:number}).port;await new Promise<void>(r=>socket.close(()=>r()));
  const backpack={project:()=>({id:'corpus',root:corpus!}),capabilityCard:()=>({project:'corpus',status:'fixture-source',card:{id:'corpus',name:'Licensed internal corpus',purpose:'Source intake qualification',interfaces:[],evidence:[]}}),context:()=>({version:1,project:{id:'corpus'},tasks:[],memories:[]})};
  const repositories=new RepositoryReadGateway({backpack,bindings:[{project:'corpus',root:corpus!,actorId:'owned-actor',tenantId:'owned-tenant'}],assertCurrent:()=>{},registerSourceTools}),token=randomBytes(32).toString('hex');
  edge=createLocalDepartmentEdge({port,accessToken:token,expiresAt:Date.now()+120000,tenantId:'owned-tenant',actorId:'owned-actor',repositories});await new Promise<void>(r=>edge.server.listen(port,'127.0.0.1',r));client=createOwnerDepartmentClient({endpoint:edge.baseUrl+'/mcp',accessToken:token,tenantId:'owned-tenant',actorId:'owned-actor',assertCurrent:()=>{}});
  store=new ReignStore(database);store.enrollMemoryDeletionJournal(path.join(base,'memory.sqlite'));const coordinator=new ExecutionCoordinator(store);coordinator.enrollFreshHost(coordinator.hostContext());connection=await createOwnerRepositoryConnection({store,coordinator,client,projects:['corpus']});
  if(process.env.MGR_EXPECT_INTAKE_BASELINE==='1'){
   await assert.rejects(connection.read({operation:'automation',project:'corpus',symbol:''}),/owner-repository-read-unconfirmed/);console.log(JSON.stringify({baseline:'actual original corpus refused by existing 12000-byte owner limit',scope:'No limit or authorization changed.'}));return;
  }
  const items:any[]=[],sizes:number[]=[];let request:any={operation:'automation',project:'corpus',symbol:''};
  while(request){const result=await connection.read(request);assert.equal(result.data.commit,commit);sizes.push(Buffer.byteLength(JSON.stringify(result.data)));items.push(...result.data.items);request=result.data.nextRequest??null;assert(sizes.length<=4);}
  assert.equal(items.length,3);assert(sizes.every(n=>n<12000));assert.deepEqual(items.filter(x=>x.category==='n8n-workflow').map(x=>x.declarations.nodeDeclarations).sort((a,b)=>a-b),[10,88]);const catalog=items.find(x=>x.category==='provider-catalog').declarations;assert.equal(catalog.candidateRows,2233);assert.equal(catalog.providerVerified,false);assert.equal(catalog.externalCallsPerformed,0);assert.equal(git('status','--porcelain'),sourceBefore);
  const receipts=store.db.prepare("SELECT count(*) n FROM receipts WHERE json_extract(payload,'$.tool')='repository_read' AND json_extract(payload,'$.execution')='read-only-repository-evidence'").get().n;assert(receipts>=sizes.length);
  const evidence={sourceCommit:commit,checksPassed:6,pages:sizes.length,responseBytes:sizes,ownerBoundaryBytes:12000,items:items.length,nodes:[10,88],candidateDirectoryRows:catalog.candidateRows,savedReadReceipts:receipts,sourceUnchanged:true,scope:'Actual owner SDK/authenticated MCP/Git worker on original licensed research corpus; no live model, node/workflow activation or provider request.'};if(process.env.MGR_NAV_EVIDENCE_DIR){fs.mkdirSync(process.env.MGR_NAV_EVIDENCE_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.MGR_NAV_EVIDENCE_DIR,'original-owner-corpus.json'),JSON.stringify(evidence,null,2)+'\n');}console.log(JSON.stringify(evidence));
 }finally{connection?.close();await client?.close();await edge?.close();if(store?.db.isOpen)store.close();assert.equal(path.dirname(fs.realpathSync(base)),fs.realpathSync(os.tmpdir()));assert(path.basename(base).startsWith('mgr-original-owner-intake-'));fs.rmSync(base,{recursive:true,force:true,maxRetries:5,retryDelay:100});}
});
