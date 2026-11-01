/** Typed adapter for the existing department gateway, without another ledger. */
import * as z from 'zod/v4';
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {forgeWorldInput,forgeCreatureInput,forgeBiomeInput,forgeHumanInput,forgeCompositionInput,type ForgeRequestVerification} from './forge-inputs.js';
import type {ForgeCatalogClient} from './forge-catalog-client.js';
import {inspectForgeGlb} from './forge-glb.js';
const workspace=z.string().regex(/^[a-zA-Z0-9_.:-]{1,128}$/),requestId=z.string().regex(/^[A-Za-z0-9_-]{12,100}$/);
export const forgeDepartmentCommands=[
 z.object({operation:z.literal('forge.world.create'),requestId,input:forgeWorldInput.omit({requestId:true}).extend({workspaceId:workspace}).strict()}).strict(),
 z.object({operation:z.literal('forge.creature.create'),requestId,input:forgeCreatureInput.omit({requestId:true}).extend({workspaceId:workspace}).strict()}).strict(),
 z.object({operation:z.literal('forge.biome.create'),requestId,input:forgeBiomeInput.omit({requestId:true}).extend({workspaceId:workspace}).strict()}).strict(),
 z.object({operation:z.literal('forge.human.lipsync'),requestId,input:forgeHumanInput.omit({requestId:true}).extend({workspaceId:workspace}).strict()}).strict(),
 z.object({operation:z.literal('forge.world.compose'),requestId,input:forgeCompositionInput.omit({requestId:true}).extend({workspaceId:workspace}).strict()}).strict(),
] as const;
export const forgeDepartmentCommand=z.discriminatedUnion('operation',forgeDepartmentCommands);
export type ForgeDepartmentCommand=z.infer<typeof forgeDepartmentCommand>;
export function isForgeDepartmentCommand(command:{operation:string}):command is ForgeDepartmentCommand{return forgeDepartmentCommands.some(s=>s.shape.operation.value===command.operation);}
const canonical=(v:any):string=>v!==null&&typeof v==='object'?(Array.isArray(v)?'['+v.map(canonical).join(',')+']':'{'+Object.keys(v).filter(k=>v[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}'):JSON.stringify(v);
export const forgeDepartmentDigest=(command:ForgeDepartmentCommand,tenantId:string,actorId:string)=>createHash('sha256').update(canonical({schema:'mgr.forge.department-command.v1',tenantId,actorId,command})).digest('hex');
export interface ForgeDepartmentConfig {workspaceId:string;client:ForgeCatalogClient}
function frozen<T>(value:T):T{if(value&&typeof value==='object'){for(const v of Object.values(value))frozen(v);Object.freeze(value);}return value;}
export class ForgeDepartmentAdapter{
 readonly #workspace:string;readonly #client:ForgeCatalogClient;readonly #tenant:string;readonly #actor:string;
 constructor(config:ForgeDepartmentConfig,tenantId:string,actorId:string){
  this.#workspace=workspace.parse(config.workspaceId);this.#client=config.client;this.#tenant=tenantId;this.#actor=actorId;
  if(!config.client||['verifyRequest','readArtifact','createWorld','createCreature','createBiome','startHumanLipSync','createComposition'].some(k=>typeof (config.client as any)[k]!=='function'))throw Error('Complete native Forge adapter required');
 }
 private original(raw:ForgeDepartmentCommand):{command:ForgeDepartmentCommand;request:ForgeRequestVerification}{
  const c=forgeDepartmentCommand.parse(raw);if(c.input.workspaceId!==this.#workspace)throw Error('Forge workspace not enrolled');
  const {workspaceId,...input}=c.input;
  const kind={'forge.world.create':'world','forge.creature.create':'creature','forge.biome.create':'biome','forge.human.lipsync':'human','forge.world.compose':'composed'}[c.operation];
  return {command:frozen(c),request:frozen({kind,input:{requestId:c.requestId,...input}} as ForgeRequestVerification)};
 }
 async execute(raw:ForgeDepartmentCommand,preDispatch?:()=>void){
  const {command:c,request:r}=this.original(raw);
  if(preDispatch!==undefined){if(typeof preDispatch!=='function'||types.isAsyncFunction(preDispatch)||types.isGeneratorFunction(preDispatch))throw Error('Forge synchronous dispatch fence required');const value=preDispatch();if(types.isPromise(value))Reflect.apply(Promise.prototype.then,value,[()=>{},()=>{}]);if(value!==undefined)throw Error('Forge synchronous dispatch fence required');}
  switch(r.kind){case 'world':await this.#client.createWorld!(r.input);break;case 'creature':{const {morph,...input}=r.input;await this.#client.createCreature!(frozen({...input,...(morph===undefined?{}:{morph})}));break;}case 'biome':await this.#client.createBiome!(r.input);break;case 'human':await this.#client.startHumanLipSync!(r.input);break;case 'composed':await this.#client.createComposition!(r.input);break;}
  return this.inspect(c,false);
 }
 async status(raw:ForgeDepartmentCommand){return this.inspect(raw,false);}
 async worldContext(workspaceId:string){
  if(workspaceId!==this.#workspace||!this.#client.readWorldContext)throw Error('Forge world context not configured for workspace');
  const value=z.object({schema:z.literal('mgr.forge.world-context.v1'),sourceVerified:z.literal(true),sideEffects:z.literal(false),edits:forgeWorldInput.shape.edits,materials:z.array(z.string().min(1).max(100)).max(32),grounds:z.object({width:z.number().finite().positive(),depth:z.number().finite().positive()}).strict(),limits:z.object({maximumEditedBuildings:z.number().int().positive().max(300),maximumHeight:z.number().finite().positive()}).strict()}).strict().parse(await this.#client.readWorldContext());
  return {...value,schema:'mgr.forge.department-world-context.v1',workspaceId:this.#workspace,tenantId:this.#tenant,actorId:this.#actor};
 }
 async prepare(raw:ForgeDepartmentCommand){
  const {command:c,request:r}=this.original(raw),native=await this.#client.verifyRequest!(r);
  const base={requestId:c.requestId,operation:c.operation,workspaceId:this.#workspace,tenantId:this.#tenant,actorId:this.#actor,commandSha256:forgeDepartmentDigest(c,this.#tenant,this.#actor),nativeKind:r.kind};
  if(native.request_id!==c.requestId||native.request_kind!==r.kind)throw Error('Forge preparation identity mismatch');
  if(native.status==='NOT_FOUND'&&native.input_verified===false&&native.job_id===undefined&&native.input_fingerprint===undefined)return {...base,prepared:true,sideEffects:false,requestExists:false,nativeState:'NOT_FOUND',nativeInputVerified:false};
  if(!['MATERIALIZED','RUNNING','FAILED','NEEDS_RECONCILIATION'].includes(String(native.status))||native.input_verified!==true||typeof native.input_fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(native.input_fingerprint)||typeof native.job_id!=='string'||!/^[a-f0-9]{24}$/.test(native.job_id))throw Error('Forge preparation original input unverified');
  return {...base,prepared:true,sideEffects:false,requestExists:true,nativeState:native.status,nativeInputVerified:true,inputFingerprint:native.input_fingerprint,nativeJobId:native.job_id};
 }
 async artifact(raw:ForgeDepartmentCommand){return this.inspect(raw,true);}
 private async inspect(raw:ForgeDepartmentCommand,includeData:boolean):Promise<any>{
  const {command:c,request:r}=this.original(raw);
  const base={requestId:c.requestId,operation:c.operation,workspaceId:this.#workspace,tenantId:this.#tenant,actorId:this.#actor,commandSha256:forgeDepartmentDigest(c,this.#tenant,this.#actor),nativeKind:r.kind};
  const native=await this.#client.verifyRequest!(r);
  if(native.request_id!==c.requestId||native.request_kind!==r.kind)throw Error('Forge original request identity mismatch');
  if(native.status==='NOT_FOUND'&&native.input_verified===false){if(includeData)throw Error('Forge artifact unavailable');return {...base,status:'UNKNOWN',readbackVerified:false,nativeInputVerified:false};}
  if(native.input_verified!==true||typeof native.input_fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(native.input_fingerprint)||typeof native.job_id!=='string'||!/^[a-f0-9]{24}$/.test(native.job_id))throw Error('Forge exact native input unverified');
  const result={...base,nativeInputVerified:true,inputFingerprint:native.input_fingerprint,nativeJobId:native.job_id};
  if(native.status!=='MATERIALIZED'){
   if(includeData)throw Error('Forge artifact not ready');
   const status=native.status==='RUNNING'?'RUNNING':native.status==='FAILED'?'FAILED':'UNKNOWN';return {...result,status,readbackVerified:false};
  }
  const fields={world:['world_sha256','world_bytes'],creature:['creature_sha256','creature_bytes'],biome:['biome_sha256','biome_bytes'],human:['human_sha256','human_bytes'],composed:['combined_world_sha256','combined_bytes']}[r.kind];
  const expectedSha256=native[fields[0]!],expectedBytes=native[fields[1]!];
  if(typeof expectedSha256!=='string'||!/^[a-f0-9]{64}$/.test(expectedSha256)||!Number.isSafeInteger(expectedBytes)||(expectedBytes as number)<28||(expectedBytes as number)>800000)throw Error('Forge native artifact identity unavailable');
  const artifact=await this.#client.readArtifact!({jobId:native.job_id,kind:r.kind,expectedSha256});
  if(artifact.mimeType!=='model/gltf-binary'||artifact.sha256!==expectedSha256||artifact.bytes!==expectedBytes||typeof artifact.blobBase64!=='string'||artifact.blobBase64.length>1100000)throw Error('Forge artifact does not match exact input result');
  const bytes=Buffer.from(artifact.blobBase64,'base64');if(bytes.toString('base64')!==artifact.blobBase64||bytes.length!==expectedBytes||createHash('sha256').update(bytes).digest('hex')!==expectedSha256)throw Error('Forge artifact bytes changed');inspectForgeGlb(bytes);
  const metadata={id:'forge-'+native.job_id,sha256:expectedSha256,bytes:expectedBytes,mediaType:'model/gltf-binary'};
  return {...result,status:'SUCCEEDED',readbackVerified:true,artifacts:[metadata],...(includeData?{sha256:expectedSha256,bytes:expectedBytes,mediaType:metadata.mediaType,contentBase64:artifact.blobBase64}:{})};
 }
}
