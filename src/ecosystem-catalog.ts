import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { ecosystemCatalogData } from "./ecosystem-catalog-data.js";
import { authorizeTool, type AuthContext } from "./authz.js";

export function readEcosystemCatalog(repoId?:string){
  const entries=ecosystemCatalogData.entries.filter(entry=>repoId===undefined || entry.repoId===repoId);
  if(repoId!==undefined && entries.length===0) throw new Error("Unknown ecosystem repository");
  // Detached response objects prevent a client from altering later discovery.
  return structuredClone({...ecosystemCatalogData,entries});
}

export function registerEcosystemCatalogTool(server:McpServer,auth?:AuthContext,audience?:string):void{
  server.registerTool("mgr_ecosystem_catalog",{
    description:"Read source-pinned MGR repository roles and integration limits. Catalogued does not mean connected or executable. No repository code or external provider is executed.",
    inputSchema:z.object({repoId:z.string().min(1).optional()}).strict()
  },async({repoId})=>{
    try{
      if(auth){
        if(!audience) throw new Error("Catalog resource audience is required");
        authorizeTool(auth,audience,["tools:read"]);
      }
      return {content:[{type:"text",text:JSON.stringify(readEcosystemCatalog(repoId))}]};
    }catch(error){
      return {content:[{type:"text",text:JSON.stringify({error:error instanceof Error?error.message:"Catalog unavailable"})}],isError:true};
    }
  });
}
