import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { buildProtectedResourceMetadata } from "./oauth-metadata.js";
import { createAuthorizedMgrMcpHttpHandler } from "./mcp-http.js";
import { LegacyEdgeClient } from "./legacy-client.js";
import { JwksAccessTokenVerifier } from "./jwt-verifier.js";
import { DepartmentGateway } from "./department-gateway.js";
import { omniPolicy } from "./omnidev-client.js";
import {createHttpShutdownController} from './http-shutdown.js';

const port=Number(process.env.PORT ?? "8787");
const baseUrl=requiredUrl("MCP_PUBLIC_BASE_URL");
const publicOrigin=new URL(baseUrl).origin;
const publicHost=new URL(baseUrl).host;
const resourceAudience=new URL("/mcp",baseUrl).toString();
const resourceMetadataUrl=new URL("/.well-known/oauth-protected-resource",baseUrl).toString();
const issuer=requiredUrl("MCP_AUTH_ISSUER");
const jwksUrl=requiredUrl("MCP_JWKS_URL");
const legacyBaseUrl=requiredUrl("LEGACY_BASE_URL");
const requiredScopes=csv(process.env.MCP_REQUIRED_SCOPES ?? "tools:read");
const advertisedScopes=csv(process.env.MCP_ADVERTISED_SCOPES ?? "tools:read,tools:execute");

const verifier=new JwksAccessTokenVerifier({
  jwksUrl,
  issuer,
  audience:resourceAudience,
  tenantClaim:process.env.MCP_TENANT_CLAIM ?? "tenant_id",
  scopeClaim:process.env.MCP_SCOPE_CLAIM ?? "scope"
});
const legacy=new LegacyEdgeClient({
  baseUrl:legacyBaseUrl,
  ...(process.env.MGR_DEPARTMENT_ACTOR_ID?{actorId:process.env.MGR_DEPARTMENT_ACTOR_ID}:{}),
  ...(process.env.LEGACY_SERVICE_TOKEN?{bearerToken:process.env.LEGACY_SERVICE_TOKEN}:{}),
  timeoutMs:Number(process.env.LEGACY_TIMEOUT_MS ?? "15000")
});
const mcp=createAuthorizedMgrMcpHttpHandler({
  verifier,
  resourceAudience,
  requiredScopes,
  resourceMetadataUrl,
  legacy,
  ...(process.env.MGR_DEPARTMENTS_ENABLED==="true"?{departments:new DepartmentGateway({
    actorId:required("MGR_DEPARTMENT_ACTOR_ID"),tenantId:required("MGR_DEPARTMENT_TENANT_ID"),legacy,
    creation:{baseUrl:requiredUrl("CREATION_BASE_URL"),token:required("CREATION_SERVICE_TOKEN")},
    voice:{baseUrl:requiredUrl("VOICE_BASE_URL"),token:required("VOICE_SERVICE_TOKEN")},
    signme:{baseUrl:requiredUrl("SIGNME_BASE_URL"),token:required("SIGNME_SERVICE_TOKEN")},
    ...(process.env.OMNIDEV_ENABLED==="true"?{omnidev:{baseUrl:requiredUrl("OMNIDEV_BASE_URL"),token:required("OMNIDEV_SERVICE_TOKEN"),actorId:required("OMNIDEV_SERVICE_ACTOR_ID"),tenantId:required("OMNIDEV_SERVICE_TENANT_ID"),expectedPolicy:omniPolicy.parse(JSON.parse(required("OMNIDEV_EXPECTED_POLICY_JSON")))}}:{})
  })}:{})
});
const metadata=buildProtectedResourceMetadata({
  resource:resourceAudience,
  authorizationServers:[process.env.MCP_AUTHORIZATION_SERVER ?? issuer],
  scopes:advertisedScopes,
  ...(process.env.MCP_RESOURCE_DOCUMENTATION?{documentation:process.env.MCP_RESOURCE_DOCUMENTATION}:{})
});

const server=createServer(async(req,res)=>{
  try{
    const host=req.headers.host;
    if(host && host!==publicHost){
      return json(res,421,{error:"host header does not match configured public endpoint"});
    }
    const origin=req.headers.origin;
    if(origin && origin!==publicOrigin){
      return json(res,403,{error:"origin is not allowed"});
    }
    if(shutdown.isClosing())return json(res,503,{error:'MCP service unavailable'});

    const requestUrl=new URL(req.url ?? "/",baseUrl);
    if(requestUrl.pathname==="/healthz"){
      return json(res,200,{ok:true,service:"mgr-api-mcp"});
    }
    if(requestUrl.pathname==="/.well-known/oauth-protected-resource"){
      return json(res,200,metadata);
    }
    if(requestUrl.pathname!=="/mcp"){
      return json(res,404,{error:"not found"});
    }

    const body=await readBody(req,1_048_576);
    const headers=new Headers();
    for(const [name,value] of Object.entries(req.headers)){
      if(Array.isArray(value)) value.forEach(item=>headers.append(name,item));
      else if(value!==undefined) headers.set(name,value);
    }
    const init:RequestInit={
      method:req.method ?? "GET",
      headers
    };
    if(body.length) init.body=new Uint8Array(body);
    const request=new Request(requestUrl,init);
    const response=await mcp.fetch(request);
    res.statusCode=response.status;
    response.headers.forEach((value,name)=>res.setHeader(name,value));
    if(!response.body){
      res.end();
      return;
    }
    Readable.fromWeb(response.body as any).pipe(res);
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    json(res,message==="request body too large"?413:500,{error:message});
  }
});

const shutdown=createHttpShutdownController({server,handler:mcp,report:record=>console.log(JSON.stringify(record))});

server.listen(port,"0.0.0.0",()=>{
  console.log(JSON.stringify({event:"mgr_api_mcp_listening",port,resourceAudience}));
});

process.on("SIGTERM",()=>void shutdown.begin("SIGTERM"));
process.on("SIGINT",()=>void shutdown.begin("SIGINT"));

function requiredUrl(name:string):string{
  const value=process.env[name];
  if(!value) throw new Error(`${name} is required`);
  return new URL(value).toString();
}
function required(name:string):string{const value=process.env[name];if(!value?.trim())throw Error(`${name} is required`);return value;}
function csv(value:string):string[]{
  return value.split(",").map(item=>item.trim()).filter(Boolean);
}
function json(res:ServerResponse,status:number,body:unknown){
  res.statusCode=status;
  res.setHeader("content-type","application/json");
  res.end(JSON.stringify(body));
}
async function readBody(req:IncomingMessage,maxBytes:number):Promise<Buffer>{
  const chunks:Buffer[]=[];
  let size=0;
  for await(const chunk of req){
    const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
    size+=buffer.length;
    if(size>maxBytes) throw new Error("request body too large");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}
