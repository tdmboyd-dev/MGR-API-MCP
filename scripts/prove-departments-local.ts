import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {resolve} from "node:path";
import {randomBytes,randomUUID,createHash} from "node:crypto";
import {spawn} from "node:child_process";
import assert from "node:assert/strict";
import {Client,StreamableHTTPClientTransport} from "@modelcontextprotocol/client";
import {createLocalDepartmentEdge} from "../src/local-department-edge.js";
import {LegacyEdgeClient} from "../src/legacy-client.js";
import type {DepartmentCommand} from "../src/department-gateway.js";

// Private config is supplied by the owner locally. Never copy it into evidence.
const root=resolve(process.argv[2]??"");if(!process.argv[2])throw Error("Supply isolated runtime directory");
const read=(name:string)=>JSON.parse(readFileSync(resolve(root,name),"utf8"));
const services=read("creation-signme-runtime.private.json"),voice=read("voice-runtime-private.json"),legacy=read("legacy/runtime.private.json");
const evidenceDir=resolve(root,"full-department-proof");mkdirSync(evidenceDir,{recursive:true});
const children=[];
for(const name of ["creation","signme"]){const s=services[name];const child=spawn(s.command[0],s.command.slice(1),{cwd:s.cwd,env:{...process.env,...s.env},windowsHide:true,stdio:["ignore","ignore","pipe"]});child.stderr.on("data",()=>{});children.push(child);}
const token=randomBytes(32).toString("hex"),expiresAt=Date.now()+3600000;
const edge=createLocalDepartmentEdge({port:17953,accessToken:token,expiresAt,tenantId:legacy.tenantId,actorId:legacy.actorId,legacy:new LegacyEdgeClient({baseUrl:`http://127.0.0.1:${legacy.port}`,bearerToken:legacy.apiToken,actorId:legacy.actorId}),creation:services.creation,signme:services.signme,voice});
const client=new Client({name:"tevin-real-department-proof",version:"1.0.0"});
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const evidence:any={kind:"actual local domain workflows; isolated service-token authorization; no production claim",startedAt:new Date().toISOString(),checks:[]};
function check(name:string,value:boolean){assert.equal(value,true,name);evidence.checks.push({name,passed:true});}
async function call(method:string,command:DepartmentCommand){const r=await client.callTool({name:`mgr_department_${method}`,arguments:command});const b=r.content.find(b=>b.type==="text");if(!b||b.type!=="text")throw Error("Missing MCP result");const out=JSON.parse(b.text);if(r.isError)throw Error(JSON.stringify(out));return out;}
try{
 for(const name of ["creation","signme"]){const s=services[name];let ready=false;for(let n=0;n<60;n++){try{ready=(await fetch(s.baseUrl+"/health",{headers:{authorization:`Bearer ${s.token}`}})).ok;}catch{}if(ready)break;await sleep(500);}check(name+" actual service ready",ready);}
 await new Promise<void>(r=>edge.server.listen(17953,"127.0.0.1",r));
 check("MCP missing bearer denied",(await fetch(edge.baseUrl+"/mcp",{method:"POST"})).status===401);
 await client.connect(new StreamableHTTPClientTransport(new URL(edge.baseUrl+"/mcp"),{authProvider:{token:async()=>token}}));
 const prefix="proof-"+randomUUID();
 const commands:DepartmentCommand[]=[
 {operation:"legacy.contact.create",requestId:prefix+"-legacy",input:{displayName:"Tevin isolated workflow",email:"workflow@example.invalid"}},
 {operation:"creation.document.render",requestId:prefix+"-creation",input:{workspaceId:"ecosystem-proof",title:"Tevin actual creation workflow",sections:[{heading:"Evidence",body:"Created through Tevin's governed MCP department edge."}],rightsRefs:["owner-authored"]}},
 {operation:"signme.draft.create",requestId:prefix+"-signme",input:{workspaceId:"ecosystem-proof",title:"Tevin integration draft",content:"Owner-authored isolated workflow verification. This is an unsigned draft."}},
 {operation:"voice.speech",requestId:prefix+"-voice",input:{sessionId:prefix,turnId:"turn-one",text:"Tevin is connected to the local M G R voice engine.",profileId:"af_heart",exactText:true}}
 ];
 evidence.workflows=[];
 for(const command of commands){
  const first=await call("execute",command);let status=await call("status",command);
  for(let n=0;n<120&&["queued","running"].includes(status.status);n++){await sleep(1000);status=await call("status",command);}
  check(command.operation+" persisted readback",["SUCCEEDED","succeeded","draft"].includes(status.status));
  const replay=await call("execute",command);check(command.operation+" exact replay",Boolean(replay.requestId===command.requestId||replay.correlationId===command.requestId));
  const changed=structuredClone(command);if(changed.operation==="voice.speech")changed.input.text+=" Changed";else if(changed.operation==="legacy.contact.create")changed.input.displayName+=" Changed";else changed.input.title+=" Changed";
  await assert.rejects(call("execute",changed));check(command.operation+" changed replay denied",true);
  let artifact:any;
  if(command.operation==="voice.speech"||command.operation==="creation.document.render"){
   const a=await call("artifact",command);const bytes=Buffer.from(a.contentBase64,"base64");check(command.operation+" independently hashed artifact",createHash("sha256").update(bytes).digest("hex")===a.sha256&&bytes.length===a.bytes);const name=command.operation==="voice.speech"?"tevin-real-kokoro.wav":"tevin-created-document.md";writeFileSync(resolve(evidenceDir,name),bytes);artifact={...a,file:name};delete artifact.contentBase64;
  }
  evidence.workflows.push({command,first,status,replay,artifact});
 }
 evidence.completedAt=new Date().toISOString();writeFileSync(resolve(evidenceDir,"RESULT.json"),JSON.stringify(evidence,null,2));console.log(JSON.stringify({passed:evidence.checks.length,total:evidence.checks.length,evidenceDir}));
}finally{await client.close();await edge.close();for(const child of children)child.kill();}
