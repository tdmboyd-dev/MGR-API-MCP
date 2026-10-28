/** Actual opt-in local qualification. Never creates candidates or changes worker policy.
 * Args: private engineering config, held-job state, ONE checkout, brain config,
 * isolated run directory, public evidence directory. Credentials never enter evidence.
 */
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import {createLocalDepartmentEdge} from '../src/local-department-edge.js';
import {LegacyEdgeClient} from '../src/legacy-client.js';
import {omniPolicy} from '../src/omnidev-client.js';

const [configPath,statePath,onePath,brainPath,runPath,evidencePath,supplementalPath]=process.argv.slice(2);
if(!evidencePath)throw Error('Pass six explicit paths; see script header');
const read=(p:string)=>JSON.parse(readFileSync(resolve(p),'utf8'));
const cfg=read(configPath!),held=read(statePath!),brain=read(brainPath!),one=resolve(onePath!),run=resolve(runPath!),out=resolve(evidencePath!);
assert.equal(brain.provider,'codex-cli-chatgpt');assert.equal(brain.enabled,true);
mkdirSync(run,{recursive:true});mkdirSync(out,{recursive:true});
const dbPath=join(run,'one-'+randomUUID()+'.sqlite');assert.equal(existsSync(dbPath),false);
const policy=omniPolicy.parse(Object.fromEntries(Object.keys(omniPolicy.shape).map(k=>[k,cfg.workerPolicy[k]])));
const {createRareServer}=await import(pathToFileURL(join(one,'web/server.mjs')).href);
const {ReignStore}=await import(pathToFileURL(join(one,'web/durable-store.mjs')).href);
const {ExecutionCoordinator}=await import(pathToFileURL(join(one,'web/execution-coordinator.mjs')).href);
const {createCodexConversationRuntime}=await import(pathToFileURL(join(one,'web/codex-conversation-runtime.mjs')).href);
const runtime=createCodexConversationRuntime({...brain,workDir:join(run,'brain-sandbox')});
const accessToken=randomBytes(32).toString('hex'),ownerToken=randomBytes(32).toString('hex');
const endpoint={baseUrl:'http://127.0.0.1:1',token:randomBytes(32).toString('hex')};
// Only OmniDev is exercised. Other endpoints are explicitly unavailable in this isolated proof.
const edge=createLocalDepartmentEdge({port:18153,accessToken,expiresAt:Date.now()+3600000,actorId:cfg.actorId,tenantId:cfg.tenantId,creation:endpoint,voice:endpoint,signme:endpoint,legacy:new LegacyEdgeClient({baseUrl:endpoint.baseUrl}),omnidev:{baseUrl:cfg.baseUrl,token:cfg.engineeringToken,actorId:cfg.actorId,tenantId:cfg.tenantId,expectedPolicy:policy}});
const client=new Client({name:'tevin-actual-native-qualification',version:'1.0.0'});
let dispatches=0,server:any,base='',store:any;
const boundClient={async callTool(input:any){if(input.name==='mgr_department_execute')dispatches++;return client.callTool(input);}};
const evidence:any={scope:'Agent-driven authenticated owner HTTP, actual configured CLI model, MCP HTTP, real persisted job, qualified Windows native worker. No human click or whole-product/production acceptance claimed.',startedAt:new Date().toISOString(),checks:[],conversations:[],dbPath,workerPolicy:policy};
const save=()=>writeFileSync(join(out,'TEVIN-NATIVE-QUALIFICATION.json'),JSON.stringify(evidence,null,2)+'\n');
function check(name:string,value:boolean){assert.equal(value,true,name);evidence.checks.push({name,passed:true});save();console.log(JSON.stringify({check:name,passed:true}));}
async function open(enroll=false){store=new ReignStore(dbPath);if(enroll){const host=new ExecutionCoordinator(store);host.enrollFreshHost(host.hostContext());}server=createRareServer({store,ownerToken,conversationRuntime:runtime,ecosystemWorkflowConfig:{client:boundClient,tenantId:cfg.tenantId,actorId:cfg.actorId,omnidevExpectedPolicy:policy}});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;}
async function close(){server.closeAllConnections();await new Promise<void>(r=>server.close(r));server=null;}
async function owner(path:string,body?:any,expected=200){const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{authorization:'Bearer '+ownerToken,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(180000)});const value=await r.json();assert.equal(r.status,expected,JSON.stringify(value));return value;}
async function chat(label:string){const requestId='omni-chat-'+randomUUID();const response=await owner('/api/command',{requestId,text:`Please prepare verification of the existing OmniDev snapshot job. workspaceId=${held.workspaceId}; jobId=${held.jobs.tevin}. Use the connected omnidev.job.verify proposal tool. Let the host obtain all hashes. Do not apply code, create a candidate, or publish anything.`});evidence.conversations.push({label,requestId,response});save();check(label+' actual model returns exact existing-job proposal',response.departmentProposals?.length===1&&response.departmentProposals[0].command.operation==='omnidev.job.verify'&&response.departmentProposals[0].command.input.jobId===held.jobs.tevin);return {requestId,response};}
async function action(chatId:string,action:string){return owner('/api/ecosystem/conversation-action',{requestId:chatId,proposal:0,action});}
try{
 await new Promise<void>((r,reject)=>{edge.server.once('error',reject);edge.server.listen(18153,'127.0.0.1',r);});
 await client.connect(new StreamableHTTPClientTransport(new URL(edge.baseUrl+'/mcp'),{authProvider:{token:async()=>accessToken}}));
 await open(true);
 check('unauthenticated owner route denied',(await fetch(base+'/api/ecosystem/conversations/recent')).status===401);
 const first=await chat('manual approval');check('proposal does not execute or create authority',dispatches===0&&store.db.prepare('SELECT count(*) n FROM execution_grants').get().n===0);
 await action(first.requestId,'preview');await owner('/api/ecosystem/conversation-action',{requestId:first.requestId,proposal:0,action:'execute'},409);check('native dispatch denied before exact owner approval',dispatches===0);
 await action(first.requestId,'approve');let workflow=(await action(first.requestId,'execute')).workflow;
 for(let i=0;i<120&&['pending','unknown'].includes(workflow.state);i++){await new Promise(r=>setTimeout(r,500));workflow=(await action(first.requestId,'status')).workflow;}
 evidence.workflow=workflow;save();check('actual native result accepted through ONE and MCP',workflow.state==='succeeded'&&workflow.result?.readbackVerified===true&&workflow.result?.currentBindingVerified===true);
 check('single native dispatch',dispatches===1);
 const artifact=(await action(first.requestId,'artifact')).artifact,bytes=Buffer.from(artifact.contentBase64,'base64');
 check('canonical report hash and byte count match',createHash('sha256').update(bytes).digest('hex')===artifact.sha256&&bytes.length===artifact.bytes);
 writeFileSync(join(out,'native-report.json'),bytes);evidence.artifact={sha256:artifact.sha256,bytes:artifact.bytes,reportId:artifact.reportId,assignmentId:artifact.assignmentId};save();
 await close();await open();const restored=await owner('/api/ecosystem/conversations/recent');
 const prior=restored.conversations.find((x:any)=>x.requestId===first.requestId);check('conversation reopens with historical currentness unverified',prior?.departmentProposals?.[0]?.workflow?.result?.currentBindingVerified===false);
 check('reopened status refreshes actual report',(await action(first.requestId,'status')).workflow.result.currentBindingVerified===true);
 check('reopened canonical bytes identical',(await action(first.requestId,'artifact')).artifact.contentBase64===artifact.contentBase64);
 await action(first.requestId,'execute');check('completed replay does not redispatch',dispatches===1);
 const grant=await owner('/api/ecosystem/delegations',{requestId:'grant-'+randomUUID(),scopes:[{operation:'omnidev.job.verify',workspaceId:held.workspaceId}],maximumActions:1,maximumCost:0,expires:Date.now()+3600000},201);
 const delegated=await chat('finite delegation');const proposal=delegated.response.departmentProposals[0];
 check('finite owner delegation automatically admits exact proposal',proposal.workflow?.delegationId===grant.delegation.id&&dispatches===2);
 let second=proposal.workflow;for(let i=0;i<120&&['pending','unknown'].includes(second.state);i++){await new Promise(r=>setTimeout(r,500));second=(await action(delegated.requestId,'status')).workflow;}
 check('delegated real report preserves same native assignment',second.state==='succeeded'&&second.result?.assignmentId===evidence.artifact.assignmentId);
 const exhausted=(await owner('/api/ecosystem/delegations')).delegations.find((x:any)=>x.id===grant.delegation.id);check('finite delegation exhausted after one child',exhausted.remainingActions===0&&exhausted.active===false);
 if(supplementalPath){
  const samples=read(supplementalPath).results;
  for(const kind of ['baseline-fails','running-cancel']){
   const sample=samples.find((x:any)=>x.kind===kind);assert.ok(sample);
   const command={operation:'omnidev.job.verify',requestId:'negative-'+randomUUID(),input:Object.fromEntries(['workspaceId','jobId','sourceDigest','candidateDigest','testManifestDigest'].map(k=>[k,sample.input[k]]))};
   const preview=await owner('/api/ecosystem/workflows/preview',{command},201);
   await owner('/api/ecosystem/workflows/approve',{requestId:command.requestId,digest:preview.digest});
   const result=await owner('/api/ecosystem/workflows/execute',{requestId:command.requestId,digest:preview.digest});
   if(kind==='baseline-fails'){
    check('real historical failed native report remains failed through ONE',result.state==='failed'&&result.result?.readbackVerified===true);
    const a=await owner('/api/ecosystem/workflows/artifact',{requestId:command.requestId});
    check('failed report download matches original accepted native hash',a.sha256===sample.status.reportSha256);
   }else{
    check('uncertain canceled job cannot become success or dispatch again',result.state==='unknown');
    const before=dispatches;await owner('/api/ecosystem/workflows/execute',{requestId:command.requestId,digest:preview.digest});check('unknown ONE replay only reconciles status',dispatches===before);
    await owner('/api/ecosystem/workflows/artifact',{requestId:command.requestId},409);check('unknown canceled job has no fabricated artifact',true);
   }
  }
  const canceled={...first.response.departmentProposals[0].command,requestId:'cancel-'+randomUUID()};
  await owner('/api/ecosystem/workflows/preview',{command:canceled},201);const before=dispatches;
  check('cancel before native admission settles without dispatch',(await owner('/api/ecosystem/workflows/cancel',{requestId:canceled.requestId})).state==='cancelled'&&dispatches===before);
  const stale={...canceled,requestId:'stale-'+randomUUID(),input:{...canceled.input,candidateDigest:'0'.repeat(64)}};
  await owner('/api/ecosystem/workflows/preview',{command:stale},409);check('changed candidate digest denied before approval and dispatch',dispatches===before);
 }
 evidence.delegation=exhausted;evidence.dispatches=dispatches;evidence.runtime=runtime.status();evidence.finishedAt=new Date().toISOString();save();
}catch(error){evidence.error=error instanceof Error?error.message:'qualification failed';save();throw error;}
finally{if(server)await close();await client.close().catch(()=>{});await edge.close();}
