import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { authorizeTool, type AuthContext } from "./authz.js";

export const agentsWorkflowReadInput = z.union([
  z.object({ runId: z.uuid(), expectedWorkflowId: z.uuid().optional() }).strict(),
  z.object({ workflowId: z.uuid(), before: z.uuid().optional() }).strict(),
  z.object({ catalog: z.literal(true), before: z.uuid().optional() }).strict(),
]);
const catalogPage = z.object({
  workflows: z.array(z.object({
    id: z.uuid(), name: z.string().min(1).max(100), triggerType: z.enum(["manual", "schedule", "event"]),
  })).max(20),
  hasMore: z.boolean(),
  nextCursor: z.uuid().optional(),
});
const runState = {
  status: z.enum(["pending", "running", "completed", "failed", "cancelled"]).optional(),
  outcomeState: z.enum(["unconfirmed", "recorded"]).optional(),
};
const consistentRunState = z.object(runState).refine(({ status, outcomeState }) =>
  outcomeState === undefined ||
  (status !== undefined && outcomeState === (status === "pending" || status === "running" ? "unconfirmed" : "recorded")),
);
const historyPage = z.object({
  runs: z.array(z.object({
    id: z.uuid(), workflowId: z.uuid(), scheduleId: z.uuid().nullable().optional(),
    ...runState,
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
    description: "Discover the configured owner's workflows, read an exact saved run, or page through saved runs. This tool does not dispatch or retry work.",
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
      if ("catalog" in input) {
        url.searchParams.set("view", "catalog");
        if (input.before) url.searchParams.set("before", input.before);
      } else if ("workflowId" in input) {
        url.searchParams.set("workflowId", input.workflowId);
        if (input.before) url.searchParams.set("before", input.before);
      } else {
        url.searchParams.set("runId", input.runId);
      }
      const notFound = Symbol("workflow-not-found");
      const read = async () => {
        const response = await fetch(url, {
          headers: { authorization: `Bearer ${options.token}` },
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.timeout(10_000),
        });
        if (response.status === 404) {
          await response.body?.cancel();
          return notFound;
        }
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
      authorizeTool(options.auth, options.resourceAudience, ["tools:read", "workflows:read"]);
      if (options.auth.actorId !== options.owner.actorId || options.auth.tenantId !== options.owner.tenantId) {
        return error("Workflow read denied");
      }
      if (text === notFound) return {
        content: [{type:"text" as const,text:JSON.stringify({readOutcome:"unavailable",...input})}],
      };
      const result = JSON.parse(text);
      if ("catalog" in input) {
        const page = catalogPage.safeParse(result);
        if (!page.success || page.data.workflows.some((item, index, rows) =>
          (input.before !== undefined && item.id <= input.before) || (index > 0 && item.id <= rows[index - 1]!.id)) ||
          (page.data.hasMore ? page.data.workflows.length !== 20 || page.data.nextCursor !== page.data.workflows.at(-1)?.id
            : page.data.nextCursor !== undefined)) return error("Workflow catalog unconfirmed");
        text = JSON.stringify(page.data);
      } else if ("workflowId" in input) {
        const page = historyPage.safeParse(result);
        if (!page.success || page.data.runs.some(run => run.workflowId !== input.workflowId || run.id === input.before ||
            !consistentRunState.safeParse(run).success) ||
            new Set(page.data.runs.map(run => run.id)).size !== page.data.runs.length ||
            (page.data.hasMore ? page.data.runs.length !== 20 || !page.data.nextCursor || page.data.nextCursor === input.before ||
              page.data.nextCursor !== page.data.runs.at(-1)?.id : page.data.nextCursor !== undefined)) {
          return error("Workflow history unconfirmed");
        }
        text = JSON.stringify(page.data);
      } else if ((summary && result?.view !== "summary") || result?.id !== runId || typeof result.workflowId !== "string" ||
          !consistentRunState.safeParse(result).success ||
          (input.expectedWorkflowId !== undefined && result.workflowId !== input.expectedWorkflowId)) return error("Workflow read unconfirmed");
      return { content: [{ type: "text" as const, text }] };
    } catch {
      return error("Workflow read unconfirmed");
    }
  });
}
