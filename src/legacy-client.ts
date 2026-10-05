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
        metadata:{
          tenantId:context.tenantId,
          userId:context.actorId,
          correlationId:context.correlationId,
          idempotencyKey:context.idempotencyKey,
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
    filters:{correlationId?:string;actorId?:string;action?:string;status?:string;limit?:number}={}
  ):Promise<T[]>{
    const query=new URLSearchParams();
    for(const [key,value] of Object.entries(filters)){
      if(value!==undefined) query.set(key,String(value));
    }
    return this.request(`/v1/truth/receipts${query.size?`?${query}`:""}`,{
      method:"GET",
      tenantId
    });
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
    if(input.context){
      headers["x-actor-id"]=input.context.actorId;
      headers["x-correlation-id"]=input.context.correlationId;
      headers["x-idempotency-key"]=input.context.idempotencyKey;
    }

    const init:RequestInit={
      method:input.method,
      headers
    };
    if(input.body!==undefined) init.body=JSON.stringify(input.body);
    const response=await this.fetcher(url,init);
    const text=await response.text();
    const body=text?JSON.parse(text):{};
    if(!response.ok){
      throw new Error(`Legacy request failed: HTTP ${response.status}: ${String(body.error ?? text).slice(0,500)}`);
    }
    return body as T;
  }
}
