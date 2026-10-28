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
// Every proof receives a new isolated database. Never enroll an existing owner's database.
const dbPath=resolve(root,"owner-isolated-"+randomUUID()+".sqlite");assert.equal(existsSync(dbPath),false);
let server:any,base="",dropNext=false;let dispatches=0;
const boundClient={async callTool(input:any){if(input.name==="mgr_department_execute")dispatches++;const response=await client.callTool(input);if(dropNext&&input.name==="mgr_department_execute"){dropNext=false;throw Error("deliberately discarded committed response");}return response;}};
async function open(enroll=false){const store=new ReignStore(dbPath);if(enroll){const h=new ExecutionCoordinator(store);h.enrollFreshHost(h.hostContext());}server=createRareServer({ownerToken,store,ecosystemWorkflowConfig:{client:boundClient,tenantId:legacy.tenantId,actorId:legacy.actorId}});await new Promise<void>(r=>server.listen(0,"127.0.0.1",r));base="http://127.0.0.1:"+server.address().port;}
async function closeOne(){server.closeAllConnections();await new Promise<void>(r=>server.close(r));}
async function owner(op:string,body:any,expected=200){const r=await fetch(base+"/api/ecosystem/workflows/"+op,{method:"POST",headers:{authorization:"Bearer "+ownerToken,"content-type":"application/json"},body:JSON.stringify(body)});const out=await r.json();assert.equal(r.status,expected,JSON.stringify(out));return out;}
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
 for(const command of commands){
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
 evidence.completedAt=new Date().toISOString();evidence.productionVerified=false;writeFileSync(resolve(evidenceDir,"RESULT.json"),JSON.stringify(evidence,null,2));console.log(JSON.stringify({passed:evidence.checks.length,total:evidence.checks.length,evidenceDir}));
}finally{if(server?.listening)await closeOne();await client.close();await edge.close();for(const child of children)child.kill();}
