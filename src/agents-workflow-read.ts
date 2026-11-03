import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { authorizeTool, type AuthContext } from "./authz.js";

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
    description: "Read an exact saved MGR Agents workflow attempt for the configured owner. This tool does not dispatch or retry work.",
    inputSchema: z.object({ runId: z.uuid() }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async ({ runId }) => {
    const error = (message: string) => ({
      isError: true as const, content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
    });
    try {
      authorizeTool(options.auth, options.resourceAudience, ["tools:read", "workflows:read"]);
      if (options.auth.actorId !== options.owner.actorId || options.auth.tenantId !== options.owner.tenantId) {
        return error("Workflow read denied");
      }
      const url = new URL("/api/workflows/run", origin);
      url.searchParams.set("runId", runId);
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
      if (text === null) {
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
      if (options.auth.actorId !== options.owner.actorId || options.auth.tenantId !== options.owner.tenantId ||
          (summary && result?.view !== "summary") || result?.id !== runId || typeof result.workflowId !== "string") return error("Workflow read unconfirmed");
      return { content: [{ type: "text" as const, text }] };
    } catch {
      return error("Workflow read unconfirmed");
    }
  });
}
