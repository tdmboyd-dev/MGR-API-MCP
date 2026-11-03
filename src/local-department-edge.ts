import type {RepositoryReadGateway} from './repository-read-tools.js';
import {createServer} from "node:http";
import {timingSafeEqual} from "node:crypto";
import {createAuthorizedMgrMcpHttpHandler} from "./mcp-http.js";
import {DepartmentGateway,type DepartmentGatewayConfig} from "./department-gateway.js";
export const OWNER_DEPARTMENT_REQUEST_BYTES=1_200_000;

/** Explicit loopback service-token deployment. It is not a hosted OAuth issuer. */
export function createLocalDepartmentEdge(options:DepartmentGatewayConfig&{port:number;accessToken:string;expiresAt:number;repositories?:RepositoryReadGateway;agentsWorkflowRead?:{origin:string;token:string}}){
 if(!Number.isInteger(options.port)||(options.port!==0&&options.port<1024)||options.port>65535||options.accessToken.length<32||!Number.isFinite(options.expiresAt)||options.expiresAt<=Date.now())throw Error("Valid local port, strong private token and expiry required");
 const gateway=new DepartmentGateway(options);
 function createHandler(base:string){
 const audience=base+"/mcp";
 return createAuthorizedMgrMcpHttpHandler({...(options.legacy&&!options.legacyTenantId?{legacy:options.legacy}:{}),departments:gateway,...(options.agentsWorkflowRead?{agentsWorkflowRead:{...options.agentsWorkflowRead,owner:{actorId:options.actorId,tenantId:options.tenantId}}}:{}),...(options.repositories?{repositories:options.repositories}:{}),resourceAudience:audience,resourceMetadataUrl:base+"/.well-known/oauth-protected-resource",requiredScopes:["tools:read"],verifier:{async verify(token){
  if(Buffer.byteLength(token)!==Buffer.byteLength(options.accessToken)||!timingSafeEqual(Buffer.from(token),Buffer.from(options.accessToken)))return null;
  return {subject:options.actorId,tenantId:options.tenantId,audience,scopes:["tools:read","departments:execute","departments:read",...(options.repositories?["repositories:read"]:[]),...(options.agentsWorkflowRead?["workflows:read"]:[])],expiresAt:options.expiresAt};
 }}});
 }
 const fixedBase=options.port===0?null:`http://127.0.0.1:${options.port}`;
 let boundBase=fixedBase,handler=fixedBase?createHandler(fixedBase):undefined;
 function baseUrl():string{
  if(fixedBase)return fixedBase;
  const address=server.address();
  if(!address||typeof address==='string'||address.address!=='127.0.0.1')throw Error('Local department edge requires an active IPv4 loopback listener');
  const base=`http://127.0.0.1:${address.port}`;
  if(boundBase!==null&&boundBase!==base)throw Error('Local department edge listener identity changed');
  return base;
 }
 const server=createServer(async(req,res)=>{
  const cancellation=new AbortController();req.once("aborted",()=>cancellation.abort());res.once("close",()=>{if(!res.writableEnded)cancellation.abort();});
  const send=(status:number,body:unknown)=>{res.writeHead(status,{"content-type":"application/json","cache-control":"no-store"});res.end(JSON.stringify(body));};
  try{
   const base=baseUrl();
   if(req.headers.host!==base.slice("http://".length))return send(421,{error:"host denied"});
   if(req.headers.origin)return send(403,{error:"browser origin denied"});
   const bearer=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1]??"";
   if(Buffer.byteLength(bearer)!==Buffer.byteLength(options.accessToken)||!timingSafeEqual(Buffer.from(bearer),Buffer.from(options.accessToken))||options.expiresAt<=Date.now())return send(401,{error:"invalid or expired local service token"});
   if(req.url!=="/mcp")return send(404,{error:"not found"});
   const declared=req.headers['content-length'];
   if(declared!==undefined&&(!/^\d+$/.test(declared)||!Number.isSafeInteger(Number(declared))||Number(declared)>OWNER_DEPARTMENT_REQUEST_BYTES))return send(413,{error:'request exceeds limit'});
   const chunks:Buffer[]=[];let size=0;for await(const chunk of req){const b=Buffer.from(chunk);size+=b.length;if(size>OWNER_DEPARTMENT_REQUEST_BYTES)return send(413,{error:"request exceeds limit"});chunks.push(b);}
   const headers=new Headers();for(const [k,v] of Object.entries(req.headers))if(v!==undefined)headers.set(k,Array.isArray(v)?v.join(","):v);
   const body=Buffer.concat(chunks);
   boundBase=base;handler??=createHandler(base);
   const response=await handler.fetch(new Request(base+"/mcp",{method:req.method??"GET",headers,signal:cancellation.signal,...(body.length?{body:new Uint8Array(body)}:{})}));
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{if(!res.headersSent)send(503,{error:"local department edge unavailable"});else res.destroy();}
 });
 server.requestTimeout=30000;server.headersTimeout=10000;
 return {server,gateway,get baseUrl(){return baseUrl();},async close(){server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await handler?.close();}};
}
