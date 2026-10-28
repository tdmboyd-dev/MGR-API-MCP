import {readFileSync,writeFileSync,mkdirSync,existsSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {randomBytes,randomUUID} from "node:crypto";
import {spawn,execFileSync} from "node:child_process";
import {createLocalDepartmentEdge} from "../src/local-department-edge.js";
import {omniPolicy} from "../src/omnidev-client.js";
import {LegacyEdgeClient} from "../src/legacy-client.js";
import {Client,StreamableHTTPClientTransport} from "@modelcontextprotocol/client";

if(!process.argv[2])throw Error("Supply private isolated runtime directory. See docs/DEPARTMENT-INTEGRATION.md.");
const root=resolve(process.argv[2]),oneRoot=resolve(process.argv[3]??"../MGR-ONE");
const read=(name:string)=>JSON.parse(readFileSync(resolve(root,name),"utf8"));
const services=read("creation-signme-runtime.private.json"),voice=read("voice-runtime-private.json"),legacy=read("legacy/runtime.private.json");
// Engineering is explicit opt-in through a separate protected local config. No credentials enter a URL.
const omniPrivate=process.argv[4]?JSON.parse(readFileSync(resolve(process.argv[4]),"utf8")):undefined;
const omniConfig=omniPrivate?{baseUrl:omniPrivate.baseUrl,token:omniPrivate.engineeringToken,actorId:omniPrivate.actorId,tenantId:omniPrivate.tenantId,expectedPolicy:omniPolicy.parse(Object.fromEntries(["hostId","launcherSha256","runtimeSha256","qualificationDigest"].map(k=>[k,omniPrivate.workerPolicy?.[k]])))}:undefined;
if(omniConfig&&(omniConfig.actorId!==legacy.actorId||omniConfig.tenantId!==legacy.tenantId))throw Error("Engineering service principal must match isolated lab principal");
const dir=resolve(root,"owner-lab");mkdirSync(dir,{recursive:true,mode:0o700});
const statePath=resolve(dir,"owner.private.json");
if(!existsSync(statePath)){
 const state={kind:"isolated-department-lab",tenantId:legacy.tenantId,actorId:legacy.actorId,ownerToken:randomBytes(32).toString("hex"),dbPath:resolve(dir,"one-"+randomUUID()+".sqlite"),initialized:false};
 writeFileSync(statePath,JSON.stringify(state,null,2),{flag:"wx",mode:0o600});
}
if(process.platform==="win32")execFileSync("powershell.exe",["-NoProfile","-NonInteractive","-File",resolve(import.meta.dirname,"protect-local-owner.ps1"),"-ConfigPath",statePath],{windowsHide:true,stdio:["ignore","ignore","inherit"]});
const state=JSON.parse(readFileSync(statePath,"utf8"));
if(state.kind!=="isolated-department-lab"||state.actorId!==legacy.actorId||state.tenantId!==legacy.tenantId||resolve(state.dbPath).startsWith(dir+"\\")===false&&resolve(state.dbPath).startsWith(dir+"/")===false)throw Error("Local lab identity/path mismatch");
const {ReignStore}=await import(pathToFileURL(resolve(oneRoot,"web/durable-store.mjs")).href);
const {ExecutionCoordinator}=await import(pathToFileURL(resolve(oneRoot,"web/execution-coordinator.mjs")).href);
const {createRareServer}=await import(pathToFileURL(resolve(oneRoot,"web/server.mjs")).href);
// Owner-requested local brain configuration contains paths/model selections,
// never a copied account token. The official installed CLI keeps its own login.
const brainPath=resolve(dir,"brain-config.json");const brainOptions:any={};
if(existsSync(brainPath)){
 const brain=JSON.parse(readFileSync(brainPath,"utf8"));
 if(brain.provider!=="codex-cli-chatgpt"||brain.enabled!==true)throw Error("Unsupported explicit local brain configuration");
 const {createCodexConversationRuntime}=await import(pathToFileURL(resolve(oneRoot,"web/codex-conversation-runtime.mjs")).href);
 brainOptions.conversationRuntime=createCodexConversationRuntime(brain);
 if(!brainOptions.conversationRuntime.status().configured)throw Error("Local conversation brain is not configured");
 if(brain.localTextModel){const {createLocalModelRuntime}=await import(pathToFileURL(resolve(oneRoot,"web/local-model-runtime.mjs")).href);brainOptions.modelRuntime=createLocalModelRuntime({enabled:true,model:brain.localTextModel});}
}
const wasNew=!existsSync(state.dbPath);
if(!state.initialized&&!wasNew)throw Error("Interrupted initialization: inspect host enrollment; refusing automatic re-enrollment");
const store=new ReignStore(state.dbPath);
if(!state.initialized){const h=new ExecutionCoordinator(store);h.enrollFreshHost(h.hostContext());state.initialized=true;writeFileSync(statePath,JSON.stringify(state,null,2),{mode:0o600});}
const children:any[]=[];
for(const name of ["creation","signme"]){const s=services[name];const ready=await fetch(s.baseUrl+"/health",{headers:{authorization:"Bearer "+s.token}}).then(r=>r.ok).catch(()=>false);if(!ready){const child=spawn(s.command[0],s.command.slice(1),{cwd:s.cwd,env:{...process.env,...s.env},windowsHide:true,stdio:["ignore","ignore","ignore"]});children.push(child);}}
for(const name of ["creation","signme"]){const s=services[name];let ready=false;for(let n=0;n<60;n++){ready=await fetch(s.baseUrl+"/health",{headers:{authorization:"Bearer "+s.token}}).then(r=>r.ok).catch(()=>false);if(ready)break;await new Promise(r=>setTimeout(r,500));}if(!ready){for(const child of children)child.kill();store.close();throw Error(`Local ${name} did not become ready`);}}
const accessToken=randomBytes(32).toString("hex");
const edge=createLocalDepartmentEdge({port:17953,accessToken,expiresAt:Date.now()+8*3600000,tenantId:legacy.tenantId,actorId:legacy.actorId,legacy:new LegacyEdgeClient({baseUrl:`http://127.0.0.1:${legacy.port}`,bearerToken:legacy.apiToken,actorId:legacy.actorId}),creation:services.creation,signme:services.signme,voice,...(omniConfig?{omnidev:omniConfig}:{})});
await new Promise<void>(r=>edge.server.listen(17953,"127.0.0.1",r));
const client=new Client({name:"tevin-local-department-owner",version:"1.0.0"});await client.connect(new StreamableHTTPClientTransport(new URL(edge.baseUrl+"/mcp"),{authProvider:{token:async()=>accessToken}}));
const server=createRareServer({store,ownerToken:state.ownerToken,publicOrigin:"http://127.0.0.1:17954",ecosystemClient:client,ecosystemWorkflowConfig:{client,tenantId:legacy.tenantId,actorId:legacy.actorId,...(omniConfig?{omnidevExpectedPolicy:omniConfig.expectedPolicy}:{})},...brainOptions});
await new Promise<void>(r=>server.listen(17954,"127.0.0.1",r));
console.log(JSON.stringify({event:"isolated_tevin_departments_ready",url:"http://127.0.0.1:17954/departments",ownerCredentialFile:statePath,scope:"local PostgreSQL/SQLite/Kokoro integration; not production",expiresInHours:8}));
let stopping=false;async function stop(){if(stopping)return;stopping=true;server.closeAllConnections();await new Promise<void>(r=>server.close(r));await client.close();await edge.close();for(const c of children)c.kill();process.exit(0);}
for(const signal of ["SIGINT","SIGTERM"] as const)process.once(signal,()=>void stop());
