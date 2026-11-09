/**
 * Optional cross-repo acceptance: official MCP client -> OAuth fixture ->
 * MGR API/MCP -> signed HTTP -> ACTUAL Code Monster service -> owned Git write.
 * The owner can run this against both source checkouts on one trusted host.
 * It creates its own synthetic test repo and NEVER edits a real MGR app repo.
 *
 * MGR_CODE_MONSTER_SOURCE_DIR=/path/to/MGR-CODE-MONSTER \
 *   node --import tsx scripts/verify-code-monster-actual-route.mjs
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import {createAuthorizedMgrMcpHttpHandler} from '../src/mcp-http.js';
import {CodeMonsterBridgeClient,codeMonsterActionDigest} from '../src/code-monster-client.js';
import {LegacyEdgeClient} from '../src/legacy-client.js';

const source=process.env.MGR_CODE_MONSTER_SOURCE_DIR;
if(!source)throw new Error('MGR_CODE_MONSTER_SOURCE_DIR must identify a real Code Monster checkout');
const {createCodeMonsterService,createOwnedNativeStageHandler}=await import(pathToFileURL(join(resolve(source),'src/rare-service.mjs')).href);
const git=(repo,...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8',timeout:10_000}).trim();
const scratch=mkdtempSync(join(tmpdir(),'mgr-real-rare-mcp-proof-'));
const repoRoot=join(scratch,'repo'),stateDirectory=join(scratch,'state'),portfolioPath=join(scratch,'portfolio.json');
mkdirSync(repoRoot);mkdirSync(stateDirectory);mkdirSync(join(repoRoot,'src'));mkdirSync(join(repoRoot,'test'));
git(repoRoot,'init','-q');git(repoRoot,'config','user.name','Acceptance');git(repoRoot,'config','user.email','fixture@example.invalid');
writeFileSync(join(repoRoot,'src/bug.mjs'),'export const add = (a,b) => a + 0;\n');
writeFileSync(join(repoRoot,'test/bug.test.mjs'),"import test from 'node:test';import assert from 'node:assert/strict';import {add} from '../src/bug.mjs';test('add 2 and 2',()=>assert.equal(add(2,2),4));\n");
git(repoRoot,'add','.');git(repoRoot,'commit','-qm','known baseline bug');
const expectedCommit=git(repoRoot,'rev-parse','HEAD');
writeFileSync(portfolioPath,JSON.stringify({version:1,status:'DISCOVERY_ONLY',observedDate:'2026-11-09',
  owner:'testowner',source:'cross-repo-fixture',purpose:'full internal route acceptance',
  repositories:[{name:'synthetic-bug',role:'app',branch:'main',sha:expectedCommit}]}));
let baselineFailed=false;
try{execFileSync(process.execPath,['--test'],{cwd:repoRoot,timeout:10_000,stdio:'pipe'});}catch{baselineFailed=true;}
assert.equal(baselineFailed,true,'baseline bug MUST reproduce before staging');

const secret=randomBytes(32);
const stageRepair=await createOwnedNativeStageHandler({repoRoot,expectedCommit,stateDirectory,
  approvedCommandSpec:{commandId:'synthetic-regression',executable:'node',args:['--test'],cwd:'.'}});
const codeMonsterService=createCodeMonsterService({secret,allowedTenantId:'owner-tenant',repoRoot,
  expectedCommit,portfolioPath,stageRepair});
const http=createServer(async(req,res)=>{
  try{
    const headers=new Headers();
    for(const [key,value] of Object.entries(req.headers)){
      if(Array.isArray(value))value.forEach(item=>headers.append(key,item));
      else if(value!==undefined)headers.set(key,value);
    }
    const chunks=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));
    const body=Buffer.concat(chunks);
    const url=new URL(req.url??'/',`http://127.0.0.1:${http.address().port}`);
    const init={method:req.method??'GET',headers,...(body.length?{body}:{})};
    const response=await apiHandler.fetch(new Request(url,init));
    res.statusCode=response.status;response.headers.forEach((v,k)=>res.setHeader(k,v));
    if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();
  }catch(error){res.statusCode=500;res.end(String(error));}
});
let apiHandler,client;
try{
  await new Promise(resolve=>codeMonsterService.listen(0,'127.0.0.1',resolve));
  await new Promise(resolve=>http.listen(0,'127.0.0.1',resolve));
  const apiAudience=`http://127.0.0.1:${http.address().port}/mcp`;
  const monsterUrl=`http://127.0.0.1:${codeMonsterService.address().port}/`;
  const codeMonster=new CodeMonsterBridgeClient({baseUrl:monsterUrl,secret});
  apiHandler=createAuthorizedMgrMcpHttpHandler({
    verifier:{async verify(token){return token==='owner'?{
      subject:'rare-test-user',tenantId:'owner-tenant',audience:apiAudience,
      scopes:['tools:read','tools:execute'],expiresAt:Date.now()+60_000}:null;}},
    resourceAudience:apiAudience,resourceMetadataUrl:`http://127.0.0.1:${http.address().port}/.well-known/oauth-protected-resource`,
    requiredScopes:['tools:read'],
    legacy:new LegacyEdgeClient({baseUrl:'https://legacy.example/',fetcher:async()=>new Response('{}')}),
    codeMonster,codeMonsterAllowedTenantId:'owner-tenant',
    codeMonsterApprovalResolver:{async resolve({approvalId,tenantId,actorId,actionDigest}){
      if(approvalId!=='owner-approval-fixture-001')return null;
      return {approvalId,tenantId,actorId,actionDigest,state:'approved',expiresAt:Date.now()+60_000};
    }}
  });
  client=new Client({name:'rare-real-route-evidence',version:'1.0.0'});
  await client.connect(new StreamableHTTPClientTransport(new URL(apiAudience),{
    authProvider:{token:async()=> 'owner'}
  }));
  const parse=result=>{
    const block=result.content?.find(x=>x.type==='text');
    if(!block)throw new Error('MCP response missing text');
    return JSON.parse(block.text);
  };
  const capabilities=parse(await client.callTool({name:'mgr_code_monster_capabilities',arguments:{}}));
  assert.equal(capabilities.accepted,true);
  assert.equal(capabilities.result.service,'mgr-code-monster');
  const search=parse(await client.callTool({name:'mgr_code_monster_code_search',arguments:{query:'add'}}));
  assert.equal(search.accepted,true);
  assert.equal(search.result.result.results[0].path,'src/bug.mjs');
  const args={campaignId:'cross-mcp-1',taskId:'fix-add',agentId:'code_monster',filePath:'src/bug.mjs',
    objective:'Correct reproduced add defect',oldText:'a + 0',newText:'a + b'};
  const denied=parse(await client.callTool({name:'mgr_code_monster_repair_stage',arguments:{approvalId:'not-approved',args}}));
  assert.equal(denied.state,'DENY');
  const stage=parse(await client.callTool({name:'mgr_code_monster_repair_stage',arguments:{
    approvalId:'owner-approval-fixture-001',args}}));
  assert.equal(stage.accepted,true,JSON.stringify(stage));
  const candidate=stage.result.result;
  assert.equal(candidate.state,'candidate-pending-independent-verification');
  assert.equal(candidate.ledgerValid,true);
  assert.equal(candidate.productionReady,false);
  assert.equal(git(repoRoot,'rev-parse','HEAD'),expectedCommit);
  assert.equal(git(repoRoot,'show','HEAD:src/bug.mjs'),'export const add = (a,b) => a + 0;');
  const candidateTree=join(scratch,'candidate');
  git(repoRoot,'worktree','add','--detach',candidateTree,candidate.candidateCommit);
  execFileSync(process.execPath,['--test'],{cwd:candidateTree,timeout:10_000,stdio:'pipe'});
  console.log(JSON.stringify({ok:true,verifiedRoute:'OFFICIAL_MCP_TO_ACTUAL_CODE_MONSTER_SIGNED_HTTP',
    sourceCommit:expectedCommit,candidateCommit:candidate.candidateCommit,
    baselineReproduced:true,candidateRegressionPassed:true,gitMainUnchanged:true,
    ledgerValid:true,productionReady:false,fixtureOnly:true,liveHostedRare:false}));
}finally{
  await client?.close().catch(()=>{});
  await apiHandler?.close().catch(()=>{});
  await new Promise(resolve=>http.close(()=>resolve()));
  await new Promise(resolve=>codeMonsterService.close(()=>resolve()));
  rmSync(scratch,{recursive:true,force:true});
}
