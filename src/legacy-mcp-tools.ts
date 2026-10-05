import { randomUUID } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import type { AuthContext } from "./authz.js";
import { authorizeTool } from "./authz.js";
import { ActionSentinel } from "./action-sentinel.js";
import type { ToolCapability } from "./contracts.js";
import { LegacyEdgeClient } from "./legacy-client.js";

export interface LegacyMcpToolOptions {
  auth:AuthContext;
  resourceAudience:string;
  legacy:LegacyEdgeClient;
}

const executeTool:ToolCapability={
  id:"mgr_legacy_execute",
  version:"1.0.0",
  description:"Execute a governed business action through MGR Legacy",
  sideEffect:"reversible",
  requiredScopes:["tools:execute"],
  approvalPolicy:"policy"
};

export async function executeLegacyMcpCommand(
  options:LegacyMcpToolOptions,
  input:{
    action:string;
    payload:Record<string,unknown>;
    target?:{entityType:string;entityId:string};
    risk:"low"|"medium"|"high"|"critical";
    idempotencyKey?:string;
    correlationId?:string;
  }
):Promise<Record<string,unknown>>{
  const sentinel=new ActionSentinel();
  const decision=sentinel.evaluate(options.auth,{
    taskId:input.correlationId ?? randomUUID(),
    tool:executeTool,
    payload:{action:input.action,payload:input.payload,target:input.target},
    audience:options.resourceAudience,
    risk:input.risk
  });

  if(decision.state!=="ALLOW"){
    return {
      accepted:false,
      state:decision.state,
      reason:decision.reason,
      actionDigest:decision.actionDigest
    };
  }

  const correlation=input.correlationId ?? randomUUID();
  const result=await options.legacy.execute({
    tenantId:options.auth.tenantId,
    actorId:options.auth.actorId,
    correlationId:correlation,
    idempotencyKey:input.idempotencyKey ?? `mcp:${correlation}:${input.action}`
  },{
    action:input.action,
    payload:input.payload,
    target:input.target
  });

  return {
    ...result,
    correlationId:result.correlationId ?? correlation,
    actionDigest:decision.actionDigest
  };
}

export function registerLegacyMcpTools(server:McpServer,options:LegacyMcpToolOptions):void{
  server.registerTool(
    "mgr_legacy_execute",
    {
      description:
        "Execute an authorized business-domain command through MGR Legacy. Tenant and actor identity come from the verified MCP access token, not tool arguments.",
      inputSchema:z.object({
        action:z.string().min(1),
        payload:z.record(z.string(),z.unknown()).default({}),
        target:z.object({
          entityType:z.string().min(1),
          entityId:z.string().min(1)
        }).optional(),
        risk:z.enum(["low","medium","high","critical"]).default("medium"),
        idempotencyKey:z.string().min(1).optional(),
        correlationId:z.string().min(1).optional()
      })
    },
    async ({action,payload,target,risk,idempotencyKey,correlationId})=>{
      const result=await executeLegacyMcpCommand(options,{
        action,payload,target,risk,idempotencyKey,correlationId
      });
      return {
        content:[{type:"text",text:JSON.stringify(result)}],
        isError:result.state==="DENY"
      };
    }
  );

  server.registerTool(
    "mgr_legacy_connectors",
    {
      description:"List persisted MGR Legacy connectors/capabilities available to the authenticated tenant.",
      inputSchema:z.object({})
    },
    async ()=>{
      try{
        authorizeTool(options.auth,options.resourceAudience,["tools:read"]);
      }catch(error){
        return {
          content:[{type:"text",text:JSON.stringify({
            error:error instanceof Error?error.message:String(error)
          })}],
          isError:true
        };
      }
      return {
        content:[{
          type:"text",
          text:JSON.stringify(await options.legacy.listConnectors(options.auth.tenantId))
        }]
      };
    }
  );

  server.registerTool(
    "mgr_truth_summary",
    {
      description:"Read MGR Legacy Action Receipt summary for the authenticated tenant.",
      inputSchema:z.object({
        actorId:z.string().min(1).optional(),
        action:z.string().min(1).optional(),
        status:z.string().min(1).optional(),
        correlationId:z.string().min(1).optional(),
        limit:z.number().int().positive().max(500).optional()
      })
    },
    async filters=>({
      content:[{
        type:"text",
        text:JSON.stringify(await options.legacy.truthSummary(options.auth.tenantId,filters))
      }]
    })
  );
}
