/** Rare -> existing OAuth MCP -> MGR Code Monster, never direct public Git writes. */
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { authorizeTool, type AuthContext } from "./authz.js";
import {
  codeMonsterActionDigest, CodeMonsterTransportError,
  type CodeMonsterBridgeClient, type CodeMonsterMethod, type CodeMonsterApproval,
} from "./code-monster-client.js";

/** A trusted approval authority, NOT arbitrary approval data from tool arguments. */
export interface CodeMonsterApprovalResolver {
  resolve(input: {
    approvalId: string;
    tenantId: string;
    actorId: string;
    method: "repair.stage";
    actionDigest: string;
  }): Promise<null | (CodeMonsterApproval & {
    actorId: string;
    tenantId: string;
    approvalId: string;
  })>;
}

export interface CodeMonsterMcpOptions {
  auth: AuthContext;
  resourceAudience: string;
  allowedTenantId: string;
  codeMonster: Pick<CodeMonsterBridgeClient, "invoke">;
  approvalResolver?: CodeMonsterApprovalResolver;
}

export async function callCodeMonsterMcp(
  options: CodeMonsterMcpOptions,
  method: CodeMonsterMethod,
  args: Record<string, unknown> = {},
  approvalId?: string,
): Promise<Record<string, unknown>> {
  const scope = method === "repair.stage" ? "tools:execute" : "tools:read";
  try { authorizeTool(options.auth, options.resourceAudience, [scope]); }
  catch (error) { return { accepted: false, state: "DENY", reason: error instanceof Error ? error.message : "unauthorized" }; }
  if (!options.allowedTenantId || options.allowedTenantId !== options.auth.tenantId)
    return { accepted: false, state: "DENY", reason: "Code Monster owner tenant mismatch" };
  let approval: CodeMonsterApproval | undefined;
  if (method === "repair.stage") {
    if (!approvalId || !options.approvalResolver)
      return { accepted: false, state: "APPROVAL_UNAVAILABLE", reason: "Trusted, durable approval authority not connected" };
    const digest = codeMonsterActionDigest({ method, actorId: options.auth.actorId, tenantId: options.auth.tenantId, args });
    let record: Awaited<ReturnType<CodeMonsterApprovalResolver["resolve"]>>;
    try { record = await options.approvalResolver.resolve({
      approvalId, actorId: options.auth.actorId, tenantId: options.auth.tenantId,
      method, actionDigest: digest,
    }); }
    catch { return { accepted: false, state: "APPROVAL_UNAVAILABLE", reason: "Trusted approval resolution failed" }; }
    if (!record || record.state !== "approved" || record.actionDigest !== digest ||
        record.approvalId !== approvalId || record.actorId !== options.auth.actorId ||
        record.tenantId !== options.auth.tenantId || !Number.isSafeInteger(record.expiresAt) ||
        record.expiresAt <= Date.now())
      return { accepted: false, state: "DENY", reason: "No valid exact-action approved grant" };
    approval = { state: "approved", actionDigest: record.actionDigest, expiresAt: record.expiresAt };
  } else if (approvalId) {
    return { accepted: false, state: "DENY", reason: "Approval cannot be used with read methods" };
  }
  try {
    const result = await options.codeMonster.invoke({ auth: options.auth, method, args, ...(approval ? { approval } : {}) });
    // Internal bridge returns HTTP 200 for an executed handler even when the
    // domain refused to stage. Never turn `result.accepted:false` into a green
    // MCP success receipt just because the transport answered.
    const downstream = result.result;
    if (downstream && typeof downstream === "object" && !Array.isArray(downstream) &&
        (downstream as Record<string, unknown>).accepted === false) {
      const state = (downstream as Record<string, unknown>).state;
      return { accepted: false, state: typeof state === "string" ? state : "DOWNSTREAM_REJECTED",
        result, productionReady: false };
    }
    return { accepted: true, state: "CODE_MONSTER_RESPONSE", result, productionReady: false };
  } catch (error) {
    if (error instanceof CodeMonsterTransportError) return {
      accepted: false, state: error.state, status: error.status,
      reason: error.message, reconciliationRequired: method === "repair.stage",
    };
    return { accepted: false, state: "DENY", reason: error instanceof Error ? error.message : "invalid request" };
  }
}

export function registerCodeMonsterMcpTools(server: McpServer, options: CodeMonsterMcpOptions): void {
  const read = async (method: CodeMonsterMethod, args: Record<string, unknown>) => {
    const result = await callCodeMonsterMcp(options, method, args);
    return { content: [{ type: "text" as const, text: JSON.stringify(result) }], isError: result.accepted !== true };
  };
  server.registerTool("mgr_code_monster_capabilities", {
    description: "Read connected Code Monster abilities, safety state and available engines. Does not edit code.",
    inputSchema: z.object({}).strict(),
  }, async () => read("capabilities", {}));
  server.registerTool("mgr_code_monster_portfolio_plan", {
    description: "Read Code Monster's pinned MGR repository intake; discovery does not certify a production release.",
    inputSchema: z.object({}).strict(),
  }, async () => read("portfolio.plan", {}));
  server.registerTool("mgr_code_monster_code_search", {
    description: "Search the configured source-pinned Code Monster graph (lexical dependency relationships, not semantic proof).",
    inputSchema: z.object({ query: z.string().trim().min(1).max(120), limit: z.number().int().min(1).max(100).default(25) }).strict(),
  }, async ({ query, limit }) => read("code.graph.search", { query, limit }));
  // A visible tool that fails closed until the hosted application supplies an
  // independent owner-approval resolver. OAuth scope alone cannot approve writes.
  server.registerTool("mgr_code_monster_repair_stage", {
    description: "Stage a pinned repair on a controlled candidate Git branch. Requires tools:execute AND a server-verified, exact-action owner approval; never promotes to production.",
    inputSchema: z.object({
      approvalId: z.string().min(8).max(160),
      args: z.record(z.string().min(1).max(100), z.unknown()),
    }).strict(),
  }, async ({ approvalId, args }) => {
    const result = await callCodeMonsterMcp(options, "repair.stage", args, approvalId);
    return { content: [{ type: "text" as const, text: JSON.stringify(result) }], isError: result.accepted !== true };
  });
}
