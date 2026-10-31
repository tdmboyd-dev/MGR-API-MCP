/** Read-only catalog adapter for the MGR Forge local Studio; no 3D execution. */

export interface ForgeCatalogSearch {
  mode:"sources"|"models";
  query:string;
  category?:string;
  live?:boolean;
  limit?:number;
  provider?:"3dassets"|"polyhaven";
  kind?:"models"|"textures"|"hdris";
}

export interface ForgeCatalogClient {
  search(input:ForgeCatalogSearch):Promise<Record<string,unknown>>;
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
      throw new Error("Forge catalog timeout out of bounds");
    }
    this.transport=options.transport ?? fetch;
  }

  async search(input:ForgeCatalogSearch):Promise<Record<string,unknown>>{
    if(input.query.length>120 || (input.mode==="models" && input.live && !input.query.trim())){
      throw new Error("Forge asset search must be bounded and nonempty for live lookup");
    }
    const route=input.mode==="sources"?"/api/asset-sources":"/api/asset-search";
    const request:Record<string,unknown>={query:input.query};
    if(input.category) request.category=input.category;
    if(input.mode==="models"){
      request.live=input.live ?? false;
      request.limit=input.limit ?? (input.provider==="polyhaven"?6:20);
      request.provider=input.provider ?? "3dassets";
      request.kind=input.kind ?? "models";
    }
    const response=await this.transport(new URL(route,this.baseUrl),{
      method:"POST",
      headers:{"Content-Type":"application/json","X-MGR-Forge-Token":this.token},
      body:JSON.stringify(request),
      signal:AbortSignal.timeout(this.timeoutMs),
      redirect:"error"
    });
    if(!response.ok) throw new Error(`Forge source directory returned HTTP ${response.status}`);
    const declared=Number(response.headers.get("content-length") ?? "0");
    if(!Number.isFinite(declared) || declared>300_000){
      throw new Error("Forge catalog response outside byte budget");
    }
    const reader=response.body?.getReader();
    if(!reader) throw new Error("Forge catalog response has no body");
    const chunks:Uint8Array[]=[];
    let size=0;
    try{
      for(;;){
        const {value,done}=await reader.read();
        if(done) break;
        size+=value.byteLength;
        if(size>300_000) throw new Error("Forge catalog response outside byte budget");
        chunks.push(value);
      }
    }finally{
      reader.releaseLock();
    }
    const parsed:unknown=JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));
    if(!parsed || typeof parsed!=="object" || Array.isArray(parsed)){
      throw new Error("Forge catalog returned invalid JSON envelope");
    }
    return parsed as Record<string,unknown>;
  }
}
