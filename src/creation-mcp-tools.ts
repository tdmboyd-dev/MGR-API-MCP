import { randomUUID } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import type { AuthContext } from "./authz.js";
import { ActionSentinel } from "./action-sentinel.js";
import type { ToolCapability } from "./contracts.js";
import {
  ValidatingCreationOSClient,
  type CreationOSClient
} from "./creation-client.js";

export interface CreationMcpToolOptions {
  auth:AuthContext;
  resourceAudience:string;
  creation:CreationOSClient;
}

const creationTool:ToolCapability={
  id:"mgr_creation_execute",
  version:"1.0.0",
  description:"Execute a governed Creation OS capability",
  sideEffect:"reversible",
  requiredScopes:["creation:execute"],
  approvalPolicy:"policy"
};

export async function executeCreationMcpCommand(
  options:CreationMcpToolOptions,
  input:{
    workspaceId:string;
    capability:string;
    input:unknown;
    acceptanceCriteria:string[];
    risk:"low"|"medium"|"high"|"critical";
    maxCost?:number;
    correlationId?:string;
  }
):Promise<Record<string,unknown>>{
  const correlationId=input.correlationId ?? randomUUID();
  const sentinel=new ActionSentinel();
  const decision=sentinel.evaluate(options.auth,{
    taskId:correlationId,
    tool:creationTool,
    payload:{
      workspaceId:input.workspaceId,
      capability:input.capability,
      acceptanceCriteria:input.acceptanceCriteria,
      maxCost:input.maxCost
    },
    audience:options.resourceAudience,
    risk:input.risk
  });

  if(decision.state!=="ALLOW"){
    return {
      accepted:false,
      state:decision.state,
      reason:decision.reason,
      actionDigest:decision.actionDigest,
      correlationId
    };
  }

  const client=new ValidatingCreationOSClient(options.creation);
  const result=await client.execute({
    requestId:correlationId,
    tenantId:options.auth.tenantId,
    workspaceId:input.workspaceId,
    capability:input.capability,
    input:{
      actorId:options.auth.actorId,
      correlationId,
      payload:input.input
    },
    acceptanceCriteria:input.acceptanceCriteria,
    ...(input.maxCost===undefined?{}:{maxCost:input.maxCost})
  });

  return {
    accepted:result.status==="SUCCEEDED",
    actionDigest:decision.actionDigest,
    correlationId,
    ...result
  };
}

export function registerCreationMcpTools(server:McpServer,options:CreationMcpToolOptions):void{
  server.registerTool(
    "mgr_creation_execute",
    {
      description:
        "Execute a Creation OS capability for the authenticated tenant. Tenant and actor identity are bound by the verified MCP session.",
      inputSchema:z.object({
        workspaceId:z.string().min(1),
        capability:z.string().min(1),
        input:z.unknown(),
        acceptanceCriteria:z.array(z.string().min(1)).min(1),
        risk:z.enum(["low","medium","high","critical"]).default("medium"),
        maxCost:z.number().nonnegative().optional(),
        correlationId:z.string().min(1).optional()
      })
    },
    async input=>{
      const normalized:{
        workspaceId:string;
        capability:string;
        input:unknown;
        acceptanceCriteria:string[];
        risk:"low"|"medium"|"high"|"critical";
        maxCost?:number;
        correlationId?:string;
      }={
        workspaceId:input.workspaceId,
        capability:input.capability,
        input:input.input,
        acceptanceCriteria:input.acceptanceCriteria,
        risk:input.risk
      };
      if(input.maxCost!==undefined) normalized.maxCost=input.maxCost;
      if(input.correlationId) normalized.correlationId=input.correlationId;
      const result=await executeCreationMcpCommand(options,normalized);
      return {
        content:[{type:"text",text:JSON.stringify(result)}],
        isError:result.state==="DENY" || result.accepted===false
      };
    }
  );
}
