import assert from "node:assert/strict";
import test from "node:test";
import { createMgrMcpHttpHandler } from "../src/mcp-http.js";

test("remote MCP factory exposes a web-standard fetch handler", () => {
  const handler = createMgrMcpHttpHandler();
  assert.equal(typeof handler.fetch, "function");
  assert.equal(typeof handler.close, "function");
});
