/** Forge owns 3D execution; this shared MCP edge only authenticates and routes. */
import type {McpServer} from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import {authorizeTool, type AuthContext} from "./authz.js";
import type {ForgeCatalogClient,ForgeCatalogSearch,ForgeWorldEdits,ForgeCreatureInput,ForgeBiomeInput,ForgeArtifactRequest,ForgeHumanLipSyncInput,ForgeWorldCompositionInput,ForgeSavedJobsInput,ForgeSavedJobInput} from "./forge-catalog-client.js";
import {createHash} from "node:crypto";
import {types} from "node:util";
import {forgeWorldInput,forgeCreatureInput,forgeBiomeInput,forgeHumanInput,forgeCompositionInput,forgeVerifyInput,type ForgeRequestVerification} from './forge-inputs.js';
import {inspectForgeGlb} from './forge-glb.js';

export interface ForgeMcpToolOptions {
  auth:AuthContext;
  resourceAudience:string;
  allowedTenantId:string;
  allowedActorId:string;
  assertCurrent?:()=>void;
  forge:ForgeCatalogClient;
}

function denied(options:ForgeMcpToolOptions,scope:"tools:read"|"tools:execute"):string|null{
  try{
    const fence=options.assertCurrent;
    if(fence!==undefined){
      if(typeof fence!=='function'||types.isAsyncFunction(fence))throw Error('Forge synchronous authority fence required');
      const value=fence();
      if(value!==undefined){if(types.isPromise(value))Reflect.apply(Promise.prototype.then,value,[()=>{},()=>{}]);throw Error('Forge synchronous authority fence required');}
    }
    authorizeTool(options.auth,options.resourceAudience,[scope]);
    if(!options.allowedTenantId || options.auth.tenantId!==options.allowedTenantId ||
       !options.allowedActorId || options.auth.actorId!==options.allowedActorId)
      throw Error("Forge workstation principal unavailable");
    return null;
  }catch{return "Forge current workstation actor, tenant, scope or authority unavailable";}
}
function publicationGuard(options:ForgeMcpToolOptions,scope:"tools:read"|"tools:execute"){
  const auth=options.auth,expiresAt=auth.expiresAt,hostFence=options.assertCurrent,principal=JSON.stringify([auth.actorId,auth.tenantId,auth.audience,options.allowedActorId,options.allowedTenantId,options.resourceAudience]),forge=options.forge;
  return ()=>{
    if(options.auth!==auth || auth.expiresAt!==expiresAt || options.assertCurrent!==hostFence || options.forge!==forge ||
       JSON.stringify([options.auth.actorId,options.auth.tenantId,options.auth.audience,options.allowedActorId,options.allowedTenantId,options.resourceAudience])!==principal)
      throw Error("Forge authority changed before result publication; inspect the original request before retrying");
    if(denied(options,scope)!==null)throw Error("Forge authority unavailable before result publication; inspect the original request before retrying");
  };
}

const savedKind=z.enum(['world','creature','biome','human','composed']);
const savedRequestId=z.string().regex(/^[A-Za-z0-9_-]{12,100}$/);
const savedCursor=z.string().regex(/^([a-f0-9]{64}:[0-9]{1,4})?$/);
const savedJobsInput=z.object({kind:z.enum(['all','world','creature','biome','human','composed']).default('all'),
  limit:z.number().int().min(1).max(20).default(20),cursor:savedCursor.optional()}).strict();
const savedJobInput=z.object({kind:savedKind,requestId:savedRequestId}).strict();
const savedJobsResult=z.object({schema:z.literal('mgr.forge.saved-jobs.v1'),status:z.literal('JOURNAL_OBSERVATION'),
  items:z.array(z.object({kind:savedKind,request_id:savedRequestId,job_id:z.string().regex(/^[a-f0-9]{24}$/),
    status:z.enum(['RUNNING','MATERIALIZED','FAILED','NEEDS_RECONCILIATION']),artifact_verified:z.literal(false)}).strict()).max(20),
  total:z.number().int().min(0).max(5000),unavailable_kinds:z.array(savedKind).max(5),
  next_cursor:z.string().regex(/^[a-f0-9]{64}:[0-9]{1,4}$/).nullable(),order:z.literal('kind_then_request_id'),creates_jobs:z.literal(false)}).strict();

export async function listForgeSavedJobsMcp(options:ForgeMcpToolOptions,input:ForgeSavedJobsInput):Promise<Record<string,unknown>>{
  const reason=denied(options,'tools:read');if(reason)return {accepted:false,state:'DENY',reason};
  const parsed=savedJobsInput.safeParse(input);if(!parsed.success)return {accepted:false,state:'INVALID_SAVED_JOBS_REQUEST'};
  if(!options.forge.listSavedJobs)return {accepted:false,state:'EXECUTOR_UNAVAILABLE'};
  const current=publicationGuard(options,'tools:read');
  try{
    const native=await options.forge.listSavedJobs(parsed.data);current();
    const observed=savedJobsResult.parse(native);
    if(observed.items.length>parsed.data.limit||observed.items.length>observed.total||
       observed.items.some(item=>parsed.data.kind!=='all'&&item.kind!==parsed.data.kind))throw Error('Saved journal scope mismatch');
    return {accepted:true,status:'JOURNAL_OBSERVATION',artifactReady:false,artifactVerified:false,
      creationPerformed:false,journal:observed,
      disclaimer:'Saved journal state only; reopen verifies an original GLB. No creation, retry, approval or artifact acceptance.'};
  }catch{return {accepted:false,state:'SAVED_JOBS_UNAVAILABLE',reason:'Saved Forge journal unavailable or changed; refresh before continuing'};}
}

export async function reopenForgeSavedJobMcp(options:ForgeMcpToolOptions,input:ForgeSavedJobInput):Promise<Record<string,unknown>>{
  const reason=denied(options,'tools:read');if(reason)return {accepted:false,state:'DENY',reason};
  const parsed=savedJobInput.safeParse(input);if(!parsed.success)return {accepted:false,state:'INVALID_SAVED_JOB_IDENTITY'};
  if(!options.forge.reopenSavedJob)return {accepted:false,state:'EXECUTOR_UNAVAILABLE'};
  const current=publicationGuard(options,'tools:read'),value=parsed.data;
  try{
    const native=await options.forge.reopenSavedJob(value);current();
    if(native.request_id!==value.requestId)throw Error('Saved request identity mismatch');
    if(['NOT_FOUND','RUNNING','FAILED','NEEDS_RECONCILIATION'].includes(String(native.status))){
      return {accepted:false,state:native.status,requestId:value.requestId,kind:value.kind,
        artifactReady:false,creationPerformed:false,reconciliationRequired:native.status==='NEEDS_RECONCILIATION'};
    }
    const keys={world:['world_sha256','world_bytes'],creature:['creature_sha256','creature_bytes'],
      biome:['biome_sha256','biome_bytes'],human:['human_sha256','human_bytes'],composed:['combined_world_sha256','combined_bytes']} as const;
    const [shaKey,bytesKey]=keys[value.kind],sha=native[shaKey],bytes=native[bytesKey],jobId=native.job_id;
    if(native.status!=='MATERIALIZED'||typeof jobId!=='string'||!/^[a-f0-9]{24}$/.test(jobId)||
       typeof sha!=='string'||!/^[a-f0-9]{64}$/.test(sha)||typeof bytes!=='number'||
       !Number.isSafeInteger(bytes)||bytes<28||bytes>800000)throw Error('Saved artifact metadata unverified');
    // Reuse the same independently hashed structural GLB reader as ordinary downloads.
    const proof=await readForgeArtifactMcp(options,{jobId,kind:value.kind,expectedSha256:sha});current();
    if(proof.accepted!==true||proof.bytes!==bytes)throw Error('Saved artifact bytes unavailable or changed');
    return {accepted:true,status:'SAVED_CREATION_GLTF_VERIFIED',kind:value.kind,requestId:value.requestId,jobId,
      artifactSha256:sha,artifactBytes:bytes,artifactReady:true,artifactBytesVerified:true,creationPerformed:false,
      ownerArtAccepted:false,hostedConsumerVerified:false,
      disclaimer:'Original native job reopened and exact GLB bytes checked; no new job, approval or owner-art acceptance.'};
  }catch{return {accepted:false,state:'SAVED_CREATION_UNVERIFIED',requestId:value.requestId,kind:value.kind,
    artifactReady:false,creationPerformed:false,reconciliationRequired:true};}
}

export async function verifyForgeRequestMcp(options:ForgeMcpToolOptions,input:ForgeRequestVerification):Promise<Record<string,unknown>>{
  const reason=denied(options,'tools:read');if(reason)return {accepted:false,state:'DENY',reason};
  const parsed=forgeVerifyInput.safeParse(input);if(!parsed.success)return {accepted:false,state:'INVALID_REQUEST_IDENTITY'};
  if(!options.forge.verifyRequest)return {accepted:false,state:'EXECUTOR_UNAVAILABLE'};
  const current=publicationGuard(options,'tools:read'),value=parsed.data;
  try{
    const result=await options.forge.verifyRequest(value);current();
    if(result.request_id!==value.input.requestId||result.request_kind!==value.kind)throw Error('native request identity mismatch');
    if(result.status==='NOT_FOUND'&&result.input_verified===false)return {accepted:false,state:'NOT_FOUND',requestId:value.input.requestId,kind:value.kind};
    if(result.input_verified!==true||typeof result.input_fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(result.input_fingerprint)||typeof result.job_id!=='string'||!/^[a-f0-9]{24}$/.test(result.job_id)||!['MATERIALIZED','RUNNING','FAILED','NEEDS_RECONCILIATION'].includes(String(result.status)))throw Error('native input verification unavailable');
    return {accepted:true,status:'NATIVE_REQUEST_INPUT_VERIFIED',requestId:value.input.requestId,kind:value.kind,inputFingerprint:result.input_fingerprint,nativeStatus:result.status,nativeResult:result};
  }catch{return {accepted:false,state:'REQUEST_INPUT_UNVERIFIED',requestId:value.input.requestId,kind:value.kind,reconciliationRequired:true};}
}

export async function searchForgeMcp(
  options:ForgeMcpToolOptions,input:ForgeCatalogSearch
):Promise<Record<string,unknown>>{
  const reason=denied(options,"tools:read");
  if(reason) return {accepted:false,state:"DENY",reason};
  if(input.query.length>120 || (input.category && input.category.length>48) ||
     (input.limit!==undefined && (input.limit<1 || input.limit>100))){
    return {accepted:false,state:"DENY",reason:"Forge catalog request exceeds bounded limits"};
  }
  const assertPublicationCurrent=publicationGuard(options,"tools:read");
  try{
    const catalog=await options.forge.search(input);
    assertPublicationCurrent();
    return {accepted:true,status:"SOURCE_DIRECTORY_RESULT",catalog,
            disclaimer:"Discovery is not model download, rights clearance or verified 3D output"};
  }catch(error){
    return {accepted:false,state:"SOURCE_UNAVAILABLE",
            reason:"Forge source directory unavailable"};
  }
}

export async function createForgeWorldMcp(
  options:ForgeMcpToolOptions,
  input:{requestId:string;edits:ForgeWorldEdits}
):Promise<Record<string,unknown>>{
  const reason=denied(options,"tools:execute");
  if(reason) return {accepted:false,state:"DENY",reason};
  if(!options.forge.createWorld){
    return {accepted:false,state:"EXECUTOR_UNAVAILABLE",reason:"Forge creation adapter not configured"};
  }
  const assertPublicationCurrent=publicationGuard(options,"tools:execute");
  try{
    const result=await options.forge.createWorld(input);
    assertPublicationCurrent();
    if(result.status==="NEEDS_RECONCILIATION"){
      return {accepted:false,state:"RECONCILIATION_REQUIRED",requestId:input.requestId,
              reason:"Previous world job interrupted; do not retry as a new side effect"};
    }
    if(result.status!=="MATERIALIZED" ||
       typeof result.world_sha256!=="string" ||
       !/^[a-f0-9]{64}$/.test(result.world_sha256) ||
       typeof result.job_id!=="string" || !/^[a-f0-9]{24}$/.test(result.job_id) ||
       typeof result.world_bytes!=="number" || result.world_bytes<=0){
      return {accepted:false,state:"UNVERIFIED_RECEIPT",reason:"Forge returned no verified file digest"};
    }
    return {accepted:true,status:"WORLD_MATERIALIZED_LOCAL",requestId:input.requestId,
            jobId:result.job_id,artifactSha256:result.world_sha256,
            artifactBytes:result.world_bytes,localArtifactUrl:result.glb_url,
            replayed:result.replayed===true,
            independentlyBlenderVerified:false,
            hostedTevinVerified:false,
            disclaimer:"Real Forge local world, not a hosted download or approved Blender/engine receipt"};
  }catch(error){
    return {accepted:false,state:"FORGE_UNAVAILABLE_OR_UNKNOWN",
            reason:"Forge world creation outcome unknown",
            reconciliationRequired:true,requestId:input.requestId};
  }
}

export async function statusForgeWorldMcp(
  options:ForgeMcpToolOptions,requestId:string
):Promise<Record<string,unknown>>{
  const reason=denied(options,"tools:read");
  if(reason) return {accepted:false,state:"DENY",reason};
  if(!options.forge.worldStatus) return {accepted:false,state:"EXECUTOR_UNAVAILABLE"};
  const assertPublicationCurrent=publicationGuard(options,"tools:read");
  try{
    const status=await options.forge.worldStatus(requestId);
    assertPublicationCurrent();
    return {accepted:status.status==="MATERIALIZED",status:status.status,
            requestId,jobId:status.job_id,artifactSha256:status.world_sha256,
            reconciliationRequired:status.status==="NEEDS_RECONCILIATION"};
  }catch(error){
    return {accepted:false,state:"SOURCE_UNAVAILABLE",
            reason:"Forge status unavailable"};
  }
}

export async function createForgeCreatureMcp(options:ForgeMcpToolOptions,input:ForgeCreatureInput):Promise<Record<string,unknown>>{
  const reason=denied(options,"tools:execute");
  if(reason) return {accepted:false,state:"DENY",reason};
  if(!options.forge.createCreature) return {accepted:false,state:"EXECUTOR_UNAVAILABLE"};
  const assertPublicationCurrent=publicationGuard(options,"tools:execute");
  try{
    const result=await options.forge.createCreature(input);
    assertPublicationCurrent();
    if(result.status==="NEEDS_RECONCILIATION"){
      return {accepted:false,state:"RECONCILIATION_REQUIRED",requestId:input.requestId,
              reason:"Previous creator job may have executed; do not blindly dispatch twice"};
    }
    if(result.status!=="MATERIALIZED" || typeof result.creature_sha256!=="string" ||
       !/^[a-f0-9]{64}$/.test(result.creature_sha256) ||
       typeof result.job_id!=="string" || !/^[a-f0-9]{24}$/.test(result.job_id) ||
       typeof result.creature_bytes!=="number" || !Number.isSafeInteger(result.creature_bytes) ||
       result.creature_bytes<100 || result.model_inference_used!==false ||
       result.owner_art_accepted!==false){
      return {accepted:false,state:"UNVERIFIED_ARTIFACT",
              reason:"Forge has not returned complete trustworthy native creature GLB metadata"};
    }
    return {accepted:true,status:"ORIGINAL_CREATURE_MATERIALIZED_LOCAL",
            requestId:input.requestId,jobId:result.job_id,
            artifactSha256:result.creature_sha256,artifactBytes:result.creature_bytes,
            triangles:result.triangles,localArtifactUrl:result.glb_url,
            localManifestUrl:result.manifest_url,replayed:result.replayed===true,
            ownerArtAccepted:false,neuralInference:false,hostedChatgptVerified:false,
            disclaimer:"Original CPU mesh, not neural photorealism, owner-approved creature or hosted public download"};
  }catch(error){
    return {accepted:false,state:"FORGE_UNAVAILABLE_OR_UNKNOWN",
            reconciliationRequired:true,requestId:input.requestId,
            reason:"Forge creature worker unavailable"};
  }
}

export async function statusForgeCreatureMcp(options:ForgeMcpToolOptions,requestId:string):Promise<Record<string,unknown>>{
  const reason=denied(options,"tools:read");
  if(reason) return {accepted:false,state:"DENY",reason};
  if(!options.forge.creatureStatus) return {accepted:false,state:"EXECUTOR_UNAVAILABLE"};
  const assertPublicationCurrent=publicationGuard(options,"tools:read");
  try{
    const result=await options.forge.creatureStatus(requestId);
    assertPublicationCurrent();
    return {accepted:result.status==="MATERIALIZED",status:result.status,requestId,
            jobId:result.job_id,artifactSha256:result.creature_sha256,
            reconciliationRequired:result.status==="NEEDS_RECONCILIATION",
            hostedChatgptVerified:false};
  }catch(error){
    return {accepted:false,state:"FORGE_UNAVAILABLE_OR_UNKNOWN",reconciliationRequired:true,
            reason:"Forge creature status unavailable"};
  }
}

export async function createForgeBiomeMcp(options:ForgeMcpToolOptions,input:ForgeBiomeInput):Promise<Record<string,unknown>>{
  const reason=denied(options,"tools:execute");
  if(reason)return {accepted:false,state:"DENY",reason};
  if(!options.forge.createBiome)return {accepted:false,state:"EXECUTOR_UNAVAILABLE"};
  const assertPublicationCurrent=publicationGuard(options,"tools:execute");
  try{
    const result=await options.forge.createBiome(input);
    assertPublicationCurrent();
    if(result.status==="NEEDS_RECONCILIATION")
      return {accepted:false,state:"RECONCILIATION_REQUIRED",requestId:input.requestId};
    if(result.status!=="MATERIALIZED" ||
       typeof result.biome_sha256!=="string" || !/^[a-f0-9]{64}$/.test(result.biome_sha256) ||
       typeof result.job_id!=="string" || !/^[a-f0-9]{24}$/.test(result.job_id) ||
       typeof result.biome_bytes!=="number" || !Number.isSafeInteger(result.biome_bytes) ||
       result.biome_bytes<100 || result.external_model_used!==false ||
       result.editor_world_unchanged!==true || result.added_as_layer!==true)
      return {accepted:false,state:"UNVERIFIED_BIOME_RECEIPT"};
    return {accepted:true,status:"ORIGINAL_BIOME_LAYER_MATERIALIZED_LOCAL",
            jobId:result.job_id,requestId:input.requestId,
            artifactSha256:result.biome_sha256,artifactBytes:result.biome_bytes,
            sourceWorldSha256:result.source_world_sha256,
            glbPath:result.glb_url,manifestPath:result.manifest_url,
            triangles:result.triangles,biome:result.biome,
            replayed:result.replayed===true,standaloneWorldMerged:false,
            externalModelsUsed:false,hostedConsumerVerified:false,
            disclaimer:"Original optional terrain GLB ring; not merged realtime terrain, Blender or Godot accepted"};
  }catch(error){
    return {accepted:false,state:"FORGE_UNAVAILABLE_OR_UNKNOWN",requestId:input.requestId,
            reconciliationRequired:true,
            reason:"Forge biome job failed"};
  }
}

export async function statusForgeBiomeMcp(options:ForgeMcpToolOptions,requestId:string):Promise<Record<string,unknown>>{
  const reason=denied(options,"tools:read");
  if(reason)return {accepted:false,state:"DENY",reason};
  if(!options.forge.biomeStatus)return {accepted:false,state:"EXECUTOR_UNAVAILABLE"};
  const assertPublicationCurrent=publicationGuard(options,"tools:read");
  try{
    const result=await options.forge.biomeStatus(requestId);
    assertPublicationCurrent();
    return {accepted:result.status==="MATERIALIZED",status:result.status,
            requestId,jobId:result.job_id,artifactSha256:result.biome_sha256,
            reconciliationRequired:result.status==="NEEDS_RECONCILIATION"};
  }catch(error){
    return {accepted:false,state:"FORGE_UNAVAILABLE_OR_UNKNOWN",requestId,
            reconciliationRequired:true,reason:"Forge biome status failed"};
  }
}

export async function readForgeArtifactMcp(options:ForgeMcpToolOptions,input:ForgeArtifactRequest):Promise<Record<string,unknown>>{
  const reason=denied(options,"tools:read");
  if(reason)return {accepted:false,state:"DENY",reason};
  if(!options.forge.readArtifact)return {accepted:false,state:"EXECUTOR_UNAVAILABLE"};
  if(!/^[a-f0-9]{24}$/.test(input.jobId) ||
     !/^[a-f0-9]{64}$/.test(input.expectedSha256) ||
     !["creature","biome","world","human","composed"].includes(input.kind))
    return {accepted:false,state:"INVALID_ARTIFACT_IDENTITY"};
  const assertPublicationCurrent=publicationGuard(options,"tools:read");
  try{
    const result=await options.forge.readArtifact(input);
    assertPublicationCurrent();
    if(result.sha256!==input.expectedSha256 ||
       result.mimeType!=="model/gltf-binary" || typeof result.blobBase64!=="string" ||
       result.blobBase64.length>1_100_000 || typeof result.bytes!=="number" ||
       result.bytes<28 || result.bytes>800_000)throw new Error("invalid Forge delivery proof");
    const data=Buffer.from(result.blobBase64,"base64");
    if(data.length!==result.bytes || data.toString('base64')!==result.blobBase64 ||
       createHash("sha256").update(data).digest("hex")!==input.expectedSha256){
      throw new Error("artifact content not independently authentic to receipt");
    }
    inspectForgeGlb(data);
    return {accepted:true,status:"VERIFIED_PRIVATE_GLTF_BLOB",
            jobId:input.jobId,kind:input.kind,
            sha256:result.sha256,bytes:result.bytes,
            mimeType:result.mimeType,blobBase64:result.blobBase64,
            remotePublicDownloadUrl:null,privateArtifactRightsGranted:false,
            disclaimer:"Tenant-checked file bytes; no public URL, not owner-art accepted"};
  }catch(error){
    return {accepted:false,state:"ARTIFACT_UNAVAILABLE_OR_CHANGED",
            reason:"Forge artifact read failed"};
  }
}

export async function startForgeHumanLipSyncMcp(options:ForgeMcpToolOptions,input:ForgeHumanLipSyncInput):Promise<Record<string,unknown>>{
  const reason=denied(options,"tools:execute");
  if(reason)return {accepted:false,state:"DENY",reason};
  if(!options.forge.startHumanLipSync)return {accepted:false,state:"EXECUTOR_UNAVAILABLE"};
  const assertPublicationCurrent=publicationGuard(options,"tools:execute");
  try{
    const result=await options.forge.startHumanLipSync(input);
    assertPublicationCurrent();
    if(result.status==="RUNNING" &&
       typeof result.job_id==="string" && /^[a-f0-9]{24}$/.test(result.job_id)){
      return {accepted:true,status:"BLENDER_HUMAN_JOB_RUNNING",jobId:result.job_id,
              requestId:input.requestId,artifactReady:false,
              neuralAudioAlignment:false,remotelyHosted:false};
    }
    if(result.status==="MATERIALIZED" && typeof result.job_id==="string" &&
       /^[a-f0-9]{24}$/.test(result.job_id) &&
       typeof result.human_sha256==="string" && /^[a-f0-9]{64}$/.test(result.human_sha256) &&
       result.real_blender_verified===true && result.audio_alignment_performed===false){
      return {accepted:true,status:"BLENDER_HUMAN_FACIAL_ARTIFACT_VERIFIED",
              requestId:input.requestId,jobId:result.job_id,
              sha256:result.human_sha256,bytes:result.human_bytes,
              morphTargets:result.morph_targets,
              artifactReady:true,ownerVisualApproved:false,
              neuralAudioAlignment:false,remotelyHosted:false};
    }
    return {accepted:false,state:result.status==="NEEDS_RECONCILIATION"?
            "RECONCILIATION_REQUIRED":"HUMAN_JOB_UNVERIFIED",
            requestId:input.requestId,jobId:result.job_id};
  }catch(error){
    return {accepted:false,state:"FORGE_UNAVAILABLE_OR_UNKNOWN",
            reconciliationRequired:true,requestId:input.requestId,
            reason:"Human Forge start unavailable"};
  }
}

export async function statusForgeHumanLipSyncMcp(options:ForgeMcpToolOptions,requestId:string):Promise<Record<string,unknown>>{
  const reason=denied(options,"tools:read");
  if(reason)return {accepted:false,state:"DENY",reason};
  if(!options.forge.humanLipSyncStatus)return {accepted:false,state:"EXECUTOR_UNAVAILABLE"};
  const assertPublicationCurrent=publicationGuard(options,"tools:read");
  try{
    const result=await options.forge.humanLipSyncStatus(requestId);
    assertPublicationCurrent();
    if(result.status==="RUNNING")
      return {accepted:true,status:"BLENDER_HUMAN_JOB_RUNNING",requestId,jobId:result.job_id,artifactReady:false};
    if(result.status==="MATERIALIZED" && typeof result.human_sha256==="string" &&
       /^[a-f0-9]{64}$/.test(result.human_sha256) && result.real_blender_verified===true &&
       result.audio_alignment_performed===false){
      return {accepted:true,status:"BLENDER_HUMAN_FACIAL_ARTIFACT_VERIFIED",requestId,
              jobId:result.job_id,sha256:result.human_sha256,bytes:result.human_bytes,
              morphTargets:result.morph_targets,artifactReady:true,ownerVisualApproved:false,
              audioAlignment:false};
    }
    return {accepted:false,state:result.status||"UNKNOWN",requestId,
            reconciliationRequired:result.status==="NEEDS_RECONCILIATION"};
  }catch(error){
    return {accepted:false,state:"FORGE_UNAVAILABLE_OR_UNKNOWN",requestId,reconciliationRequired:true,
            reason:"Human job status unavailable"};
  }
}

export async function createForgeCompositionMcp(options:ForgeMcpToolOptions,input:ForgeWorldCompositionInput):Promise<Record<string,unknown>>{
  const reason=denied(options,"tools:execute");
  if(reason)return {accepted:false,state:"DENY",reason};
  if(!options.forge.createComposition)return {accepted:false,state:"EXECUTOR_UNAVAILABLE"};
  if(!/^[A-Za-z0-9_-]{12,100}$/.test(input.requestId) ||
     !/^[A-Za-z0-9_-]{12,100}$/.test(input.biomeRequestId))
    return {accepted:false,state:"INVALID_COMPOSITION_ID"};
  const assertPublicationCurrent=publicationGuard(options,"tools:execute");
  try{
    const result=await options.forge.createComposition(input);
    assertPublicationCurrent();
    if(result.status==="RUNNING" && typeof result.job_id==="string" &&
       /^[a-f0-9]{24}$/.test(result.job_id)){
      return {accepted:true,status:"MGR_WORLD_COMPOSITION_RUNNING",
              jobId:result.job_id,requestId:input.requestId,artifactReady:false};
    }
    if(result.status==="BUSY")
      return {accepted:false,state:"HEAVY_BLENDER_WORKER_BUSY",requestId:input.requestId};
    if(result.status==="MATERIALIZED" && typeof result.combined_world_sha256==="string" &&
       /^[a-f0-9]{64}$/.test(result.combined_world_sha256) &&
       typeof result.world_sha256==="string" && /^[a-f0-9]{64}$/.test(result.world_sha256) &&
       typeof result.biome_sha256==="string" && /^[a-f0-9]{64}$/.test(result.biome_sha256) &&
       typeof result.job_id==="string" && /^[a-f0-9]{24}$/.test(result.job_id) &&
       result.independently_blender_verified===true &&
       typeof result.combined_bytes==="number" &&
       Number.isSafeInteger(result.combined_bytes) && result.combined_bytes>=28 &&
       result.combined_bytes<=800000 && result.full_game_navigation_verified===false){
      return {accepted:true,status:"MGR_COMPOSED_WORLD_GLTF_VERIFIED",
              jobId:result.job_id,requestId:input.requestId,
              artifactSha256:result.combined_world_sha256,
              sourceCitySha256:result.world_sha256,
              sourceBiomeSha256:result.biome_sha256,
              artifactBytes:result.combined_bytes,
              triangles:result.triangles,artifactReady:true,
              blenderReimported:true,godotProjectSourceIncluded:true,
              godotRuntimeAccepted:false,
              hostedForgeVerified:false,ownerArtApproved:false};
    }
    return {accepted:false,state:result.status==="NEEDS_RECONCILIATION"?
      "RECONCILIATION_REQUIRED":"WORLD_COMPOSITION_UNVERIFIED",
      requestId:input.requestId,jobId:result.job_id};
  }catch(error){
    return {accepted:false,state:"COMPOSED_WORKER_OUTCOME_UNKNOWN",
            requestId:input.requestId,reconciliationRequired:true,
            reason:"world composition worker unavailable"};
  }
}

export async function statusForgeCompositionMcp(options:ForgeMcpToolOptions,requestId:string):Promise<Record<string,unknown>>{
  const reason=denied(options,"tools:read");
  if(reason)return {accepted:false,state:"DENY",reason};
  if(!options.forge.compositionStatus)return {accepted:false,state:"EXECUTOR_UNAVAILABLE"};
  const assertPublicationCurrent=publicationGuard(options,"tools:read");
  try{
    const result=await options.forge.compositionStatus(requestId);
    assertPublicationCurrent();
    if(result.status==="RUNNING")
      return {accepted:true,status:"MGR_WORLD_COMPOSITION_RUNNING",
              requestId,jobId:result.job_id,artifactReady:false};
    if(result.status==="MATERIALIZED" &&
       typeof result.combined_world_sha256==="string" &&
       /^[a-f0-9]{64}$/.test(result.combined_world_sha256) &&
       result.independently_blender_verified===true &&
       typeof result.job_id==="string" && /^[a-f0-9]{24}$/.test(result.job_id)){
      return {accepted:true,status:"MGR_COMPOSED_WORLD_GLTF_VERIFIED",
              requestId,jobId:result.job_id,
              artifactSha256:result.combined_world_sha256,
              artifactBytes:result.combined_bytes,
              sourceCitySha256:result.world_sha256,
              sourceBiomeSha256:result.biome_sha256,
              blenderReimported:true,artifactReady:true,
              hostedForgeVerified:false};
    }
    return {accepted:false,state:result.status||"UNKNOWN",
            requestId,reconciliationRequired:result.status==="NEEDS_RECONCILIATION"};
  }catch(error){
    return {accepted:false,state:"COMPOSED_WORKER_OUTCOME_UNKNOWN",requestId,
            reconciliationRequired:true,
            reason:"world composition status unavailable"};
  }
}

const executionTools=new Set(['mgr_forge_world_create','mgr_forge_creature_create','mgr_forge_biome_create','mgr_forge_human_lipsync_start','mgr_forge_world_compose_create']);
function scopedRegistrar(server:McpServer,options:ForgeMcpToolOptions):McpServer['registerTool']{
  // Keep the SDK's generic schema/callback signature at every registration.
  // The erased forwarding boundary adds a final fence after the callback has
  // constructed text/binary content, including its JSON serialization.
  return ((name:string,definition:any,callback:(...args:any[])=>unknown)=>
    server.registerTool(name,definition,async(...args:any[])=>{
      const executing=executionTools.has(name),scope=executing?'tools:execute':'tools:read';
      const failure=(state:string)=>({isError:true,content:[{type:'text' as const,text:JSON.stringify({accepted:false,state,reconciliationRequired:executing})}]});
      if(denied(options,scope)!==null)return failure('DENY');
      const current=publicationGuard(options,scope);
      try{const response=await callback(...args);current();return response as any;}
      catch{return failure(executing?'FORGE_OUTCOME_UNKNOWN':'FORGE_RESPONSE_WITHHELD');}
    })) as McpServer['registerTool'];
}

export function registerForgeMcpTools(server:McpServer,options:ForgeMcpToolOptions):void{
  const register=scopedRegistrar(server,options);
  if(options.forge.listSavedJobs)register('mgr_forge_saved_jobs',{
    description:'Read-only bounded navigation over original Forge creation journals. Journal state is not verified artifact success. Does not create, retry, cancel, approve or grant authority.',
    inputSchema:savedJobsInput
  },async input=>{
    const result=await listForgeSavedJobsMcp(options,input);
    return {content:[{type:'text',text:JSON.stringify(result)}],isError:result.accepted!==true};
  });
  if(options.forge.reopenSavedJob)register('mgr_forge_saved_job_reopen',{
    description:'Read-only reopen of an original saved Forge creation. Uses original status verification and independently hashes its bounded GLB through the existing private reader; no new job or execution authority.',
    inputSchema:savedJobInput
  },async input=>{
    const result=await reopenForgeSavedJobMcp(options,input);
    return {content:[{type:'text',text:JSON.stringify(result)}],isError:result.accepted!==true};
  });
  if(options.forge.verifyRequest)register('mgr_forge_request_verify',{
    description:'Read-only verification that an existing native Forge job matches these exact original creation instructions and sources. Does not create, retry, approve, cancel or grant authority. RUNNING/FAILED/NEEDS_RECONCILIATION remain their actual states.',
    inputSchema:forgeVerifyInput
  },async input=>{
    const result=await verifyForgeRequestMcp(options,input);
    return {content:[{type:'text',text:JSON.stringify(result)}],isError:result.accepted!==true};
  });
  register("mgr_forge_asset_discover",{
    description:"Search MGR Forge's approved source directories and public asset metadata; read only.",
    inputSchema:z.object({
      mode:z.enum(["sources","models"]).default("sources"),
      query:z.string().max(120).default(""),
      category:z.string().max(48).optional(),
      provider:z.enum(["3dassets","polyhaven","ambientcg"]).default("3dassets"),
      kind:z.enum(["models","textures","hdris"]).default("models"),
      live:z.boolean().default(false),
      limit:z.number().int().min(1).max(100).default(6)
    })
  },async input=>{
    const search:ForgeCatalogSearch={mode:input.mode,query:input.query,
                                      live:input.live,limit:input.limit,
                                      provider:input.provider,kind:input.kind};
    if(input.category) search.category=input.category;
    const result=await searchForgeMcp(options,search);
    return {content:[{type:"text",text:JSON.stringify(result)}],isError:result.accepted!==true};
  });
  if(options.forge.createCreature){
    register("mgr_forge_creature_create",{
      description:"Generate an original CPU procedural creature GLB through authenticated Forge. Requires tools:execute, stable request ID; returns hashed local artifact. No paid model/API or public hosted download.",
      inputSchema:forgeCreatureInput
    },async input=>{
      const creatureInput:ForgeCreatureInput={requestId:input.requestId,prompt:input.prompt,seed:input.seed,variants:input.variants,...(input.morph===undefined?{}:{morph:input.morph})};
      const result=await createForgeCreatureMcp(options,creatureInput);
      return {content:[{type:"text",text:JSON.stringify(result)}],isError:result.accepted!==true};
    });
  }
  if(options.forge.creatureStatus){
    register("mgr_forge_creature_status",{
      description:"Read exact native creature job ID and hash through existing Forge Studio; tenant-bound and tools:read.",
      inputSchema:z.object({requestId:z.string().regex(/^[A-Za-z0-9_-]{12,100}$/)})
    },async input=>{
      const result=await statusForgeCreatureMcp(options,input.requestId);
      return {content:[{type:"text",text:JSON.stringify(result)}],isError:result.accepted!==true};
    });
  }
  if(options.forge.createBiome){
    register("mgr_forge_biome_create",{
      description:"Build original city-preserving terrain as an optional Forge GLB layer; requires tools:execute, no rented neural GPU",
      inputSchema:forgeBiomeInput
    },async input=>{
      const result=await createForgeBiomeMcp(options,input);
      return {content:[{type:"text",text:JSON.stringify(result)}],isError:result.accepted!==true};
    });
  }
  if(options.forge.biomeStatus){
    register("mgr_forge_biome_status",{
      description:"Read an existing original Forge biome layer receipt through a tenant-bound source state",
      inputSchema:z.object({requestId:z.string().regex(/^[A-Za-z0-9_-]{12,100}$/)})
    },async input=>{
      const result=await statusForgeBiomeMcp(options,input.requestId);
      return {content:[{type:"text",text:JSON.stringify(result)}],isError:result.accepted!==true};
    });
  }
  if(options.forge.readArtifact){
    register("mgr_forge_artifact_read",{
      description:"Read exact tenant-authorized Forge GLB bytes by immutable job ID and SHA-256 via the existing MCP edge; optional embedded binary resource, not a public URL.",
      inputSchema:z.object({
        jobId:z.string().regex(/^[a-f0-9]{24}$/),
        kind:z.enum(["creature","biome","world","human","composed"]),
        expectedSha256:z.string().regex(/^[a-f0-9]{64}$/),
        includeData:z.boolean().default(false)
      }).strict()
    },async input=>{
      const report=await readForgeArtifactMcp(options,{
        jobId:input.jobId,kind:input.kind,expectedSha256:input.expectedSha256
      });
      if(report.accepted!==true){
        return {content:[{type:"text" as const,text:JSON.stringify(report)}],isError:true};
      }
      const blob=String(report.blobBase64);
      const summary={...report,blobBase64:undefined};
      const content:Array<any>=[{type:"text",text:JSON.stringify(summary)}];
      if(input.includeData)content.push({type:"resource",resource:{
        uri:"mgr-forge://artifact/"+input.jobId+"/"+input.kind,
        mimeType:"model/gltf-binary",blob
      }});
      return {content,isError:false};
    });
  }
  if(options.forge.startHumanLipSync){
    register("mgr_forge_human_lipsync_start",{
      description:"Start existing Human Forge Blender facial animation from user-supplied timed phonemes; creates generic model, no inferred raw audio or human likeness, requires tools:execute.",
      inputSchema:forgeHumanInput
    },async input=>{
      const result=await startForgeHumanLipSyncMcp(options,input);
      return {content:[{type:"text",text:JSON.stringify(result)}],isError:result.accepted!==true};
    });
  }
  if(options.forge.humanLipSyncStatus){
    register("mgr_forge_human_lipsync_status",{
      description:"Read a protected Human Forge lip-sync Blender job status and its real GLB morph SHA without running another job.",
      inputSchema:z.object({requestId:z.string().regex(/^[A-Za-z0-9_-]{12,100}$/)})
    },async input=>{
      const result=await statusForgeHumanLipSyncMcp(options,input.requestId);
      return {content:[{type:"text",text:JSON.stringify(result)}],isError:result.accepted!==true};
    });
  }
  if(options.forge.createComposition){
    register("mgr_forge_world_compose_create",{
      description:"Merge an already saved original MGR world + pinned Forge biome in a real Blender job. Same shared MCP/Forge worker; independent reimport required.",
      inputSchema:forgeCompositionInput
    },async input=>{
      const result=await createForgeCompositionMcp(options,input);
      return {content:[{type:"text",text:JSON.stringify(result)}],isError:result.accepted!==true};
    });
  }
  if(options.forge.compositionStatus){
    register("mgr_forge_world_compose_status",{
      description:"Read the exact original MGR World composition Blender job, GLB SHA and private artifact proof with the existing tools:read scope.",
      inputSchema:z.object({requestId:z.string().regex(/^[A-Za-z0-9_-]{12,100}$/)})
    },async input=>{
      const result=await statusForgeCompositionMcp(options,input.requestId);
      return {content:[{type:"text",text:JSON.stringify(result)}],isError:result.accepted!==true};
    });
  }
  if(options.forge.createWorld){
    register("mgr_forge_world_create",{
      description:"With tools:execute permission, materialize one idempotent local Forge world edit and return the actual GLB SHA-256; Creation OS not required.",
      inputSchema:forgeWorldInput
    },async input=>{
      const result=await createForgeWorldMcp(options,{requestId:input.requestId,edits:input.edits});
      return {content:[{type:"text",text:JSON.stringify(result)}],isError:result.accepted!==true};
    });
  }
  if(options.forge.worldStatus){
    register("mgr_forge_world_status",{
      description:"Read an existing Forge world job by stable request ID; reconciliation instead of blind retry.",
      inputSchema:z.object({requestId:z.string().regex(/^[A-Za-z0-9_-]{12,100}$/)})
    },async input=>{
      const result=await statusForgeWorldMcp(options,input.requestId);
      return {content:[{type:"text",text:JSON.stringify(result)}],isError:result.accepted!==true};
    });
  }
}
