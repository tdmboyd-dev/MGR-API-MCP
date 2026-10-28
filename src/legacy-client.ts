import {createHash} from "node:crypto";
export interface LegacyEdgeContext {
  tenantId:string;
  actorId:string;
  correlationId:string;
  idempotencyKey:string;
  scopeType?:"organization"|"workspace"|"bureau"|"office"|"team"|"user"|"agent";
  scopeId?:string;
}

export interface LegacyCommandRequest {
  action:string;
  payload:Record<string,unknown>;
  target?:{entityType:string;entityId:string};
}

export interface LegacyCommandResult {
  accepted:boolean;
  event?:Record<string,unknown>;
  result?:unknown;
  approvalId?:string;
  receiptId?:string;
  correlationId?:string;
  replayed?:boolean;
}

export interface LegacyTruthSummary {
  total:number;
  succeeded:number;
  failed:number;
  blocked:number;
  approvalRate:number;
  totalProviderCost:number;
}

export interface LegacyClientConfig {
  baseUrl:string;
  bearerToken?:string;
  fetcher?:typeof fetch;
  timeoutMs?:number;
  maxResponseBytes?:number;
  actorId?:string;
}

export function legacyRequestDigest(context:LegacyEdgeContext,request:LegacyCommandRequest):string{
  const stable=(value:unknown):unknown=>Array.isArray(value)?value.map(stable):value && typeof value==="object"?Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)])):value;
  const target=request.target ?? (request.payload.id?{entityType:"custom",entityId:String(request.payload.id)}:undefined);
  return createHash("sha256").update(JSON.stringify(stable({actor:{actorType:"service",actorId:context.actorId,tenantId:context.tenantId},scope:{tenantId:context.tenantId,scopeType:context.scopeType ?? "organization",scopeId:context.scopeId ?? context.tenantId},action:request.action,target,payload:request.payload}))).digest("hex");
}

export class LegacyRequestError extends Error {
  constructor(message:string,readonly status?:number){super(message);this.name="LegacyRequestError";}
}

export class LegacyEdgeClient {
  private readonly fetcher:typeof fetch;

  constructor(private readonly config:LegacyClientConfig){
    this.fetcher=config.fetcher ?? fetch;
  }

  async execute(context:LegacyEdgeContext,request:LegacyCommandRequest):Promise<LegacyCommandResult>{
    return this.request("/v1/commands",{
      method:"POST",
      context,
      body:{
        action:request.action,
        payload:request.payload,
        target:request.target,
        metadata:{
          tenantId:context.tenantId,
          userId:context.actorId,
          correlationId:context.correlationId,
          idempotencyKey:context.idempotencyKey,
          scopeType:context.scopeType ?? "organization",
          scopeId:context.scopeId ?? context.tenantId
        }
      }
    });
  }

  async truthSummary(
    tenantId:string,
    filters:{correlationId?:string;actorId?:string;action?:string;status?:string;limit?:number}={}
  ):Promise<LegacyTruthSummary>{
    const query=new URLSearchParams();
    for(const [key,value] of Object.entries(filters)){
      if(value!==undefined) query.set(key,String(value));
    }
    return this.request(`/v1/truth/summary${query.size?`?${query}`:""}`,{
      method:"GET",
      tenantId
    });
  }

  async truthReceipts<T=unknown>(
    tenantId:string,
    filters:{correlationId?:string;actorId?:string;action?:string;status?:string;limit?:number}={},
    context?:LegacyEdgeContext
  ):Promise<T[]>{
    const query=new URLSearchParams();
    for(const [key,value] of Object.entries(filters)){
      if(value!==undefined) query.set(key,String(value));
    }
    return this.request(`/v1/truth/receipts${query.size?`?${query}`:""}`,{
      method:"GET",
      tenantId,
      ...(context?{context}:{})
    });
  }

  async getEntity<T=unknown>(context:LegacyEdgeContext,id:string):Promise<T>{
    return this.request(`/v1/entities/${encodeURIComponent(id)}`,{method:"GET",context});
  }

  async listConnectors<T=unknown>(tenantId:string):Promise<T[]>{
    return this.request("/v1/connectors",{method:"GET",tenantId});
  }

  private async request<T>(
    path:string,
    input:{
      method:"GET"|"POST";
      tenantId?:string;
      context?:LegacyEdgeContext;
      body?:unknown;
    }
  ):Promise<T>{
    const url=new URL(path,this.config.baseUrl).toString();
    const headers:Record<string,string>={"content-type":"application/json"};
    if(this.config.bearerToken) headers.authorization=`Bearer ${this.config.bearerToken}`;
    const tenantId=input.context?.tenantId ?? input.tenantId;
    if(tenantId) headers["x-tenant-id"]=tenantId;
    const actorId=input.context?.actorId ?? this.config.actorId;
    if(actorId) headers["x-actor-id"]=actorId;
    if(input.context){
      headers["x-correlation-id"]=input.context.correlationId;
      headers["x-idempotency-key"]=input.context.idempotencyKey;
    }

    const init:RequestInit={
      method:input.method,
      redirect:"error",
      headers
    };
    if(input.body!==undefined) init.body=JSON.stringify(input.body);
    const timeoutMs=this.config.timeoutMs ?? 15_000;
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    init.signal=controller.signal;
    const maxBytes=this.config.maxResponseBytes ?? 1_048_576;
    let rejectTimeout:(reason:unknown)=>void=()=>{};
    const expired=new Promise<never>((_resolve,reject)=>{rejectTimeout=reject;});
    // A deadline must cover headers AND response streaming. Injected transports may ignore abort.
    clearTimeout(timer);
    const deadline=setTimeout(()=>{controller.abort();rejectTimeout(new LegacyRequestError(`Legacy request timed out after ${timeoutMs}ms`));},timeoutMs);
    try{
      const operation=async()=>{
        const response=await this.fetcher(url,init);
        const reader=response.body?.getReader();
        const chunks:Uint8Array[]=[];let size=0;
        if(reader){
          try{for(;;){const part=await reader.read();if(part.done) break;size+=part.value.byteLength;if(size>maxBytes) throw new LegacyRequestError("Legacy response exceeds size limit");chunks.push(part.value);}}
          finally{void reader.cancel().catch(()=>{});}
        }
        const text=Buffer.concat(chunks).toString("utf8");
        if(!response.ok) throw new LegacyRequestError(`Legacy request failed: HTTP ${response.status}`,response.status);
        try{return (text?JSON.parse(text):{}) as T;}catch{throw new LegacyRequestError("Legacy returned invalid JSON");}
      };
      return await Promise.race([operation(),expired]);
    }catch(error){
      if(error instanceof LegacyRequestError) throw error;
      if(controller.signal.aborted) throw new LegacyRequestError(`Legacy request timed out after ${timeoutMs}ms`);
      throw new LegacyRequestError("Legacy transport unavailable");
    }finally{clearTimeout(deadline);}
  }
}
