/** MGR API/MCP read-only Forge discovery. Creation and downloads stay behind Creation OS. */

import type {McpServer} from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import {authorizeTool, type AuthContext} from "./authz.js";
import type {ForgeCatalogClient,ForgeCatalogSearch} from "./forge-catalog-client.js";

export interface ForgeMcpToolOptions {
  auth:AuthContext;
  resourceAudience:string;
  allowedTenantId:string;
  forge:ForgeCatalogClient;
}

export async function searchForgeMcp(
  options:ForgeMcpToolOptions,input:ForgeCatalogSearch
):Promise<Record<string,unknown>>{
  try{
    authorizeTool(options.auth,options.resourceAudience,["tools:read"]);
  }catch(error){
    return {accepted:false,state:"DENY",reason:error instanceof Error?error.message:"unauthorized"};
  }
  // Local Studio is a single-tenant workbench. Never offer its cached catalog
  // to an arbitrary authenticated tenant just because they possess read scope.
  if(!options.allowedTenantId || options.auth.tenantId!==options.allowedTenantId){
    return {accepted:false,state:"DENY",reason:"Forge tenant not authorized for this workstation"};
  }
  if(input.query.length>120 || (input.category && input.category.length>48) ||
     (input.limit!==undefined && (input.limit<1 || input.limit>100))){
    return {accepted:false,state:"DENY",reason:"Forge catalog request exceeds bounded limits"};
  }
  try{
    const catalog=await options.forge.search(input);
    return {accepted:true,status:"SOURCE_DIRECTORY_RESULT",catalog,
            disclaimer:"Discovery is not model download, file rights clearance or verified 3D output"};
  }catch(error){
    return {accepted:false,state:"SOURCE_UNAVAILABLE",
            reason:error instanceof Error?error.message:"Forge source directory unavailable"};
  }
}

export function registerForgeMcpTools(server:McpServer,options:ForgeMcpToolOptions):void{
  server.registerTool("mgr_forge_asset_discover",{
    description:"Read approved MGR Forge source directories or public model metadata. No asset download, generation or raw redistribution.",
    inputSchema:z.object({
      mode:z.enum(["sources","models"]).default("sources"),
      query:z.string().max(120).default(""),
      category:z.string().max(48).optional(),
      provider:z.enum(["3dassets","polyhaven"]).default("3dassets"),
      kind:z.enum(["models","textures","hdris"]).default("models"),
      live:z.boolean().default(false),
      limit:z.number().int().min(1).max(100).default(6)
    })
  },async input=>{
    const search:ForgeCatalogSearch={mode:input.mode,query:input.query,
                                      live:input.live,limit:input.limit,
                                      provider:input.provider,kind:input.kind};
    if(input.category) search.category=input.category;
    const result=await searchForgeMcp(options,search);
    return {content:[{type:"text",text:JSON.stringify(result)}],isError:result.accepted!==true};
  });
}
