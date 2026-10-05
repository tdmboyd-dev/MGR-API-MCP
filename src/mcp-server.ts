import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { actionDigest } from "./security.js";
import { DecisionEngine } from "./decision.js";
import { ValidatingCreationOSClient } from "./creation-client.js";
import { applyPrivacyPolicy } from "./privacy-firewall.js";
import { registerLegacyMcpTools, type LegacyMcpToolOptions } from "./legacy-mcp-tools.js";

export function createMgrMcpServer(options:{legacy?:LegacyMcpToolOptions}={}): McpServer {
  const server = new McpServer(
    { name: "mgr-api-mcp", version: "0.1.0" },
    {
      instructions:
        "MGR MCP is a governed task edge. Read-only/deterministic tools may answer immediately. Side-effecting capabilities require authenticated scopes, policy and approval before dispatch.",
    },
  );

  server.registerTool(
    "mgr_system_info",
    {
      description: "Return the current MGR shared-service boundaries and implementation state.",
      inputSchema: z.object({}),
    },
    async () => ({
      content: [{
        type: "text",
        text: JSON.stringify({
          apiMcp: "assistant/task/API/MCP edge",
          brain: "model-independent controller subsystem",
          creationOs: "shared creation/control-plane engine",
          createLoco: "visual/web reconstruction product using Creation OS",
          sideEffects: "not exposed by this bootstrap server",
        }),
      }],
    }),
  );

  server.registerTool(
    "mgr_action_digest",
    {
      description:
        "Create the deterministic digest used to bind an approval to one exact proposed action. This tool does not authorize or execute the action.",
      inputSchema: z.object({
        action: z.unknown(),
      }),
    },
    async ({ action }) => ({
      content: [{ type: "text", text: actionDigest(action) }],
    }),
  );

  server.registerTool(
    "mgr_validate_choice",
    {
      description:
        "Validate a bounded deterministic choice against an explicit allowlist. This does not grant permission to execute anything.",
      inputSchema: z.object({
        requestId: z.string().min(1),
        taskId: z.string().min(1),
        choices: z.array(z.string().min(1)).min(1),
        proposed: z.string().min(1),
      }),
    },
    async ({ requestId, taskId, choices, proposed }) => {
      const engine = new DecisionEngine([], [{
        name: "mcp-proposal",
        async decide(request) {
          if (!request.allowedChoices.includes(proposed)) return null;
          return {
            id: `decision:${request.id}:mcp`,
            requestId: request.id,
            provider: "mcp-proposal",
            choice: proposed,
            confidence: 1,
            createdAt: new Date().toISOString(),
          };
        },
      }]);

      const result = await engine.decide({
        id: requestId,
        taskId,
        questionVersion: "mcp.v1",
        stateHash: actionDigest({ choices, proposed }),
        allowedChoices: choices,
        risk: "low",
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            accepted: Boolean(result),
            choice: result?.choice ?? null,
          }),
        }],
        isError: !result,
      };
    },
  );

  server.registerTool(
    "mgr_privacy_check",
    {
      description:
        "Inspect/redact sensitive text before external model use. This tool does not send text to any external provider.",
      inputSchema: z.object({
        text: z.string(),
        externalProviderAllowed: z.boolean().default(true),
        redact: z.array(z.enum(["PUBLIC","INTERNAL","PII","FINANCIAL","TAX","HEALTH","SECRET"])).default(["PII","FINANCIAL"]),
        deny: z.array(z.enum(["PUBLIC","INTERNAL","PII","FINANCIAL","TAX","HEALTH","SECRET"])).default(["SECRET"]),
      }),
    },
    async ({ text, externalProviderAllowed, redact, deny }) => {
      const result = applyPrivacyPolicy(text, { externalProviderAllowed, redact, deny });
      return {
        content: [{ type: "text", text: JSON.stringify({
          decision: result.decision,
          text: result.text,
          findingTypes: [...new Set(result.findings.map((f) => f.type))],
          reason: result.reason ?? null,
        }) }],
        isError: result.decision === "DENY",
      };
    },
  );

  server.registerTool(
    "mgr_validate_creation_request",
    {
      description:
        "Check whether a Creation OS capability request has enough acceptance criteria to be dispatched. This bootstrap tool validates only; it does not call Creation OS.",
      inputSchema: z.object({
        requestId: z.string().min(1),
        tenantId: z.string().min(1),
        workspaceId: z.string().min(1),
        capability: z.string().min(1),
        acceptanceCriteria: z.array(z.string().min(1)),
      }),
    },
    async ({ requestId, tenantId, workspaceId, capability, acceptanceCriteria }) => {
      let transportCalls = 0;
      const validator = new ValidatingCreationOSClient({
        async execute(request) {
          transportCalls += 1;
          return {
            requestId: request.requestId,
            status: "SUCCEEDED",
            artifactRefs: [],
            evidenceRefs: [],
          };
        },
      });

      const result = await validator.execute({
        requestId,
        tenantId,
        workspaceId,
        capability,
        input: {},
        acceptanceCriteria,
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: result.status,
            blockers: result.blockers ?? [],
            wouldDispatch: transportCalls === 1,
          }),
        }],
      };
    },
  );

  if(options.legacy) registerLegacyMcpTools(server,options.legacy);

  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void serveStdio(createMgrMcpServer);
  console.error("MGR API MCP stdio server ready");
}
