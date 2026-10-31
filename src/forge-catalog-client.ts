/** Bounded authenticated adapter to Forge Studio's catalog and durable world jobs. */
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
  morph?:{length?:number|undefined;height?:number|undefined;width?:number|undefined;twist_degrees?:number|undefined};
}
export interface ForgeCatalogClient {
  search(input:ForgeCatalogSearch):Promise<Record<string,unknown>>;
  createWorld?(input:{requestId:string;edits:ForgeWorldEdits}):Promise<Record<string,unknown>>;
  worldStatus?(requestId:string):Promise<Record<string,unknown>>;
  createCreature?(input:ForgeCreatureInput):Promise<Record<string,unknown>>;
  creatureStatus?(requestId:string):Promise<Record<string,unknown>>;
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
    if(Object.keys(morph).some(k=>!["length","height","width","twist_degrees"].includes(k))){
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

  private async post(route:string,request:Record<string,unknown>):Promise<Record<string,unknown>>{
    const body=JSON.stringify(request);
    if(Buffer.byteLength(body)>1_200_000) throw new Error("Forge request exceeds byte budget");
    const response=await this.transport(new URL(route,this.baseUrl),{
      method:"POST",
      headers:{"Content-Type":"application/json","X-MGR-Forge-Token":this.token},
      body, signal:AbortSignal.timeout(this.timeoutMs), redirect:"error"
    });
    if(!response.ok) throw new Error(`Forge Studio returned HTTP ${response.status}`);
    const declared=Number(response.headers.get("content-length") ?? "0");
    if(!Number.isFinite(declared) || declared>300_000){
      throw new Error("Forge response outside byte budget");
    }
    const reader=response.body?.getReader();
    if(!reader) throw new Error("Forge response has no body");
    const chunks:Uint8Array[]=[];
    let size=0;
    try{
      for(;;){
        const {value,done}=await reader.read();
        if(done) break;
        size+=value.byteLength;
        if(size>300_000) throw new Error("Forge response outside byte budget");
        chunks.push(value);
      }
    }finally{
      reader.releaseLock();
    }
    const parsed:unknown=JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));
    if(!parsed || typeof parsed!=="object" || Array.isArray(parsed)){
      throw new Error("Forge returned invalid JSON envelope");
    }
    return parsed as Record<string,unknown>;
  }
}
