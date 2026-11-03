/** Bounded authenticated adapter to Forge Studio catalog, durable creation and files. */
import {createHash} from "node:crypto";
import {inspectForgeGlb} from './forge-glb.js';
import {forgeNativeVerifyInput,forgeReconstructionInput,forgeMorphInput,forgeUvInput,nativeAssetRequest,type ForgeNativeRequestVerification,type ForgeReconstructionInput,type ForgeMorphInput,type ForgeUvInput} from './forge-asset-inputs.js';
export interface ForgeCatalogSearch {
  mode:"sources"|"models";
  query:string;
  category?:string;
  live?:boolean;
  limit?:number;
  provider?:"3dassets"|"polyhaven"|"ambientcg";
  kind?:"models"|"textures"|"hdris";
}
export interface ForgeWorldEdits {
  schema:"mgr.forge.world-edit.v1";
  asset_sha256:string;
  buildings:Array<{id:string;center:number[];size:number[];material:string}>;
}
export interface ForgeCreatureInput {
  requestId:string;
  prompt:string;
  seed:number;
  variants:number;
  morph?:{length?:number|undefined;height?:number|undefined;width?:number|undefined;twist_degrees?:number|undefined;bend_degrees?:number|undefined;taper?:number|undefined};
}
export interface ForgeBiomeInput {
  requestId:string;
  biome:"forest"|"desert"|"tundra"|"volcanic"|"alien";
  seed:number;
  resolution:number;
}
export interface ForgeWorldCompositionInput{
  requestId:string;
  biomeRequestId:string;
}
export interface ForgeArtifactRequest {
  jobId:string;
  kind:"creature"|"biome"|"world"|"human"|"composed"|"reconstruction"|"morph"|"uv";
  expectedSha256:string;
}
// UV seam expansion can exceed the default binary cap while fitting the same base64 envelope.
export const forgeArtifactByteLimit=(kind:ForgeArtifactRequest['kind'])=>kind==='uv'?825_000:800_000;
export interface ForgeArtifactProof {
  blobBase64:string;
  sha256:string;
  bytes:number;
  mimeType:"model/gltf-binary";
}
export type ForgeSavedKind="world"|"creature"|"biome"|"human"|"composed"|"reconstruction"|"morph"|"uv";
export interface ForgeSavedJobsInput {
  kind?:ForgeSavedKind|"all"|undefined;
  limit?:number|undefined;
  cursor?:string|undefined;
}
export interface ForgeSavedJobInput {kind:ForgeSavedKind;requestId:string;}
export interface ForgeHumanLipSyncInput{
 requestId:string;
 fps:number;
 timings:{
  schema:"mgr.forge.phoneme-timeline.v1";
  actor_id:string;
  language:"en-US";
  duration_ms:number;
  phonemes:Array<{phoneme:string;start_ms:number;end_ms:number}>;
 };
}
export interface ForgeCatalogClient {
  listSavedJobs?(input:ForgeSavedJobsInput):Promise<Record<string,unknown>>;
  reopenSavedJob?(input:ForgeSavedJobInput):Promise<Record<string,unknown>>;
  readWorldContext?():Promise<Record<string,unknown>>;
  verifyRequest?(input:ForgeNativeRequestVerification):Promise<Record<string,unknown>>;
  createReconstruction?(input:ForgeReconstructionInput):Promise<Record<string,unknown>>;
  reconstructionStatus?(requestId:string):Promise<Record<string,unknown>>;
  createMorph?(input:ForgeMorphInput):Promise<Record<string,unknown>>;
  morphStatus?(requestId:string):Promise<Record<string,unknown>>;
  createUv?(input:ForgeUvInput):Promise<Record<string,unknown>>;
  resolveUvSource?(source:{requestId:string;expectedSha256:string}):Promise<ForgeArtifactProof>;
  uvStatus?(requestId:string):Promise<Record<string,unknown>>;
  search(input:ForgeCatalogSearch):Promise<Record<string,unknown>>;
  createWorld?(input:{requestId:string;edits:ForgeWorldEdits}):Promise<Record<string,unknown>>;
  worldStatus?(requestId:string):Promise<Record<string,unknown>>;
  createCreature?(input:ForgeCreatureInput):Promise<Record<string,unknown>>;
  creatureStatus?(requestId:string):Promise<Record<string,unknown>>;
  createBiome?(input:ForgeBiomeInput):Promise<Record<string,unknown>>;
  biomeStatus?(requestId:string):Promise<Record<string,unknown>>;
  createComposition?(input:ForgeWorldCompositionInput):Promise<Record<string,unknown>>;
  compositionStatus?(requestId:string):Promise<Record<string,unknown>>;
  readArtifact?(input:ForgeArtifactRequest):Promise<ForgeArtifactProof>;
  startHumanLipSync?(input:ForgeHumanLipSyncInput):Promise<Record<string,unknown>>;
  humanLipSyncStatus?(requestId:string):Promise<Record<string,unknown>>;
}
export interface ForgeStudioCatalogOptions {
  baseUrl:string;
  token:string;
  timeoutMs?:number;
  transport?:typeof fetch;
}

export class ForgeStudioCatalogClient implements ForgeCatalogClient {
  private readonly baseUrl:URL;
  private readonly token:string;
  private readonly timeoutMs:number;
  private readonly transport:typeof fetch;

  constructor(options:ForgeStudioCatalogOptions){
    const url=new URL(options.baseUrl);
    if(url.username || url.password || url.search || url.hash ||
       !(url.protocol==="https:" || (url.protocol==="http:" && url.hostname==="127.0.0.1"))){
      throw new Error("Forge Studio must be HTTPS or a literal 127.0.0.1 loopback endpoint");
    }
    if(!options.token.trim()) throw new Error("Forge Studio token is required");
    this.baseUrl=url;
    this.token=options.token;
    this.timeoutMs=options.timeoutMs ?? 10_000;
    if(!Number.isFinite(this.timeoutMs) || this.timeoutMs<=0 || this.timeoutMs>30_000){
      throw new Error("Forge Studio timeout out of bounds");
    }
    this.transport=options.transport ?? fetch;
  }

  async readWorldContext():Promise<Record<string,unknown>>{return this.post('/api/world-context',{});}
  async listSavedJobs(input:ForgeSavedJobsInput):Promise<Record<string,unknown>>{
    if(!input||typeof input!=='object'||Array.isArray(input)||
       Object.keys(input).some(key=>!['kind','limit','cursor'].includes(key))||
       (input.kind!==undefined&&!['all','world','creature','biome','human','composed','reconstruction','morph','uv'].includes(input.kind))||
       (input.limit!==undefined&&(!Number.isInteger(input.limit)||input.limit<1||input.limit>20))||
       (input.cursor!==undefined&&(typeof input.cursor!=='string'||!/^([a-f0-9]{64}:[0-9]{1,4})?$/.test(input.cursor)))){
      throw Error('Invalid bounded saved Forge jobs request');
    }
    return this.post('/api/saved-jobs',{...input});
  }
  async reopenSavedJob(input:ForgeSavedJobInput):Promise<Record<string,unknown>>{
    if(!input||typeof input!=='object'||Array.isArray(input)||
       Object.keys(input).some(key=>!['kind','requestId'].includes(key))||
       !['world','creature','biome','human','composed','reconstruction','morph','uv'].includes(input.kind)||
       typeof input.requestId!=='string'||!/^[A-Za-z0-9_-]{12,100}$/.test(input.requestId)){
      throw Error('Invalid saved Forge creation identity');
    }
    return this.post('/api/saved-job-reopen',{kind:input.kind,request_id:input.requestId});
  }
  async verifyRequest(raw:ForgeNativeRequestVerification):Promise<Record<string,unknown>>{
    const value=forgeNativeVerifyInput.parse(raw);
    let request:Record<string,unknown>;
    switch(value.kind){
      case 'world':request={request_id:value.input.requestId,edits:value.input.edits};break;
      case 'creature':request={request_id:value.input.requestId,prompt:value.input.prompt,seed:value.input.seed,variants:value.input.variants,morph:value.input.morph??{}};break;
      case 'biome':request={request_id:value.input.requestId,biome:value.input.biome,seed:value.input.seed,resolution:value.input.resolution};break;
      case 'human':request={request_id:value.input.requestId,timings:value.input.timings,fps:value.input.fps};break;
      case 'composed':request={request_id:value.input.requestId,biome_request_id:value.input.biomeRequestId};break;
      case 'reconstruction':case 'morph':case 'uv':request=nativeAssetRequest(value);break;
    }
    return this.post('/api/request-verify',{kind:value.kind,request});
  }

  async createReconstruction(raw:ForgeReconstructionInput):Promise<Record<string,unknown>>{
    return this.post('/api/reconstruction-create',nativeAssetRequest({kind:'reconstruction',input:forgeReconstructionInput.parse(raw)}));
  }
  async createMorph(raw:ForgeMorphInput):Promise<Record<string,unknown>>{
    return this.post('/api/morph-create',nativeAssetRequest({kind:'morph',input:forgeMorphInput.parse(raw)}));
  }
  async createUv(raw:ForgeUvInput):Promise<Record<string,unknown>>{
    return this.post('/api/uv-create',nativeAssetRequest({kind:'uv',input:forgeUvInput.parse(raw)}));
  }
  async resolveUvSource(source:{requestId:string;expectedSha256:string}):Promise<ForgeArtifactProof>{
    if(!/^[a-f0-9]{64}$/.test(source.expectedSha256))throw Error('Invalid UV source digest');
    const saved=await this.reopenSavedJob({kind:'reconstruction',requestId:source.requestId});
    if(saved.status!=='MATERIALIZED'||saved.request_id!==source.requestId||
       saved.asset_sha256!==source.expectedSha256||typeof saved.job_id!=='string')
      throw Error('Saved UV source does not match approved reconstruction identity');
    const proof=await this.readArtifact({kind:'reconstruction',jobId:saved.job_id,expectedSha256:source.expectedSha256});
    if(proof.bytes!==saved.asset_bytes)throw Error('Saved UV source byte count changed');
    return proof;
  }
  async uvStatus(requestId:string):Promise<Record<string,unknown>>{
    if(typeof requestId!=='string'||!/^[A-Za-z0-9_-]{12,100}$/.test(requestId))throw Error('Invalid native UV ID');
    return this.post('/api/uv-status',{request_id:requestId});
  }
  async reconstructionStatus(requestId:string):Promise<Record<string,unknown>>{
    if(typeof requestId!=='string'||!/^[A-Za-z0-9_-]{12,100}$/.test(requestId))throw Error('Invalid native reconstruction ID');
    return this.post('/api/reconstruction-status',{request_id:requestId});
  }
  async morphStatus(requestId:string):Promise<Record<string,unknown>>{
    if(typeof requestId!=='string'||!/^[A-Za-z0-9_-]{12,100}$/.test(requestId))throw Error('Invalid native morph ID');
    return this.post('/api/morph-status',{request_id:requestId});
  }

  async search(input:ForgeCatalogSearch):Promise<Record<string,unknown>>{
    if(input.query.length>120 || (input.mode==="models" && input.live && !input.query.trim())){
      throw new Error("Forge source query must be bounded and nonempty for live lookup");
    }
    const route=input.mode==="sources"?"/api/asset-sources":"/api/asset-search";
    const request:Record<string,unknown>={query:input.query};
    if(input.category) request.category=input.category;
    if(input.mode==="models"){
      request.live=input.live ?? false;
      request.limit=input.limit ?? (input.provider==="3dassets"?20:6);
      request.provider=input.provider ?? "3dassets";
      request.kind=input.kind ?? "models";
    }
    return this.post(route,request);
  }

  async createWorld(input:{requestId:string;edits:ForgeWorldEdits}):Promise<Record<string,unknown>>{
    if(!/^[A-Za-z0-9_-]{12,100}$/.test(input.requestId)){
      throw new Error("Forge world request requires stable 12..100 character id");
    }
    if(!input.edits || input.edits.schema!=="mgr.forge.world-edit.v1" ||
       !/^[a-f0-9]{64}$/.test(input.edits.asset_sha256) || !Array.isArray(input.edits.buildings)){
      throw new Error("Forge world edits contract invalid");
    }
    return this.post("/api/world-job",{request_id:input.requestId,edits:input.edits});
  }

  async worldStatus(requestId:string):Promise<Record<string,unknown>>{
    if(!/^[A-Za-z0-9_-]{12,100}$/.test(requestId)){
      throw new Error("Forge world request id invalid");
    }
    return this.post("/api/world-job-status",{request_id:requestId});
  }

  async createCreature(input:ForgeCreatureInput):Promise<Record<string,unknown>>{
    if(!/^[A-Za-z0-9_-]{12,100}$/.test(input.requestId) ||
       typeof input.prompt!=="string" || input.prompt.trim().length<8 ||
       input.prompt.length>500 || !Number.isInteger(input.seed) || input.seed<0 ||
       input.seed>=4294967296 || !Number.isInteger(input.variants) || input.variants<1 || input.variants>12){
      throw new Error("Forge creature input violates bounded request contract");
    }
    const morph=input.morph ?? {};
    if(Object.keys(morph).some(k=>!["length","height","width","twist_degrees","bend_degrees","taper"].includes(k))){
      throw new Error("Unsupported creature morph field");
    }
    return this.post("/api/creature-create",{
      request_id:input.requestId,prompt:input.prompt,seed:input.seed,
      variants:input.variants,morph
    });
  }

  async creatureStatus(requestId:string):Promise<Record<string,unknown>>{
    if(!/^[A-Za-z0-9_-]{12,100}$/.test(requestId))
      throw new Error("Forge creature request ID invalid");
    return this.post("/api/creature-status",{request_id:requestId});
  }

  async createBiome(input:ForgeBiomeInput):Promise<Record<string,unknown>>{
    if(!/^[A-Za-z0-9_-]{12,100}$/.test(input.requestId) ||
       !["forest","desert","tundra","volcanic","alien"].includes(input.biome) ||
       !Number.isInteger(input.seed) || input.seed<0 || input.seed>4294967295 ||
       !Number.isInteger(input.resolution) || input.resolution<10 || input.resolution>64)
      throw new Error("Forge biome parameters invalid");
    return this.post("/api/biome-create",{request_id:input.requestId,
                      biome:input.biome,seed:input.seed,resolution:input.resolution});
  }

  async biomeStatus(requestId:string):Promise<Record<string,unknown>>{
    if(!/^[A-Za-z0-9_-]{12,100}$/.test(requestId))throw new Error("Forge biome ID invalid");
    return this.post("/api/biome-status",{request_id:requestId});
  }

  async createComposition(input:ForgeWorldCompositionInput):Promise<Record<string,unknown>>{
    if(!/^[A-Za-z0-9_-]{12,100}$/.test(input.requestId) ||
       !/^[A-Za-z0-9_-]{12,100}$/.test(input.biomeRequestId))
      throw new Error("Invalid stable World Forge composition request/biome ID");
    return this.post("/api/world-compose-create",{
      request_id:input.requestId,biome_request_id:input.biomeRequestId});
  }
  async compositionStatus(requestId:string):Promise<Record<string,unknown>>{
    if(!/^[A-Za-z0-9_-]{12,100}$/.test(requestId))
      throw new Error("Invalid World Forge composition status request");
    return this.post("/api/world-compose-status",{request_id:requestId});
  }
  async startHumanLipSync(input:ForgeHumanLipSyncInput):Promise<Record<string,unknown>>{
    if(!/^[A-Za-z0-9_-]{12,100}$/.test(input.requestId) ||
       !Number.isInteger(input.fps) || input.fps<12 || input.fps>60 ||
       !input.timings || input.timings.schema!=="mgr.forge.phoneme-timeline.v1" ||
       input.timings.language!=="en-US" || typeof input.timings.actor_id!=="string" ||
       !Number.isInteger(input.timings.duration_ms) ||
       input.timings.duration_ms<100 || input.timings.duration_ms>120000 ||
       !Array.isArray(input.timings.phonemes) || input.timings.phonemes.length<1 ||
       input.timings.phonemes.length>1000)throw new Error("Invalid Human Forge timing or actor");
    return this.post("/api/human-lipsync-start",{
      request_id:input.requestId,timings:input.timings,fps:input.fps
    });
  }

  async humanLipSyncStatus(requestId:string):Promise<Record<string,unknown>>{
    if(!/^[A-Za-z0-9_-]{12,100}$/.test(requestId))
      throw new Error("Invalid Human Forge request ID");
    return this.post("/api/human-lipsync-status",{request_id:requestId});
  }

  async readArtifact(input:ForgeArtifactRequest):Promise<ForgeArtifactProof>{
    if(!/^[a-f0-9]{24}$/.test(input.jobId) ||
       !/^[a-f0-9]{64}$/.test(input.expectedSha256) ||
       !["creature","biome","world","human","composed","reconstruction","morph","uv"].includes(input.kind)){
      throw new Error("Invalid Forge artifact identity or expected digest");
    }
    const route={
      creature:"creature/creature.glb",
      biome:"biome/biome.glb",
      world:"edited/world.glb",
      human:"human/facial-animation/human-lipsync.glb",
      composed:"composed/world.glb",
      reconstruction:"reconstructed/hull.glb",
      morph:"morphed/morphed.glb",
      uv:"uv/uv-mapped.glb"
    }[input.kind];
    const path=new URL("/files/"+input.jobId+"/"+route,this.baseUrl);
    const response=await this.transport(path,{
      method:"GET",headers:{"X-MGR-Forge-Token":this.token},
      signal:AbortSignal.timeout(this.timeoutMs),redirect:"error"
    });
    if(!response.ok){try{await response.body?.cancel();}catch{}throw new Error("Forge artifact read returned HTTP "+response.status);}
    const binary=await this.responseBytes(response,forgeArtifactByteLimit(input.kind),'Forge artifact exceeds bounded MCP transfer size');
    inspectForgeGlb(binary,forgeArtifactByteLimit(input.kind));
    const sha=createHash("sha256").update(binary).digest("hex");
    if(sha!==input.expectedSha256)
      throw new Error("Forge artifact SHA-256 changed from job receipt; reconciliation required");
    return {blobBase64:binary.toString("base64"),sha256:sha,bytes:binary.length,
            mimeType:"model/gltf-binary"};
  }

  private async post(route:string,request:Record<string,unknown>):Promise<Record<string,unknown>>{
    const body=JSON.stringify(request);
    if(Buffer.byteLength(body)>1_200_000) throw new Error("Forge request exceeds byte budget");
    const response=await this.transport(new URL(route,this.baseUrl),{
      method:"POST",
      headers:{"Content-Type":"application/json","X-MGR-Forge-Token":this.token},
      body, signal:AbortSignal.timeout(this.timeoutMs), redirect:"error"
    });
    if(!response.ok){try{await response.body?.cancel();}catch{}throw new Error(`Forge Studio returned HTTP ${response.status}`);}
    const bytes=await this.responseBytes(response,300_000,'Forge response outside byte budget');
    const parsed:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes));
    if(!parsed || typeof parsed!=="object" || Array.isArray(parsed)){
      throw new Error("Forge returned invalid JSON envelope");
    }
    return parsed as Record<string,unknown>;
  }

  private async responseBytes(response:Response,limit:number,message:string):Promise<Buffer>{
    let reader:ReadableStreamDefaultReader<Uint8Array>|undefined,complete=false;
    try{
      const declared=response.headers.get('content-length');
      if(declared!==null&&(!/^\d+$/.test(declared)||!Number.isSafeInteger(Number(declared))||Number(declared)>limit))throw Error(message);
      if(!response.body)throw Error('Forge response has no body');
      reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
      for(;;){const {value,done}=await reader.read();if(done){complete=true;break;}size+=value.byteLength;if(size>limit||chunks.length>=4096)throw Error(message);chunks.push(value);}
      if(declared!==null&&Number(declared)!==size)throw Error('Forge declared response length mismatch');
      return Buffer.concat(chunks);
    }finally{
      try{if(!complete){if(reader)await reader.cancel();else if(response.body)await response.body.cancel();}}catch{/* Preserve original invalid/unconfirmed result. */}
      finally{reader?.releaseLock();}
    }
  }
}
