import {createHash} from 'node:crypto';
import * as z from 'zod/v4';
const id=z.string().regex(/^[a-zA-Z0-9_.:-]{1,128}$/);
export const omniDigest=z.string().regex(/^[a-f0-9]{64}$/);
export const omniBindingInput=z.object({workspaceId:id,jobId:z.string().regex(/^(?:[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}|request-[a-f0-9]{64})$/)}).strict();
export const omniVerificationInput=omniBindingInput.extend({sourceDigest:omniDigest,candidateDigest:omniDigest,testManifestDigest:omniDigest}).strict();
export const omniPolicy=z.object({hostId:z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),launcherSha256:omniDigest,runtimeSha256:omniDigest,qualificationDigest:omniDigest}).strict();
export type OmniInput=z.infer<typeof omniVerificationInput>;
export type OmniPolicy=z.infer<typeof omniPolicy>;
export interface OmniClientConfig {baseUrl:string;token:string;actorId:string;tenantId:string;expectedPolicy:OmniPolicy;timeoutMs?:number;maxResponseBytes?:number;fetcher?:typeof fetch}
export const canonicalOmniJson=(x:unknown):string=>x!==null&&typeof x==='object'?(Array.isArray(x)?`[${x.map(canonicalOmniJson).join(',')}]`:`{${Object.entries(x).filter(([,v])=>v!==undefined).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>JSON.stringify(k)+':'+canonicalOmniJson(v)).join(',')}}`):JSON.stringify(x);
export const omniSha256=(x:string|Uint8Array)=>createHash('sha256').update(x).digest('hex');
const durableId=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=200&&v===v.trim()&&!/[\u0000-\u001f\u007f]/.test(v);
function boundedJson(bytes:Uint8Array):unknown{
 const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);let depth=0,quoted=false,escaped=false;
 for(const c of text){if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;}else if(c==='"')quoted=true;else if(c==='{'||c==='['){if(++depth>64)throw Error('JSON depth');}else if(c==='}'||c===']')depth--;}
 return JSON.parse(text);
}
const same=(a:unknown,b:unknown)=>canonicalOmniJson(a)===canonicalOmniJson(b);
export class OmniRequestError extends Error {constructor(message:string,readonly status?:number){super(message);}}
export class OmniEngineeringClient {
 readonly config:OmniClientConfig;
 constructor(config:OmniClientConfig){
  const u=new URL(config.baseUrl);
  if(u.username||u.password||u.search||u.hash||u.pathname!=='/'||!(u.protocol==='https:'||u.protocol==='http:'&&['127.0.0.1','[::1]'].includes(u.hostname)))throw Error('Omni endpoint must be HTTPS or explicit loopback root');
  if(config.token.trim().length<24||!id.safeParse(config.actorId).success||!id.safeParse(config.tenantId).success)throw Error('Omni scoped service principal required');
  if(config.timeoutMs!==undefined&&(!Number.isSafeInteger(config.timeoutMs)||config.timeoutMs<1||config.timeoutMs>120000))throw Error('Invalid Omni deadline');
  if(config.maxResponseBytes!==undefined&&(!Number.isSafeInteger(config.maxResponseBytes)||config.maxResponseBytes<1||config.maxResponseBytes>1048576))throw Error('Invalid Omni response budget');
  this.config=Object.freeze({...config,expectedPolicy:Object.freeze(omniPolicy.parse(config.expectedPolicy))});
 }
 private async request(path:string,body?:unknown):Promise<any>{
  const controller=new AbortController();let rejectDeadline:(error:Error)=>void=()=>{};
  const deadline=new Promise<never>((_,reject)=>{rejectDeadline=reject;});
  const timer=setTimeout(()=>{controller.abort();rejectDeadline(new OmniRequestError('Omni timed out; reconcile request before retry'));},this.config.timeoutMs??15000);
  const operation=async()=>{
   const response=await (this.config.fetcher??fetch)(new URL(path,this.config.baseUrl),{method:body===undefined?'GET':'POST',redirect:'error',signal:controller.signal,headers:{authorization:'Bearer '+this.config.token,'content-type':'application/json','x-actor-id':this.config.actorId,'x-tenant-id':this.config.tenantId},...(body===undefined?{}:{body:JSON.stringify(body)})});
   const limit=this.config.maxResponseBytes??1048576;let length=0;const chunks:Uint8Array[]=[];
   if(response.body){const reader=response.body.getReader(),cancel=()=>{void reader.cancel().catch(()=>{});};controller.signal.addEventListener('abort',cancel,{once:true});try{for(;;){const r=await reader.read();if(r.done)break;length+=r.value.byteLength;if(length>limit)throw new OmniRequestError('Omni response exceeds byte limit');chunks.push(r.value);}}finally{controller.signal.removeEventListener('abort',cancel);cancel();}}
   if(!response.ok)throw new OmniRequestError('Omni returned HTTP '+response.status,response.status);
   try{return boundedJson(Buffer.concat(chunks));}catch{throw new OmniRequestError('Omni returned invalid JSON');}
  };
  try{return await Promise.race([operation(),deadline]);}catch(error){if(error instanceof OmniRequestError)throw error;throw new OmniRequestError('Omni transport unavailable; reconcile request before retry');}finally{clearTimeout(timer);controller.abort();}
 }
 private identity(value:any){if(!value||value.actorId!==this.config.actorId||value.tenantId!==this.config.tenantId||!same(omniPolicy.parse(value.policyIdentity),this.config.expectedPolicy))throw Error('Omni principal or enrolled policy mismatch');}
 async binding(raw:z.infer<typeof omniBindingInput>){
  const input=omniBindingInput.parse(raw),value=await this.request(`/v1/engineering/workspaces/${encodeURIComponent(input.workspaceId)}/jobs/${encodeURIComponent(input.jobId)}/binding`);
  this.identity(value);const bound=omniVerificationInput.parse(Object.fromEntries(Object.keys(omniVerificationInput.shape).map(k=>[k,value[k]])));
  if(bound.workspaceId!==input.workspaceId||bound.jobId!==input.jobId||value.workerKind!=='windows-appcontainer'||value.profile!=='snapshot'||value.currentBindingVerified!==true)throw Error('Omni candidate binding mismatch');
  return {...bound,currentBindingVerified:true as const,workerKind:'windows-appcontainer' as const,profile:'snapshot' as const,policyIdentity:{...this.config.expectedPolicy}};
 }
 private body(requestId:string,raw:OmniInput){return {requestId:id.parse(requestId),...omniVerificationInput.parse(raw)};}
 private checkReceipt(value:any,requestId:string,input:OmniInput){
  this.identity(value);const body=this.body(requestId,input);
  if(Object.entries(body).some(([k,v])=>value[k]!==v)||value.inputDigest!==omniSha256(canonicalOmniJson({actorId:this.config.actorId,tenantId:this.config.tenantId,...body}))||!['queued','running','succeeded','failed','cancelled','unknown'].includes(value.status)||typeof value.cancelRequested!=='boolean'||!(value.receiptId===null||durableId(value.receiptId)))throw Error('Omni operation receipt mismatch');
  return value;
 }
 async execute(requestId:string,input:OmniInput,preDispatch?:()=>void){
  preDispatch?.();
  const body=this.body(requestId,input),binding=await this.binding({workspaceId:input.workspaceId,jobId:input.jobId});
  if(!same(omniVerificationInput.parse(Object.fromEntries(Object.keys(omniVerificationInput.shape).map(k=>[k,binding[k as keyof typeof binding]]))),input))throw Error('Omni candidate changed before dispatch');
  // Binding is asynchronous. Revalidate the caller in the same turn as dispatch.
  preDispatch?.();
  const value=this.checkReceipt(await this.request('/v1/engineering/verifications',body),requestId,input);
  return value.status==='succeeded'||value.status==='failed'&&value.reportId?this.status(requestId,input):this.publicReceipt(value);
 }
 private publicReceipt(v:any){return {requestId:v.requestId,actorId:v.actorId,tenantId:v.tenantId,workspaceId:v.workspaceId,jobId:v.jobId,sourceDigest:v.sourceDigest,candidateDigest:v.candidateDigest,testManifestDigest:v.testManifestDigest,inputDigest:v.inputDigest,status:v.status,cancelRequested:v.cancelRequested,receiptId:v.receiptId,policyIdentity:{...this.config.expectedPolicy},readbackVerified:false,currentBindingVerified:false};}
 async status(requestId:string,input:OmniInput){return this.readStatus(requestId,input);}
 async artifact(requestId:string,input:OmniInput){const result=await this.readStatus(requestId,input,true);if(!result.readbackVerified||!("contentBase64" in result))throw Error("Omni verified report unavailable");return {...result,sha256:(result as {reportSha256:string}).reportSha256};}
 private async readStatus(requestId:string,input:OmniInput,includeBytes=false){
  this.body(requestId,input);const value=this.checkReceipt(await this.request('/v1/engineering/verifications/'+encodeURIComponent(requestId)),requestId,input);
  if(value.status==='succeeded'&&!durableId(value.reportId))throw Error('Omni successful report ID missing');
  if(!['succeeded','failed'].includes(value.status)||!value.reportId)return this.publicReceipt(value);
  const fetched=this.checkReceipt(await this.request('/v1/engineering/verifications/'+encodeURIComponent(requestId)+'/report'),requestId,input);
  if(!durableId(value.receiptId)||!durableId(fetched.receiptId)||!durableId(value.reportId)||!durableId(fetched.reportId))throw Error('Omni successful receipt ID missing');
  const report=fetched.report,a=report?.assignment,n=report?.nativeReceipt,tests=report?.externalTests;
  this.identity(report);
  if(!report||report.version!==1||report.accepted!==true||Object.entries(input).some(([k,v])=>report[k]!==v)||!a||!z.uuid().safeParse(a.id).success||a.workerKind!=='windows-appcontainer'||a.profile!=='snapshot'||!Number.isSafeInteger(a.expiresAt)||a.expiresAt<=0||Object.entries(input).filter(([k])=>k.endsWith('Digest')).some(([k,v])=>a[k]!==v)||Object.entries(this.config.expectedPolicy).some(([k,v])=>a[k]!==v)||a.profileName!=='omni-'+a.id||!tests||tests.passed!==(value.status==='succeeded')||tests.worker!=='windows-appcontainer'||tests.profile!=='snapshot'||!same(tests.assignment,a)||!same(tests.nativeReceipt,n))throw Error('Omni accepted native report mismatch');
  const boundary=n?.native,cleanup=n?.cleanup;
  if(!n||Object.entries(this.config.expectedPolicy).some(([k,v])=>n[k]!==v)||!boundary||boundary.profileName!==a.profileName||!/^S-1-15-2-(?:[0-9]{1,10}-){6}[0-9]{1,10}$/.test(boundary.packageSid??'')||!boundary.packageSid.split('-').slice(4).every((v:string)=>Number(v)<=0xffffffff)||boundary.tokenIsAppContainer!==true||boundary.capabilityCount!==0||boundary.jobAssignedAtCreation!==true||cleanup?.verifiedAbsent!==true||cleanup?.activeProcessesAfter!==0||cleanup?.profileDeletionHResult!==0||cleanup?.workspaceAbsent!==true)throw Error('Omni native cleanup or process receipt mismatch');
  const bytes=Buffer.from(canonicalOmniJson(report)),sha=omniSha256(bytes),reportId='native-report:'+a.id;
  if(value.receiptId!==fetched.receiptId||value.reportId!==reportId||fetched.reportId!==reportId||value.reportSha256!==sha||fetched.reportSha256!==sha||value.bytes!==bytes.length||fetched.bytes!==bytes.length||value.mediaType!=='application/json'||fetched.mediaType!=='application/json'||fetched.status!==value.status)throw Error('Omni durable report bytes mismatch');
  // A valid historical receipt remains valid even if current workspace applicability changed.
  let currentBindingVerified=false;
  try{const current=await this.binding({workspaceId:input.workspaceId,jobId:input.jobId});currentBindingVerified=Object.entries(input).every(([k,v])=>current[k as keyof typeof current]===v);}catch{}
  return {...this.publicReceipt(fetched),readbackVerified:true,currentBindingVerified,reportId,reportSha256:sha,bytes:bytes.length,mediaType:'application/json',assignmentId:a.id,native:n,...(includeBytes?{contentBase64:bytes.toString('base64')}:{ }),scope:'Approved MGR snapshot only; supervised disk budget, no hard filesystem quota'};
 }
 async cancel(requestId:string,input:OmniInput){
  const body=this.body(requestId,input);const value=this.checkReceipt(await this.request('/v1/engineering/verifications/'+encodeURIComponent(requestId)+'/cancel',body),requestId,input);
  // Cancellation acknowledgment is not a claim of verified process-tree cleanup.
  return value.status==='succeeded'||value.status==='failed'&&value.reportId?this.status(requestId,input):this.publicReceipt(value);
 }
}
