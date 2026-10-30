import { createMcpHandler } from "@modelcontextprotocol/server";
import { createMgrMcpServer } from "./mcp-server.js";
import { authorizeMcpRequest, type AccessTokenVerifier, type McpAuthResult } from "./http-auth.js";
import type { LegacyEdgeClient } from "./legacy-client.js";
import type { CreationOSClient } from "./creation-client.js";
import type { DepartmentGateway, DepartmentToolOptions } from "./department-gateway.js";

export interface AuthorizedMgrMcpHttpOptions {
  verifier:AccessTokenVerifier;
  resourceAudience:string;
  requiredScopes:string[];
  resourceMetadataUrl:string;
  legacy?:LegacyEdgeClient;
  creation?:CreationOSClient;
  departments?:DepartmentGateway;
  /** Host may lower the fixed64 outer auth/handler admission budget. */
  maximumPendingRequests?:number;
}

export async function authorizeAndBindMcpRequest(
  request:Request,
  options:Omit<AuthorizedMgrMcpHttpOptions,"legacy">
):Promise<McpAuthResult>{
  const authorization=request.headers.get("authorization") ?? undefined;
  return authorizeMcpRequest({
    ...(authorization ? {authorizationHeader:authorization} : {}),
    verifier:options.verifier,
    resourceAudience:options.resourceAudience,
    requiredScopes:options.requiredScopes,
    resourceMetadataUrl:options.resourceMetadataUrl
  });
}

/**
 * Unauthenticated factory retained for local/stdin-compatible development and
 * protocol tests. Do not expose this factory as a public remote endpoint.
 */
export function createMgrMcpHttpHandler() {
  return createMcpHandler(() => createMgrMcpServer());
}

/**
 * Production-facing remote MCP factory.
 *
 * It authenticates before constructing the MCP server and binds the verified
 * actor/tenant identity into the Legacy tool layer. Tool arguments cannot
 * replace the authenticated identity.
 */
export function createAuthorizedMgrMcpHttpHandler(options:AuthorizedMgrMcpHttpOptions){
  const activeHandlers=new Set<ReturnType<typeof createMcpHandler>>();
  const closingHandlers=new WeakMap<ReturnType<typeof createMcpHandler>,Promise<void>>();
  const maximumPendingRequests=options.maximumPendingRequests===undefined?64:options.maximumPendingRequests;
  if(!Number.isSafeInteger(maximumPendingRequests)||maximumPendingRequests<1||maximumPendingRequests>64)throw new Error('invalid MCP pending request limit');
  let closed=false,pendingRequests=0;
  const unavailable=()=>new Response(JSON.stringify({error:'MCP service unavailable'}),{status:503,headers:{'content-type':'application/json','cache-control':'no-store'}});
  function closeHandler(handler:ReturnType<typeof createMcpHandler>):Promise<void>{
    const existing=closingHandlers.get(handler);if(existing)return existing;
    const closing=Promise.resolve().then(()=>handler.close()).then(()=>{
      if(activeHandlers.delete(handler))pendingRequests--;
    }).catch(error=>{
      // Keep failed/unconfirmed ownership and its admission slot for explicit
      // cleanup retry. Never retry a tool/domain operation to clean a handle.
      closingHandlers.delete(handler);throw error;
    });
    closingHandlers.set(handler,closing);return closing;
  }

  return {
    async fetch(request:Request):Promise<Response>{
      if(closed||pendingRequests>=maximumPendingRequests)return unavailable();
      pendingRequests++;
      let handlerOwnsSlot=false;
      try{
      const authResult=await authorizeAndBindMcpRequest(request,options);
      if(closed)return unavailable();
      if(!authResult.ok){
        return new Response(JSON.stringify({error:authResult.error}),{
          status:authResult.status,
          headers:{
            "content-type":"application/json",
            ...authResult.headers
          }
        });
      }

      const serverOptions:{
        departments?:DepartmentToolOptions;
        legacy?:{
          auth:typeof authResult.auth;
          resourceAudience:string;
          legacy:LegacyEdgeClient;
        };
        creation?:{
          auth:typeof authResult.auth;
          resourceAudience:string;
          creation:CreationOSClient;
        };
      }={};
      if(options.legacy)serverOptions.legacy={auth:authResult.auth,resourceAudience:options.resourceAudience,legacy:options.legacy};
      if(options.creation){
        serverOptions.creation={
          auth:authResult.auth,
          resourceAudience:options.resourceAudience,
          creation:options.creation
        };
      }
      if(options.departments)serverOptions.departments={auth:authResult.auth,resourceAudience:options.resourceAudience,gateway:options.departments};
      if(closed)return unavailable();
      const handler=createMcpHandler(()=>createMgrMcpServer(serverOptions));
      activeHandlers.add(handler);
      handlerOwnsSlot=true;
      try{
        return await handler.fetch(request);
      }finally{
        await closeHandler(handler);
      }
      }finally{if(!handlerOwnsSlot)pendingRequests--;}
    },

    async close():Promise<void>{
      closed=true; // Sticky and synchronous, before any shutdown await.
      await Promise.all([...activeHandlers].map(handler=>closeHandler(handler)));
    }
  };
}

export const mgrMcpHttpHandler = createMgrMcpHttpHandler();
