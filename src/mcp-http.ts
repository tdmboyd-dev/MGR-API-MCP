import { createMcpHandler } from "@modelcontextprotocol/server";
import { createMgrMcpServer } from "./mcp-server.js";

/**
 * Web-standard MCP entry point for remote serving.
 *
 * Authentication middleware must populate/validate caller identity before this
 * handler is exposed publicly. The current factory creates a fresh governed
 * server per HTTP request, matching the MCP v2 serving model.
 */
export function createMgrMcpHttpHandler() {
  return createMcpHandler(() => createMgrMcpServer());
}

export const mgrMcpHttpHandler = createMgrMcpHttpHandler();
