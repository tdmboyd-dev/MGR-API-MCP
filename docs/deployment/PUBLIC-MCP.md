# Public MCP deployment gate

This repository is deployment-ready but does not claim a live public endpoint until the checks below pass against a real host.

## Render

`render.yaml` defines the Docker web service and health check. Connect the repository in Render and provide the secret/environment values marked `sync: false`.

Required values:

- `MCP_PUBLIC_BASE_URL`: final HTTPS origin, for example `https://mgr-api-mcp.onrender.com`
- `MCP_AUTH_ISSUER`: Auth0 tenant issuer, including HTTPS
- `MCP_JWKS_URL`: Auth0 JWKS URL
- `MCP_AUTHORIZATION_SERVER`: same Auth0 issuer unless a separate authorization server is used
- `LEGACY_BASE_URL`: deployed MGR Legacy API origin
- `LEGACY_SERVICE_TOKEN`: scoped API-MCP -> Legacy service credential when required

## Auth0 contract

Create an API/resource server whose audience is exactly:

```
<MCP_PUBLIC_BASE_URL>/mcp
```

The access token must include:

- `sub`
- `exp`
- audience matching the MCP resource URL
- `tenant_id` as a non-empty string, or change `MCP_TENANT_CLAIM`
- scopes containing `tools:read` and any execution scopes required by policy

The server validates tokens from `MCP_JWKS_URL`. Never place Auth0 client secrets or service tokens in the repository.

## Live verification

After deployment, run:

```bash
export MCP_SERVER_URL="$MCP_PUBLIC_BASE_URL/mcp"
export MCP_RESOURCE_AUDIENCE="$MCP_SERVER_URL"
export MCP_TEST_BASE_URL="$MCP_PUBLIC_BASE_URL"
export MCP_TEST_BEARER_TOKEN="<short-lived user access token>"

npm run verify:oauth-provider
npm run verify:remote-boundary
npm run verify:mcp-client
```

The final OpenAI-hosted MCP proof additionally requires a valid OpenAI API key:

```bash
export OPENAI_API_KEY="<secret>"
npm run verify:openai-mcp
```

A successful final proof must show tool discovery plus at least one authenticated MCP tool call. Store only non-secret receipts/results in `evidence/`.

## Production gate

Do not mark hosted MCP complete until all of these are true:

1. `/healthz` is healthy on the public HTTPS origin.
2. protected-resource metadata returns the deployed MCP resource URL.
3. missing/invalid bearer credentials fail closed.
4. Auth0 discovery/JWKS validation passes.
5. an authenticated MCP client can initialize and list the expected tools.
6. Legacy-backed calls return authoritative correlation/receipt evidence.
7. the OpenAI remote MCP verifier imports and calls the expected tool.
