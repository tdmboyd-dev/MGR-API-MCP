/** Forge owns 3D execution; this shared MCP edge only authenticates and routes. */
import type {McpServer} from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import {authorizeTool, type AuthContext} from "./authz.js";
import type {ForgeCatalogClient,ForgeCatalogSearch,ForgeWorldEdits} from "./forge-catalog-client.js";

export interface ForgeMcpToolOptions {
  auth:AuthContext;
  resourceAudience:string;
  allowedTenantId:string;
  forge:ForgeCatalogClient;
}

function denied(options:ForgeMcpToolOptions,scope:"tools:read"|"tools:execute"):string|null{
  try{
    authorizeTool(options.auth, options.resourceAudience, [scope]);
  }catch(error){
    return error instanceof Error ? error.message : "unauthorized";
  }
  if(!options.allowedTenantId || options.auth.tenantId!==options.allowedTenantId){
    return "Forge tenant not authorized for this workstation";
  }
  return null;
}

export async function searchForgeMcp(
  options:ForgeMcpToolOptions,input:ForgeCatalogSearch
):Promise<Record<string,unknown>>{
  const reason=denied(options,"tools:read");
  if(reason) return {accepted:false,state:"DENY",reason};
  if(input.query.length>120 || (input.category && input.category.length>48) ||
     (input.limit!==undefined && (input.limit<1 || input.limit>100))){
    return {accepted:false,state:"DENY",reason:"Forge catalog request exceeds bounded limits"};
  }
  try{
    const catalog=await options.forge.search(input);
    return {accepted:true,status:"SOURCE_DIRECTORY_RESULT",catalog,
            disclaimer:"Discovery is not model download, rights clearance or verified 3D output"};
  }catch(error){
    return {accepted:false,state:"SOURCE_UNAVAILABLE",
            reason:error instanceof Error?error.message:"Forge source directory unavailable"};
  }
}

export async function createForgeWorldMcp(
  options:ForgeMcpToolOptions,
  input:{requestId:string;edits:ForgeWorldEdits}
):Promise<Record<string,unknown>>{
  const reason=denied(options,"tools:execute");
  if(reason) return {accepted:false,state:"DENY",reason};
  if(!options.forge.createWorld){
    return {accepted:false,state:"EXECUTOR_UNAVAILABLE",reason:"Forge creation adapter not configured"};
  }
  try{
    const result=await options.forge.createWorld(input);
    if(result.status==="NEEDS_RECONCILIATION"){
      return {accepted:false,state:"RECONCILIATION_REQUIRED",requestId:input.requestId,
              reason:"Previous world job interrupted; do not retry as a new side effect"};
    }
    if(result.status!=="MATERIALIZED" ||
       typeof result.world_sha256!=="string" ||
       !/^[a-f0-9]{64}$/.test(result.world_sha256) ||
       typeof result.job_id!=="string" || !/^[a-f0-9]{24}$/.test(result.job_id) ||
       typeof result.world_bytes!=="number" || result.world_bytes<=0){
      return {accepted:false,state:"UNVERIFIED_RECEIPT",reason:"Forge returned no verified file digest"};
    }
    return {accepted:true,status:"WORLD_MATERIALIZED_LOCAL",requestId:input.requestId,
            jobId:result.job_id,artifactSha256:result.world_sha256,
            artifactBytes:result.world_bytes,localArtifactUrl:result.glb_url,
            replayed:result.replayed===true,
            independentlyBlenderVerified:false,
            hostedTevinVerified:false,
            disclaimer:"Real Forge local world, not a hosted download or approved Blender/engine receipt"};
  }catch(error){
    return {accepted:false,state:"FORGE_UNAVAILABLE_OR_UNKNOWN",
            reason:error instanceof Error?error.message:"Forge world creation outcome unknown",
            reconciliationRequired:true,requestId:input.requestId};
  }
}

export async function statusForgeWorldMcp(
  options:ForgeMcpToolOptions,requestId:string
):Promise<Record<string,unknown>>{
  const reason=denied(options,"tools:read");
  if(reason) return {accepted:false,state:"DENY",reason};
  if(!options.forge.worldStatus) return {accepted:false,state:"EXECUTOR_UNAVAILABLE"};
  try{
    const status=await options.forge.worldStatus(requestId);
    return {accepted:status.status==="MATERIALIZED",status:status.status,
            requestId,jobId:status.job_id,artifactSha256:status.world_sha256,
            reconciliationRequired:status.status==="NEEDS_RECONCILIATION"};
  }catch(error){
    return {accepted:false,state:"SOURCE_UNAVAILABLE",
            reason:error instanceof Error?error.message:"Forge status unavailable"};
  }
}

const coordinates=z.tuple([z.number().finite(),z.number().finite(),z.number().finite()]);
const worldEdits=z.object({
  schema:z.literal("mgr.forge.world-edit.v1"),
  asset_sha256:z.string().regex(/^[a-f0-9]{64}$/),
  buildings:z.array(z.object({
    id:z.string().min(1).max(120),
    center:coordinates, size:coordinates,
    material:z.string().min(1).max(100)
  }).strict()).min(1).max(300)
}).strict();

export function registerForgeMcpTools(server:McpServer,options:ForgeMcpToolOptions):void{
  server.registerTool("mgr_forge_asset_discover",{
    description:"Search MGR Forge's approved source directories and public asset metadata; read only.",
    inputSchema:z.object({
      mode:z.enum(["sources","models"]).default("sources"),
      query:z.string().max(120).default(""),
      category:z.string().max(48).optional(),
      provider:z.enum(["3dassets","polyhaven","ambientcg"]).default("3dassets"),
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
  if(options.forge.createWorld){
    server.registerTool("mgr_forge_world_create",{
      description:"With tools:execute permission, materialize one idempotent local Forge world edit and return the actual GLB SHA-256; Creation OS not required.",
      inputSchema:z.object({requestId:z.string().regex(/^[A-Za-z0-9_-]{12,100}$/),edits:worldEdits})
    },async input=>{
      const result=await createForgeWorldMcp(options,{requestId:input.requestId,edits:input.edits});
      return {content:[{type:"text",text:JSON.stringify(result)}],isError:result.accepted!==true};
    });
  }
  if(options.forge.worldStatus){
    server.registerTool("mgr_forge_world_status",{
      description:"Read an existing Forge world job by stable request ID; reconciliation instead of blind retry.",
      inputSchema:z.object({requestId:z.string().regex(/^[A-Za-z0-9_-]{12,100}$/)})
    },async input=>{
      const result=await statusForgeWorldMcp(options,input.requestId);
      return {content:[{type:"text",text:JSON.stringify(result)}],isError:result.accepted!==true};
    });
  }
}
