import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { authorizeTool, type AuthContext } from "./authz.js";

export const agentsWorkflowReadInput = z.union([
  z.object({ runId: z.uuid() }).strict(),
  z.object({ workflowId: z.uuid(), before: z.uuid().optional() }).strict(),
]);
const historyPage = z.object({
  runs: z.array(z.object({
    id: z.uuid(), workflowId: z.uuid(), scheduleId: z.uuid().nullable().optional(),
    status: z.enum(["pending", "running", "completed", "failed", "cancelled"]).optional(),
    outcomeState: z.enum(["unconfirmed", "recorded"]).optional(),
    startedAt: z.iso.datetime({ offset: true }).nullable().optional(),
    completedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  })).max(20),
  hasMore: z.boolean(),
  nextCursor: z.uuid().optional(),
});

export interface AgentsWorkflowReadOptions {
  auth: AuthContext;
  resourceAudience: string;
  owner: { actorId: string; tenantId: string };
  origin: string;
  token: string;
}

export function registerAgentsWorkflowRead(server: McpServer, options: AgentsWorkflowReadOptions): void {
  const origin = new URL(options.origin);
  if (origin.origin !== options.origin || origin.protocol !== "https:" || options.token.length < 32) {
    throw new Error("Invalid Agents workflow reader configuration");
  }
  server.registerTool("mgr_agents_workflow_read", {
    description: "Read an exact saved run or page through saved runs by workflow ID for the configured owner. This tool does not dispatch or retry work.",
    inputSchema: agentsWorkflowReadInput,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async input => {
    const error = (message: string) => ({
      isError: true as const, content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
    });
    try {
      authorizeTool(options.auth, options.resourceAudience, ["tools:read", "workflows:read"]);
      if (options.auth.actorId !== options.owner.actorId || options.auth.tenantId !== options.owner.tenantId) {
        return error("Workflow read denied");
      }
      const url = new URL("/api/workflows/run", origin);
      const runId = "runId" in input ? input.runId : undefined;
      if ("workflowId" in input) {
        url.searchParams.set("workflowId", input.workflowId);
        if (input.before) url.searchParams.set("before", input.before);
      } else {
        url.searchParams.set("runId", input.runId);
      }
      const read = async () => {
        const response = await fetch(url, {
          headers: { authorization: `Bearer ${options.token}` },
          redirect: "error",
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok || !response.body) {
          await response.body?.cancel();
          throw new Error("Workflow run unavailable");
        }
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let bytes = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > 12_000) {
            await reader.cancel();
            return null;
          }
          chunks.push(value);
        }
        return Buffer.concat(chunks).toString("utf8");
      };
      let text = await read();
      let summary = false;
      if (text === null && runId) {
        authorizeTool(options.auth, options.resourceAudience, ["tools:read", "workflows:read"]);
        if (options.auth.actorId !== options.owner.actorId || options.auth.tenantId !== options.owner.tenantId) {
          return error("Workflow read denied");
        }
        url.searchParams.set("view", "summary");
        summary = true;
        text = await read();
      }
      if (text === null) return error("Workflow result exceeds read limit");
      const result = JSON.parse(text);
      authorizeTool(options.auth, options.resourceAudience, ["tools:read", "workflows:read"]);
      if (options.auth.actorId !== options.owner.actorId || options.auth.tenantId !== options.owner.tenantId) {
        return error("Workflow read denied");
      }
      if ("workflowId" in input) {
        const page = historyPage.safeParse(result);
        if (!page.success || page.data.runs.some(run => run.workflowId !== input.workflowId) ||
            (page.data.hasMore ? !page.data.nextCursor || page.data.nextCursor === input.before ||
              page.data.nextCursor !== page.data.runs.at(-1)?.id : page.data.nextCursor !== undefined)) {
          return error("Workflow history unconfirmed");
        }
        text = JSON.stringify(page.data);
      } else if ((summary && result?.view !== "summary") || result?.id !== runId || typeof result.workflowId !== "string") return error("Workflow read unconfirmed");
      return { content: [{ type: "text" as const, text }] };
    } catch {
      return error("Workflow read unconfirmed");
    }
  });
}
