import { createMcpHandler } from "@modelcontextprotocol/server";
import { createMgrMcpServer } from "./mcp-server.js";
import { authorizeMcpRequest, type AccessTokenVerifier, type McpAuthResult } from "./http-auth.js";
import type { LegacyEdgeClient } from "./legacy-client.js";

export interface AuthorizedMgrMcpHttpOptions {
  verifier:AccessTokenVerifier;
  resourceAudience:string;
  requiredScopes:string[];
  resourceMetadataUrl:string;
  legacy:LegacyEdgeClient;
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

  return {
    async fetch(request:Request):Promise<Response>{
      const authResult=await authorizeAndBindMcpRequest(request,options);
      if(!authResult.ok){
        return new Response(JSON.stringify({error:authResult.error}),{
          status:authResult.status,
          headers:{
            "content-type":"application/json",
            ...authResult.headers
          }
        });
      }

      const handler=createMcpHandler(()=>createMgrMcpServer({
        legacy:{
          auth:authResult.auth,
          resourceAudience:options.resourceAudience,
          legacy:options.legacy
        }
      }));
      activeHandlers.add(handler);
      try{
        return await handler.fetch(request);
      }finally{
        await handler.close();
        activeHandlers.delete(handler);
      }
    },

    async close():Promise<void>{
      await Promise.all([...activeHandlers].map(handler=>handler.close()));
      activeHandlers.clear();
    }
  };
}

export const mgrMcpHttpHandler = createMgrMcpHttpHandler();
