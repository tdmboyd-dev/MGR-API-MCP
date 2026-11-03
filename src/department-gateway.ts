import { createHash } from "node:crypto";
import * as z from "zod/v4";
import type { AuthContext } from "./authz.js";
import { authorizeTool } from "./authz.js";
import type { McpServer } from "@modelcontextprotocol/server";
import { legacyRequestDigest, type LegacyEdgeClient } from "./legacy-client.js";

import { OmniEngineeringClient, omniBindingInput, omniVerificationInput, type OmniClientConfig } from "./omnidev-client.js";
import {forgeDepartmentCommands,isForgeDepartmentCommand,ForgeDepartmentAdapter,type ForgeDepartmentConfig} from './forge-department.js';

const id=z.string().regex(/^[a-zA-Z0-9_.:-]{1,128}$/);
const content=z.string().min(1).max(10000).refine(value=>Buffer.from(value,'utf8').toString('utf8')===value&&value.trim().length>0);
const voiceId=z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
export const departmentCommand=z.discriminatedUnion("operation",[
  ...forgeDepartmentCommands,
  z.object({operation:z.literal("legacy.contact.create"),requestId:id,input:z.object({displayName:z.string().min(1).max(200),email:z.email().optional()}).strict()}).strict(),
  z.object({operation:z.literal("creation.document.render"),requestId:id,input:z.object({workspaceId:id,title:z.string().min(1).max(500),sections:z.array(z.object({heading:z.string().min(1).max(500),body:content}).strict()).min(1).max(10),rightsRefs:z.array(id).min(1).max(10)}).strict()}).strict(),
  z.object({operation:z.literal("voice.speech"),requestId:voiceId,input:z.object({sessionId:voiceId,turnId:voiceId,text:z.string().min(1).max(1500).refine(v=>v.trim().length>0),profileId:voiceId,exactText:z.literal(true)}).strict()}).strict(),
  z.object({operation:z.literal("omnidev.job.verify"),requestId:id,input:omniVerificationInput}).strict(),
  z.object({operation:z.literal("signme.draft.create"),requestId:id,input:z.object({workspaceId:id,title:z.string().min(1).max(500).refine(value=>Buffer.from(value,'utf8').toString('utf8')===value&&value.trim().length>0),content,documentId:id.optional(),expectedVersion:z.number().int().positive().optional()}).strict().refine(value=>(value.documentId!==undefined)===(value.expectedVersion!==undefined))}).strict()
]);
export type DepartmentCommand=z.infer<typeof departmentCommand>;
export interface DepartmentEndpoint {baseUrl:string;token:string}
export interface DepartmentGatewayConfig {tenantId:string;actorId:string;creation?:DepartmentEndpoint;voice?:DepartmentEndpoint;signme?:DepartmentEndpoint;legacy?:LegacyEdgeClient;legacyTenantId?:string;omnidev?:OmniClientConfig;forge?:ForgeDepartmentConfig;timeoutMs?:number;fetcher?:typeof fetch}
const digest=(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
export const canonicalDepartmentJson=(x:any):string=>x!==null&&typeof x==="object"?(Array.isArray(x)?`[${x.map(canonicalDepartmentJson).join(",")}]`:`{${Object.entries(x).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+":"+canonicalDepartmentJson(v)).join(",")}}`):JSON.stringify(x);
const inputDigest=(x:unknown)=>digest(Buffer.from(canonicalDepartmentJson(x)));
const dotSegment=(value:string)=>value==='.'||value==='..';
export class DepartmentGateway {
  private readonly omni:OmniEngineeringClient|undefined;
  private readonly forge:ForgeDepartmentAdapter|undefined;
  constructor(readonly config:DepartmentGatewayConfig){
    this.forge=config.forge?new ForgeDepartmentAdapter(config.forge,config.tenantId,config.actorId):undefined;
    if(config.omnidev&&(config.omnidev.actorId!==config.actorId||config.omnidev.tenantId!==config.tenantId))throw Error("Omni service principal must match gateway principal");
    this.omni=config.omnidev?new OmniEngineeringClient(config.omnidev):undefined;
    if(config.legacyTenantId!==undefined&&(!config.legacy||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(config.legacyTenantId)))throw Error("Legacy tenant binding invalid");
    if(!config.actorId.trim()||!config.tenantId.trim())throw Error("Department principal required");
    for(const endpoint of [config.creation,config.voice,config.signme]){
      if(!endpoint)continue;
      const u=new URL(endpoint.baseUrl);
      if(u.username||u.password||u.search||u.hash||u.pathname!=="/"||!(u.protocol==="https:"||(u.protocol==="http:"&&["127.0.0.1","[::1]"].includes(u.hostname))))throw Error("Department endpoint must be HTTPS or explicit loopback, with no URL credentials/path");
      if(endpoint.token.trim().length<24)throw Error("Scoped department credential required");
    }
  }
  authorize(auth:AuthContext,audience:string,write=false){
    authorizeTool(auth,audience,[write?"departments:execute":"departments:read"]);
    if(auth.actorId!==this.config.actorId||auth.tenantId!==this.config.tenantId)throw Error("Department principal mismatch");
  }
  private async request(service:"creation"|"voice"|"signme",path:string,body?:unknown,raw=false):Promise<any>{
    const ep=this.config[service];if(!ep)throw Error(`Department ${service} not configured`);const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),this.config.timeoutMs??120000);
    try{
      const response=await (this.config.fetcher??fetch)(new URL(path,ep.baseUrl),{method:body===undefined?"GET":"POST",redirect:"error",signal:controller.signal,headers:{authorization:`Bearer ${ep.token}`,"content-type":"application/json","x-tenant-id":this.config.tenantId,"x-actor-id":this.config.actorId},...(body===undefined?{}:{body:JSON.stringify(body)})});
      const limit=raw?8*1024*1024:1024*1024;const chunks:Uint8Array[]=[];let length=0;
      if(response.body){const reader=response.body.getReader();try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();throw Error("Department response exceeds limit");}chunks.push(value);}}finally{reader.releaseLock();}}
      if(!response.ok)throw Error(`Department ${service} returned HTTP ${response.status}`);
      const bytes=Buffer.concat(chunks);if(raw)return {bytes,mediaType:response.headers.get("content-type")};
      try{return JSON.parse(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes));}catch{throw Error(`Department ${service} returned invalid JSON`);}
    }catch(error){if(controller.signal.aborted)throw Error(`Department ${service} timed out; reconcile request before retry`);throw error;}finally{clearTimeout(timer);}
  }
  private async identifierLookupCapability(service:'creation'|'signme'){const health=await this.request(service,'/health');if(health.identifierLookupVersion!==1||health.tenantId!==this.config.tenantId||health.actorId!==this.config.actorId)throw Error('Native exact-identifier lookup capability is unavailable');}
  private signMeOperation(requestId:string){return dotSegment(requestId)?this.request('signme','/v1/documents/operations/read',{requestId}):this.request('signme',`/v1/documents/operations/${encodeURIComponent(requestId)}`);}
  private creationJob(requestId:string){return dotSegment(requestId)?this.request('creation','/v1/creation/jobs/read',{requestId}):this.request('creation',`/v1/creation/jobs/${encodeURIComponent(requestId)}`);}
  async candidateBinding(input:z.infer<typeof omniBindingInput>){if(!this.omni)throw Error("Omni engineering service not configured");return this.omni.binding(input);}
  async resume(command:DepartmentCommand,preDispatch?:()=>void){
    const c=departmentCommand.parse(command);
    if(c.operation!=="creation.document.render")throw Error("Only accepted native Markdown jobs support explicit resume");
    preDispatch?.();
    // Read and verify the original immutable request before continuing the SAME
    // accepted domain job. No new /jobs dispatch and no transport retry.
    const current=await this.status(c);
    preDispatch?.();
    if(current.status!=="QUEUED")return current;
    const result=dotSegment(c.requestId)?await this.request('creation','/v1/creation/jobs/control',{requestId:c.requestId,action:'run'}):await this.request("creation",`/v1/creation/jobs/${encodeURIComponent(c.requestId)}/run`,{});
    return this.verifyCreation(c,result);
  }
  async forgeWorldContext(workspaceId:string){if(!this.forge)throw Error('Native Forge context not configured');return this.forge.worldContext(workspaceId);}
  async prepare(command:DepartmentCommand){const c=departmentCommand.parse(command);if(!isForgeDepartmentCommand(c)||!this.forge)throw Error('Native Forge preparation not configured');return this.forge.prepare(c);}
  async execute(command:DepartmentCommand,preDispatch?:()=>void){
    const c=departmentCommand.parse(command),p=this.config;
    if(isForgeDepartmentCommand(c)){if(!this.forge)throw Error('Forge department not configured');return this.forge.execute(c,preDispatch);}
    preDispatch?.();
    if(c.operation==="omnidev.job.verify"){if(!this.omni)throw Error("Omni engineering service not configured");return {...await this.omni.execute(c.requestId,c.input,preDispatch),operation:c.operation};}
    if(c.operation==="legacy.contact.create"){
      if(!p.legacy)throw Error("Department legacy not configured");
      const result=await p.legacy.execute({tenantId:p.legacyTenantId??p.tenantId,actorId:p.actorId,correlationId:c.requestId,idempotencyKey:c.requestId},{action:"crm.create_contact",payload:{firstName:c.input.displayName,...(c.input.email?{email:c.input.email}:{})}});
      if(!result.accepted||!result.receiptId)throw Error("Legacy did not confirm persisted contact");
      const confirmed=await this.status(c);
      if(!('receipt' in confirmed)||confirmed.receipt?.receiptId!==result.receiptId)throw Error("Legacy command receipt is not confirmed by exact readback");
      return {...confirmed,operation:c.operation,accepted:true,replayed:result.replayed??false,receiptId:result.receiptId};
    }
    if(c.operation==="creation.document.render"){
      if(dotSegment(c.requestId)){await this.identifierLookupCapability("creation");preDispatch?.();}
      const result=await this.request("creation","/v1/creation/jobs",this.creationRequest(c));
      return this.verifyCreation(c,result);
    }
    if(c.operation==="voice.speech")return this.verifyVoice(c,await this.request("voice","/v1/reign/speech",{requestId:c.requestId,...c.input}));
    if(dotSegment(c.requestId)||c.input.documentId!==undefined&&dotSegment(c.input.documentId)){await this.identifierLookupCapability("signme");preDispatch?.();}
    const result=await this.request("signme","/v1/documents/drafts",{requestId:c.requestId,...c.input});
    return this.verifySignMe(c,result);
  }
  private creationRequest(c:Extract<DepartmentCommand,{operation:"creation.document.render"}>){const {workspaceId,...payload}=c.input;return {requestId:c.requestId,tenantId:this.config.tenantId,workspaceId,capability:"document.markdown",input:{actorId:this.config.actorId,correlationId:c.requestId,payload},acceptanceCriteria:["nonempty durable Markdown artifact with matching SHA256"],maxCost:0};}
  private async readSignMeVersion(c:Extract<DepartmentCommand,{operation:"signme.draft.create"}>,result:any){
    if(result.requestId!==c.requestId||result.status!=="draft"||result.inputDigest!==inputDigest({actorId:this.config.actorId,tenantId:this.config.tenantId,requestId:c.requestId,...c.input})||!id.safeParse(result.documentId).success||!Number.isSafeInteger(result.version)||result.version<1||!id.safeParse(result.receiptId).success)throw Error("SignMe operation mismatch");
    if((c.input.documentId!==undefined&&result.documentId!==c.input.documentId)||result.version!==(c.input.expectedVersion===undefined?1:c.input.expectedVersion+1))throw Error("SignMe target or version mismatch");
    const document=dotSegment(result.documentId)?await this.request('signme','/v1/documents/read',{documentId:result.documentId,view:'snapshot',version:result.version}):await this.request("signme",`/v1/documents/${encodeURIComponent(result.documentId)}/versions/${result.version}`);
    if(document.tenantId!==this.config.tenantId||document.workspaceId!==c.input.workspaceId||document.documentId!==result.documentId||document.version!==result.version||document.title!==c.input.title||document.content!==c.input.content||digest(Buffer.from(document.content))!==result.sha256||Buffer.byteLength(document.content)!==result.bytes)throw Error("SignMe document readback mismatch");
    return document;
  }
  private async verifySignMe(c:Extract<DepartmentCommand,{operation:"signme.draft.create"}>,result:any){await this.readSignMeVersion(c,result);return {...result,operation:c.operation,status:"SUCCEEDED",readbackVerified:true};}
  private verifyVoice(c:Extract<DepartmentCommand,{operation:"voice.speech"}>,result:any){
    const body={requestId:c.requestId,sessionId:c.input.sessionId,turnId:c.input.turnId,text:c.input.text,profileId:c.input.profileId,exactText:true};
    if(result.requestId!==c.requestId||result.sessionId!==c.input.sessionId||result.turnId!==c.input.turnId||result.profileId!==c.input.profileId||result.exactText!==true||result.textSha256!==digest(Buffer.from(c.input.text))||result.inputSha256!==digest(Buffer.from(JSON.stringify(body)))||!["queued","running","succeeded","failed","cancelled","unknown"].includes(result.status))throw Error("Voice receipt input mismatch");
    return result;
  }
  private async readCreationArtifact(c:Extract<DepartmentCommand,{operation:"creation.document.render"}>,result:any){
    if(result.requestId!==c.requestId||result.inputDigest!==inputDigest(this.creationRequest(c)))throw Error("Creation request input mismatch");
    if(result.status!=="SUCCEEDED")return null;
    if(!Array.isArray(result.artifacts)||result.artifacts.length!==1)throw Error("Creation artifact count mismatch");
    const artifact=result.artifacts[0];
    id.parse(artifact.id);
    if(result.artifactRefs!==undefined&&(!Array.isArray(result.artifactRefs)||result.artifactRefs.length!==1||result.artifactRefs[0]!==artifact.id))
      throw Error("Creation artifact reference mismatch");
    const fetched=await this.request("creation",`/v1/creation/artifacts/${encodeURIComponent(artifact.id)}`,undefined,true);
    if(digest(fetched.bytes)!==artifact.sha256||fetched.bytes.length!==artifact.bytes)throw Error("Creation artifact readback mismatch");
    return fetched;
  }
  private async verifyCreation(c:Extract<DepartmentCommand,{operation:"creation.document.render"}>,result:any){
    const fetched=await this.readCreationArtifact(c,result);
    return {...result,operation:"creation.document.render",readbackVerified:fetched!==null};
  }
  async status(command:DepartmentCommand){
    const c=departmentCommand.parse(command);
    if(isForgeDepartmentCommand(c)){if(!this.forge)throw Error('Forge department not configured');return this.forge.status(c);}
    if(c.operation==="omnidev.job.verify"){if(!this.omni)throw Error("Omni engineering service not configured");return {...await this.omni.status(c.requestId,c.input),operation:c.operation};}
    if(c.operation==="legacy.contact.create"){
      const context={tenantId:this.config.legacyTenantId??this.config.tenantId,actorId:this.config.actorId,correlationId:c.requestId,idempotencyKey:c.requestId};
      const request={action:"crm.create_contact",payload:{firstName:c.input.displayName,...(c.input.email?{email:c.input.email}:{})}};
      if(!this.config.legacy)throw Error("Department legacy not configured");
      const receipts=await this.config.legacy.truthReceipts<any>(context.tenantId,{correlationId:c.requestId,actorId:context.actorId,action:request.action,limit:100},context);
      const receipt=receipts.find(r=>r.tenantId===context.tenantId&&r.scope?.tenantId===context.tenantId&&r.actor?.tenantId===context.tenantId&&r.actor?.actorId===context.actorId&&r.actor?.actorType==="service"&&r.action===request.action&&r.correlationId===c.requestId&&r.evidence?.idempotencyKey===c.requestId&&r.evidence?.requestDigest===legacyRequestDigest(context,request)&&r.status==="succeeded"&&typeof r.receiptId==="string");
      if(!receipt)return {requestId:c.requestId,status:"unknown"};
      const entityId=receipt.outcome?.result?.id;
      if(typeof entityId!=="string")throw Error("Legacy receipt has no persisted entity ID");
      const entity=await this.config.legacy.getEntity<any>(context,entityId);
      if(entity.id!==entityId||entity.attributes?.firstName!==c.input.displayName||(c.input.email&&entity.attributes?.email!==c.input.email))throw Error("Legacy entity readback mismatch");
      return {requestId:c.requestId,status:"SUCCEEDED",receipt,entity,readbackVerified:true};
    }
    if(c.operation==="creation.document.render")return this.verifyCreation(c,await this.creationJob(c.requestId));
    if(c.operation==="voice.speech"){
      const q=new URLSearchParams({sessionId:c.input.sessionId,turnId:c.input.turnId});
      const result=this.verifyVoice(c,await this.request("voice",`/v1/reign/speech/${encodeURIComponent(c.requestId)}?${q}`));
      if(result.status==="succeeded"){const a=await this.artifact(c);return {...result,readbackVerified:true,audio:{...result.audio,sha256:a.sha256,bytes:a.bytes}};}
      return result;
    }
    const result=await this.signMeOperation(c.requestId);
    return this.verifySignMe(c,result);
  }
  async artifact(command:DepartmentCommand){
    const c=departmentCommand.parse(command);
    if(isForgeDepartmentCommand(c)){if(!this.forge)throw Error('Forge department not configured');return this.forge.artifact(c);}
    if(c.operation==="signme.draft.create"){
      const result=await this.signMeOperation(c.requestId),document=await this.readSignMeVersion(c,result),bytes=Buffer.from(document.content,'utf8');
      return {requestId:c.requestId,documentId:document.documentId,version:document.version,sha256:digest(bytes),bytes:bytes.length,mediaType:'text/plain; charset=utf-8',contentBase64:bytes.toString('base64'),readbackVerified:true};
    }
    if(c.operation==="omnidev.job.verify"){if(!this.omni)throw Error("Omni engineering service not configured");return this.omni.artifact(c.requestId,c.input);}let fetched:any,expected:any;
    if(c.operation==="creation.document.render"){
      const artifact=await this.readCreationArtifact(c,await this.creationJob(c.requestId));
      if(!artifact)throw Error("Artifact unavailable");
      return {requestId:c.requestId,sha256:digest(artifact.bytes),bytes:artifact.bytes.length,mediaType:artifact.mediaType,contentBase64:artifact.bytes.toString("base64")};
    }else if(c.operation==="voice.speech"){
      const q=new URLSearchParams({sessionId:c.input.sessionId,turnId:c.input.turnId});const r=this.verifyVoice(c,await this.request("voice",`/v1/reign/speech/${encodeURIComponent(c.requestId)}?${q}`));if(r.status!=="succeeded"||!r.audio)throw Error("Audio unavailable");expected=r.audio;fetched=await this.request("voice",`/v1/reign/speech/${encodeURIComponent(c.requestId)}/audio?${q}`,undefined,true);
      if(fetched.bytes.toString("ascii",0,4)!=="RIFF"||fetched.bytes.toString("ascii",8,12)!=="WAVE")throw Error("Invalid WAV artifact");
    }else throw Error("Operation has no binary artifact");
    const sha256=digest(fetched.bytes);if(expected.sha256!==sha256||expected.bytes!==fetched.bytes.length)throw Error("Artifact integrity mismatch");
    return {requestId:c.requestId,sha256,bytes:fetched.bytes.length,mediaType:fetched.mediaType,contentBase64:fetched.bytes.toString("base64")};
  }
  async cancel(command:DepartmentCommand,preDispatch?:()=>void){
    const c=departmentCommand.parse(command);
    if(c.operation==="creation.document.render"){
      preDispatch?.();
      const current=await this.status(c);
      preDispatch?.();
      if(current.status!=="QUEUED"&&current.status!=="RUNNING")return current;
      const result=dotSegment(c.requestId)
        ?await this.request("creation","/v1/creation/jobs/control",{requestId:c.requestId,action:"cancel"})
        :await this.request("creation",`/v1/creation/jobs/${encodeURIComponent(c.requestId)}/cancel`,{});
      if(result.status!=="CANCELLED")throw Error("Creation cancellation unconfirmed");
      return this.verifyCreation(c,result);
    }
    if(c.operation==="omnidev.job.verify"){
      if(!this.omni)throw Error("Omni engineering service not configured");
      return {...await this.omni.cancel(c.requestId,c.input),operation:c.operation};
    }
    if(c.operation!=="voice.speech")throw Error("Department operation does not support native cancellation");
    return this.verifyVoice(c,await this.request("voice",`/v1/reign/speech/${encodeURIComponent(c.requestId)}/cancel`,{sessionId:c.input.sessionId,turnId:c.input.turnId}));
  }
}
export interface DepartmentToolOptions {auth:AuthContext;resourceAudience:string;gateway:DepartmentGateway}
class DepartmentAuthorityExpired extends Error {}
function departmentPublicationFence(options:DepartmentToolOptions,write=false){
  const auth=options.auth,gateway=options.gateway,config=gateway.config,expires=auth.expiresAt;
  const identity=()=>JSON.stringify([options.auth.actorId,options.auth.tenantId,options.auth.audience,options.resourceAudience,options.gateway.config.actorId,options.gateway.config.tenantId]);
  const original=identity();
  return ()=>{if(!Number.isFinite(auth.expiresAt)||auth.expiresAt<=Date.now())throw new DepartmentAuthorityExpired('Department authorization expired');if(options.auth!==auth||options.gateway!==gateway||gateway.config!==config||auth.expiresAt!==expires||identity()!==original)throw Error('Department original authority changed');gateway.authorize(auth,options.resourceAudience,write);};
}
export function registerDepartmentTools(server:McpServer,options:DepartmentToolOptions){
  server.registerTool('mgr_department_forge_context',{description:'Read the verified base world and native edit facts for this exact enrolled Forge workspace. No approval, creation or binary artifacts.',inputSchema:z.object({workspaceId:id}).strict()},async input=>{try{const current=departmentPublicationFence(options);current();const result=await options.gateway.forgeWorldContext(input.workspaceId);current();const text=JSON.stringify(result);current();return {content:[{type:'text',text}]};}catch{return {isError:true,content:[{type:'text',text:'{"error":"Forge world context unavailable","sideEffects":false}'}]};}});
  server.registerTool("mgr_department_context",{
    description:"Read the authenticated department gateway principal. No domain request or mutation; identity comes only from the verified session.",
    inputSchema:z.object({}).strict()
  },async()=>{
    try{
      options.gateway.authorize(options.auth,options.resourceAudience);
      const result={schemaVersion:1,tenantId:options.auth.tenantId,actorId:options.auth.actorId};
      options.gateway.authorize(options.auth,options.resourceAudience);
      return {content:[{type:"text",text:JSON.stringify(result)}]};
    }catch{return {isError:true,content:[{type:"text",text:JSON.stringify({error:"Department context unavailable",state:"unconfirmed"})}]};}
  });
  server.registerTool("mgr_omnidev_candidate_binding",{description:"Read current approved OmniDev snapshot candidate digests. No source, objectives or execution. Does not grant approval.",inputSchema:omniBindingInput},async input=>{
    try{options.gateway.authorize(options.auth,options.resourceAudience);const result=await options.gateway.candidateBinding(input);options.gateway.authorize(options.auth,options.resourceAudience);return {content:[{type:"text",text:JSON.stringify(result)}]};}
    catch(error){return {isError:true,content:[{type:"text",text:JSON.stringify({error:error instanceof Error?error.message:"Omni binding unavailable",state:"unconfirmed"})}]};}
  });
  for(const method of ["prepare","execute","status","artifact","cancel","resume"] as const){
    server.registerTool(`mgr_department_${method}`,{description:`${method} a bounded department operation. Identity is credential-bound. No signing, sending, arbitrary code or paid providers.`,inputSchema:departmentCommand},async input=>{
      try{const write=method==="execute"||method==="cancel"||method==="resume",current=departmentPublicationFence(options,write);current();const result=method==="execute"||method==="resume"||method==="cancel"?await options.gateway[method](input,current):await options.gateway[method](input);current();const text=JSON.stringify(result);current();return {content:[{type:"text",text}]};}
      catch(error){return {isError:true,content:[{type:"text",text:JSON.stringify({error:error instanceof DepartmentAuthorityExpired?'Department authorization expired; reconcile the original request':'Department outcome unconfirmed; reconcile the original request',state:"unconfirmed"})}]};}
    });
  }
}
