import assert from "node:assert/strict";
import test from "node:test";
import { buildProtectedResourceMetadata, buildWwwAuthenticate } from "../src/oauth-metadata.js";

test("protected resource metadata requires HTTPS audience and authorization server", () => {
  assert.throws(() => buildProtectedResourceMetadata({
    resource: "http://localhost/mcp",
    authorizationServers: ["https://auth.example.com"],
    scopes: ["tools:read"],
  }));

  const metadata = buildProtectedResourceMetadata({
    resource: "https://api.mgr.example/mcp",
    authorizationServers: ["https://auth.mgr.example"],
    scopes: ["tools:execute", "tools:read", "tools:read"],
  });

  assert.deepEqual(metadata.scopes_supported, ["tools:execute", "tools:read"]);
});

test("WWW-Authenticate advertises resource metadata and insufficient scope", () => {
  assert.equal(
    buildWwwAuthenticate({
      resourceMetadataUrl: "https://api.mgr.example/.well-known/oauth-protected-resource",
      error: "insufficient_scope",
      scope: ["tools:execute"],
    }),
    'Bearer resource_metadata="https://api.mgr.example/.well-known/oauth-protected-resource", error="insufficient_scope", scope="tools:execute"',
  );
});
