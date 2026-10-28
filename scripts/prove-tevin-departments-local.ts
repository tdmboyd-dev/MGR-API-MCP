import {readFileSync,writeFileSync,mkdirSync,existsSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {randomBytes,randomUUID,createHash} from "node:crypto";
import {spawn} from "node:child_process";
import assert from "node:assert/strict";
import {Client,StreamableHTTPClientTransport} from "@modelcontextprotocol/client";
import {createLocalDepartmentEdge} from "../src/local-department-edge.js";
import {LegacyEdgeClient} from "../src/legacy-client.js";
import type {DepartmentCommand} from "../src/department-gateway.js";

const root=resolve(process.argv[2]??"");if(!process.argv[2])throw Error("Supply isolated runtime directory");
const oneRoot=resolve(process.argv[3]??"../MGR-ONE");
const read=(name:string)=>JSON.parse(readFileSync(resolve(root,name),"utf8"));
const services=read("creation-signme-runtime.private.json"),voice=read("voice-runtime-private.json"),legacy=read("legacy/runtime.private.json");
const evidenceDir=resolve(root,"tevin-owner-proof");mkdirSync(evidenceDir,{recursive:true});
const children=[];
for(const name of ["creation","signme"]){const s=services[name];const child=spawn(s.command[0],s.command.slice(1),{cwd:s.cwd,env:{...process.env,...s.env},windowsHide:true,stdio:["ignore","ignore","pipe"]});child.stderr.on("data",()=>{});children.push(child);}
const token=randomBytes(32).toString("hex"),ownerToken=randomBytes(32).toString("hex");
const edge=createLocalDepartmentEdge({port:17953,accessToken:token,expiresAt:Date.now()+3600000,tenantId:legacy.tenantId,actorId:legacy.actorId,legacy:new LegacyEdgeClient({baseUrl:`http://127.0.0.1:${legacy.port}`,bearerToken:legacy.apiToken,actorId:legacy.actorId}),creation:services.creation,signme:services.signme,voice});
const client=new Client({name:"tevin-owner-real-workflows",version:"1.0.0"});
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const evidence:any={kind:"Owner HTTP -> ONE anchored approvals and durable jobs -> actual MCP HTTP -> real local domain services",startedAt:new Date().toISOString(),checks:[],workflows:[]};
function check(name:string,value:boolean){assert.equal(value,true,name);evidence.checks.push({name,passed:true});}
const {createRareServer}=await import(pathToFileURL(resolve(oneRoot,"web/server.mjs")).href);
const {ReignStore}=await import(pathToFileURL(resolve(oneRoot,"web/durable-store.mjs")).href);
const {ExecutionCoordinator}=await import(pathToFileURL(resolve(oneRoot,"web/execution-coordinator.mjs")).href);
const {createConversationRuntime}=await import(pathToFileURL(resolve(oneRoot,"web/conversation-runtime.mjs")).href);
let modelStep=0,modelCommand:DepartmentCommand;
const conversationRuntime=createConversationRuntime({enabled:true,contextReads:false,model:"isolated-fixture",apiKey:"isolated-provider-fixture-not-a-live-key",fetcher:async()=>Response.json({id:"fixture-model-response",status:"completed",usage:{input_tokens:1,output_tokens:1,total_tokens:2},output:modelStep++===0?[{type:"function_call",name:"department_preview",call_id:"proposal-call",arguments:JSON.stringify({operation:modelCommand.operation,inputJson:JSON.stringify(modelCommand.input)})}]:[{type:"message",role:"assistant",content:[{type:"output_text",text:"Review the exact department proposal before approval."}]}]})});
// Every proof receives a new isolated database. Never enroll an existing owner's database.
const dbPath=resolve(root,"owner-isolated-"+randomUUID()+".sqlite");assert.equal(existsSync(dbPath),false);
let server:any,base="",dropNext=false;let dispatches=0;
const boundClient={async callTool(input:any){if(input.name==="mgr_department_execute")dispatches++;const response=await client.callTool(input);if(dropNext&&input.name==="mgr_department_execute"){dropNext=false;throw Error("deliberately discarded committed response");}return response;}};
async function open(enroll=false){const store=new ReignStore(dbPath);if(enroll){const h=new ExecutionCoordinator(store);h.enrollFreshHost(h.hostContext());}server=createRareServer({ownerToken,store,conversationRuntime,ecosystemWorkflowConfig:{client:boundClient,tenantId:legacy.tenantId,actorId:legacy.actorId}});await new Promise<void>(r=>server.listen(0,"127.0.0.1",r));base="http://127.0.0.1:"+server.address().port;}
async function closeOne(){server.closeAllConnections();await new Promise<void>(r=>server.close(r));}
async function owner(op:string,body:any,expected=200){const r=await fetch(base+"/api/ecosystem/workflows/"+op,{method:"POST",headers:{authorization:"Bearer "+ownerToken,"content-type":"application/json"},body:JSON.stringify(body)});const out=await r.json();assert.equal(r.status,expected,JSON.stringify(out));return out;}
async function authority(method:string,body?:any,expected=200){const r=await fetch(base+"/api/ecosystem/delegations",{method,headers:{authorization:"Bearer "+ownerToken,"content-type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});const out=await r.json();assert.equal(r.status,expected,JSON.stringify(out));return out;}
try{
 for(const name of ["creation","signme"]){const s=services[name];let ready=false;for(let n=0;n<60;n++){try{ready=(await fetch(s.baseUrl+"/health",{headers:{authorization:`Bearer ${s.token}`}})).ok;}catch{}if(ready)break;await sleep(500);}check(name+" actual service ready",ready);}
 await new Promise<void>(r=>edge.server.listen(17953,"127.0.0.1",r));
 await client.connect(new StreamableHTTPClientTransport(new URL(edge.baseUrl+"/mcp"),{authProvider:{token:async()=>token}}));
 await open(true);
 check("owner authentication required",(await fetch(base+"/api/ecosystem/workflows/status",{method:"POST",headers:{"content-type":"application/json"},body:'{"requestId":"none"}'})).status===401);
 check("owner UI actually served",(await fetch(base+"/departments")).ok);
 const prefix="owner-"+randomUUID();
 const commands:DepartmentCommand[]=[
 {operation:"legacy.contact.create",requestId:prefix+"-legacy",input:{displayName:"Tevin owner workflow",email:"owner-workflow@example.invalid"}},
 {operation:"creation.document.render",requestId:prefix+"-creation",input:{workspaceId:"ecosystem-proof",title:"Tevin owner approved document",sections:[{heading:"Evidence",body:"Requested through ONE owner HTTP with exact approval and real domain persistence."}],rightsRefs:["owner-authored"]}},
 {operation:"signme.draft.create",requestId:prefix+"-signme",input:{workspaceId:"ecosystem-proof",title:"Tevin owner approved draft",content:"An actual immutable unsigned document, created through ONE's permission gateway."}},
 {operation:"voice.speech",requestId:prefix+"-voice",input:{sessionId:prefix,turnId:"turn-one",text:"Tevin completed an owner approved voice workflow.",profileId:"af_heart",exactText:true}}
 ];
 for(let index=0;index<commands.length;index++){
  let command=commands[index]!;modelCommand=command;modelStep=0;const beforeProposal=dispatches;
  const proposalResponse=await fetch(base+"/api/command",{method:"POST",headers:{authorization:"Bearer "+ownerToken,"content-type":"application/json"},body:JSON.stringify({requestId:"chat-"+randomUUID(),text:"Prepare an exact "+command.operation+" proposal for my review."})});
  const proposalBody=await proposalResponse.json();assert.equal(proposalResponse.status,200,JSON.stringify(proposalBody));
  const proposal=proposalBody.departmentProposals?.[0];check(command.operation+" main chat produces owner review proposal without dispatch",proposal?.command?.operation===command.operation&&dispatches===beforeProposal);
  assert.deepEqual(proposal.command.input,command.input);command=proposal.command;commands[index]=command;
  const preview=await owner("preview",{command},201);
  await owner("execute",{requestId:command.requestId,digest:preview.digest},409);check(command.operation+" dispatch denied before approval",true);
  await owner("approve",{requestId:command.requestId,digest:"0".repeat(64)},409);check(command.operation+" changed approval denied",true);
  await owner("approve",{requestId:command.requestId,digest:preview.digest});
  const before=dispatches;
  if(command.operation==="legacy.contact.create")dropNext=true;
  let result=await owner("execute",{requestId:command.requestId,digest:preview.digest});
  if(command.operation==="legacy.contact.create"){check("lost committed Legacy response remains unknown",result.state==="unknown");await closeOne();await open();result=await owner("execute",{requestId:command.requestId,digest:preview.digest});check("restart reconciles Legacy without redispatch",dispatches===before+1);}
  for(let n=0;n<90&&["pending","unknown"].includes(result.state);n++){await sleep(1000);result=await owner("status",{requestId:command.requestId});}
  check(command.operation+" completed with independently verified persisted readback",result.state==="succeeded"&&result.result?.readbackVerified===true);
  const replay=await owner("execute",{requestId:command.requestId,digest:preview.digest});check(command.operation+" completed replay performs no dispatch",replay.state==="succeeded"&&dispatches===before+1);
  let artifact:any;
  if(command.operation==="voice.speech"||command.operation==="creation.document.render"){
   const a=await owner("artifact",{requestId:command.requestId});const bytes=Buffer.from(a.contentBase64,"base64");check(command.operation+" owner download bytes match SHA256",createHash("sha256").update(bytes).digest("hex")===a.sha256&&bytes.length===a.bytes);const name=command.operation==="voice.speech"?"tevin-owner-speech.wav":"tevin-owner-document.md";writeFileSync(resolve(evidenceDir,name),bytes);artifact={...a,file:name};delete artifact.contentBase64;
  }
  await closeOne();await open();check(command.operation+" terminal result survives owner server/database reopen",(await owner("status",{requestId:command.requestId})).state==="succeeded");
  evidence.workflows.push({command,preview,result,replay,artifact});
 }
 const speech=commands.find(c=>c.operation==="voice.speech")!;
 const cancellation={...speech,requestId:prefix+"-cancel"};
 const cancelPreview=await owner("preview",{command:cancellation},201);await owner("approve",{requestId:cancellation.requestId,digest:cancelPreview.digest});
 await owner("execute",{requestId:cancellation.requestId,digest:cancelPreview.digest});
 const cancelled=await owner("cancel",{requestId:cancellation.requestId});
 const cancellationStatus=await owner("status",{requestId:cancellation.requestId});
 check("actual queued/running VOICE cancellation reaches cancelled receipt",cancellationStatus.state==="cancelled");
 await owner("artifact",{requestId:cancellation.requestId},409);check("cancelled speech cannot publish a late artifact",true);
 evidence.cancellation={cancelled,cancellationStatus};
 // Explicit owner policy is the only authority source. Real department effects
 // run through the same conversation parser, anchored child grants and MCP edge.
 const scopes=[{operation:"legacy.contact.create"},{operation:"creation.document.render",workspaceId:"ecosystem-proof"},{operation:"signme.draft.create",workspaceId:"ecosystem-proof"},{operation:"voice.speech",sessionId:prefix}];
 const grantBody={requestId:"grant-"+randomUUID(),scopes,maximumActions:4,maximumCost:0,expires:Date.now()+3600000};
 const issued=await authority("POST",grantBody,201);check("owner grants exact four-operation authority",issued.delegation.active===true);
 const issuedReplay=await authority("POST",grantBody,201);check("owner grant retry reuses exact policy",issuedReplay.delegation.id===issued.delegation.id);
 await closeOne();await open();check("owner policy survives database reopen",(await authority("GET")).delegations.some((x:any)=>x.id===issued.delegation.id&&x.active));
 for(const original of commands){
  modelCommand=original;modelStep=0;const requestId="chat-"+randomUUID(),before=dispatches;
  const r=await fetch(base+"/api/command",{method:"POST",headers:{authorization:"Bearer "+ownerToken,"content-type":"application/json"},body:JSON.stringify({requestId,text:"Prepare and complete the exact authorized department operation."})});
  let body=await r.json();assert.equal(r.status,200,JSON.stringify(body));const p=body.departmentProposals?.[0];
  check(original.operation+" automatically executes under owner delegation",Boolean(p?.workflow?.delegationId===issued.delegation.id&&dispatches===before+1));
  let workflow=p.workflow;for(let n=0;n<90&&["pending","unknown"].includes(workflow.state);n++){await sleep(1000);workflow=await owner("status",{requestId:p.command.requestId});}
  check(original.operation+" delegated result has real persisted readback",workflow.state==="succeeded"&&workflow.result?.readbackVerified===true);
  modelStep=0;const replayResponse=await fetch(base+"/api/command",{method:"POST",headers:{authorization:"Bearer "+ownerToken,"content-type":"application/json"},body:JSON.stringify({requestId,text:"Prepare and complete the exact authorized department operation."})});
  assert.equal(replayResponse.status,200);check(original.operation+" conversation replay never repeats effect",dispatches===before+1);
  evidence.workflows.push({mode:"owner-delegated",command:p.command,result:workflow,delegationId:issued.delegation.id});
 }
 const exhausted=(await authority("GET")).delegations.find((x:any)=>x.id===issued.delegation.id);check("exact four-action policy exhausts without extra authority",exhausted.usedActions===4&&!exhausted.active);
 await authority("DELETE",{id:issued.delegation.id});check("owner revocation persists",!(await authority("GET")).delegations.find((x:any)=>x.id===issued.delegation.id).active);
 const persistent=await authority("POST",{requestId:"persistent-"+randomUUID(),scopes:[scopes[1]],maximumActions:null,maximumCost:0,expires:null},201);
 check("owner can choose persistent and unlimited count without hidden cap",persistent.delegation.policy.maximumActions===null&&persistent.delegation.policy.expires===null&&persistent.delegation.active);
 modelCommand=commands.find(x=>x.operation==="signme.draft.create")!;modelStep=0;const beforeDenied=dispatches;
 const denied=await fetch(base+"/api/command",{method:"POST",headers:{authorization:"Bearer "+ownerToken,"content-type":"application/json"},body:JSON.stringify({requestId:"chat-"+randomUUID(),text:"Prepare SignMe outside the Creation-only authority."})});
 const deniedBody=await denied.json();check("different department cannot borrow owner authority",denied.status===200&&dispatches===beforeDenied&&!deniedBody.departmentProposals?.[0]?.workflow?.delegationId);
 await authority("DELETE",{id:persistent.delegation.id});
 evidence.completedAt=new Date().toISOString();evidence.productionVerified=false;evidence.modelProposalProof="Real ONE conversation parser/tool hook with fixture model Responses; no actual model-provider inference claim. The four domain services and Kokoro inference are real.";writeFileSync(resolve(evidenceDir,"RESULT.json"),JSON.stringify(evidence,null,2));console.log(JSON.stringify({passed:evidence.checks.length,total:evidence.checks.length,evidenceDir}));
}finally{if(server?.listening)await closeOne();await client.close();await edge.close();for(const child of children)child.kill();}
