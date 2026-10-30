import {createServer} from "node:http";
import {timingSafeEqual} from "node:crypto";
import {createAuthorizedMgrMcpHttpHandler} from "./mcp-http.js";
import {DepartmentGateway,type DepartmentGatewayConfig} from "./department-gateway.js";

/** Explicit loopback service-token deployment. It is not a hosted OAuth issuer. */
export function createLocalDepartmentEdge(options:DepartmentGatewayConfig&{port:number;accessToken:string;expiresAt:number}){
 if(!Number.isInteger(options.port)||options.port<1024||options.port>65535||options.accessToken.length<32||!Number.isFinite(options.expiresAt)||options.expiresAt<=Date.now())throw Error("Valid local port, strong private token and expiry required");
 const base=`http://127.0.0.1:${options.port}`,audience=base+"/mcp";
 const gateway=new DepartmentGateway(options);
 const handler=createAuthorizedMgrMcpHttpHandler({...(options.legacy?{legacy:options.legacy}:{}),departments:gateway,resourceAudience:audience,resourceMetadataUrl:base+"/.well-known/oauth-protected-resource",requiredScopes:["tools:read"],verifier:{async verify(token){
  if(Buffer.byteLength(token)!==Buffer.byteLength(options.accessToken)||!timingSafeEqual(Buffer.from(token),Buffer.from(options.accessToken)))return null;
  return {subject:options.actorId,tenantId:options.tenantId,audience,scopes:["tools:read","departments:execute","departments:read"],expiresAt:options.expiresAt};
 }}});
 const server=createServer(async(req,res)=>{
  const send=(status:number,body:unknown)=>{res.writeHead(status,{"content-type":"application/json","cache-control":"no-store"});res.end(JSON.stringify(body));};
  try{
   if(req.headers.host!==`127.0.0.1:${options.port}`)return send(421,{error:"host denied"});
   if(req.headers.origin)return send(403,{error:"browser origin denied"});
   const bearer=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1]??"";
   if(Buffer.byteLength(bearer)!==Buffer.byteLength(options.accessToken)||!timingSafeEqual(Buffer.from(bearer),Buffer.from(options.accessToken))||options.expiresAt<=Date.now())return send(401,{error:"invalid or expired local service token"});
   if(req.url!=="/mcp")return send(404,{error:"not found"});
   const chunks:Buffer[]=[];let size=0;for await(const chunk of req){const b=Buffer.from(chunk);size+=b.length;if(size>32768)return send(413,{error:"request exceeds limit"});chunks.push(b);}
   const headers=new Headers();for(const [k,v] of Object.entries(req.headers))if(v!==undefined)headers.set(k,Array.isArray(v)?v.join(","):v);
   const body=Buffer.concat(chunks);const response=await handler.fetch(new Request(base+"/mcp",{method:req.method??"GET",headers,...(body.length?{body:new Uint8Array(body)}:{})}));
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{if(!res.headersSent)send(503,{error:"local department edge unavailable"});else res.destroy();}
 });
 server.requestTimeout=30000;server.headersTimeout=10000;
 return {server,gateway,baseUrl:base,async close(){server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await handler.close();}};
}
