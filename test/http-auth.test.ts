import assert from "node:assert/strict";
import test from "node:test";
import { authorizeMcpRequest } from "../src/http-auth.js";

const verifier = {
  async verify(token: string) {
    if (token !== "good") return null;
    return {
      subject: "actor-1",
      tenantId: "tenant-1",
      audience: "https://api.mgr.example/mcp",
      scopes: ["tools:read"],
      expiresAt: 1000,
    };
  },
};

test("MCP request auth fails closed for missing/invalid bearer token", async () => {
  const missing = await authorizeMcpRequest({
    verifier,
    resourceAudience: "https://api.mgr.example/mcp",
    requiredScopes: [],
    resourceMetadataUrl: "https://api.mgr.example/.well-known/oauth-protected-resource",
    now: 100,
  });
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.status, 401);

  const invalid = await authorizeMcpRequest({
    authorizationHeader: "Bearer bad",
    verifier,
    resourceAudience: "https://api.mgr.example/mcp",
    requiredScopes: [],
    resourceMetadataUrl: "https://api.mgr.example/.well-known/oauth-protected-resource",
    now: 100,
  });
  assert.equal(invalid.ok, false);
});

test("MCP request auth binds audience and scopes", async () => {
  const scopeDenied = await authorizeMcpRequest({
    authorizationHeader: "Bearer good",
    verifier,
    resourceAudience: "https://api.mgr.example/mcp",
    requiredScopes: ["tools:execute"],
    resourceMetadataUrl: "https://api.mgr.example/.well-known/oauth-protected-resource",
    now: 100,
  });
  assert.equal(scopeDenied.ok, false);
  if (!scopeDenied.ok) assert.equal(scopeDenied.status, 403);

  const ok = await authorizeMcpRequest({
    authorizationHeader: "Bearer good",
    verifier,
    resourceAudience: "https://api.mgr.example/mcp",
    requiredScopes: ["tools:read"],
    resourceMetadataUrl: "https://api.mgr.example/.well-known/oauth-protected-resource",
    now: 100,
  });
  assert.equal(ok.ok, true);
});
