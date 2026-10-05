# Hosted MCP production proof

Updated: 2026-10-05

## Selected production-compatible combination

The repository's current Node/Docker implementation will use this exact hosted path for the next public proof:

- **Authorization server:** Auth0 OAuth/OIDC.
- **MCP SDK:** `@modelcontextprotocol/server` 2.1.0 with Streamable HTTP.
- **Public host:** Render Docker web service.
- **Business authority:** MGR Legacy.
- **Creation authority:** Creation OS.
- **OpenAI proof client:** OpenAI Responses API remote MCP tool using `server_url` and an OAuth access token.

This combination was chosen because the repository already validates JWT access tokens with issuer, audience, JWKS, tenant claim, scope claim, expiration and required scopes. It does not require replacing the existing MCP server with a provider-specific runtime.

## Current cost / license checkpoint

Verified October 5, 2026:

- Auth0 Free is listed at **$0/month** and supports up to **25,000 MAU** on the current pricing page.
- Render has a **$0 free web-service compute plan** for testing/proof. Render explicitly says free compute is not for production and may spin down after idle time.
- Render's smallest always-on paid web-service compute option is currently listed at **$7/month** for 0.5 CPU / 512 MB.
- `@modelcontextprotocol/server` is already pinned in this repository.
- The production artifact is a Docker container, so the host can be changed later without changing the MGR service boundary.

Current source references:
- https://auth0.com/pricing
- https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow/add-login-auth-code-flow
- https://render.com/pricing
- https://render.com/docs/free
- https://render.com/docs/blueprint-spec
- https://developers.openai.com/api/docs/guides/tools-connectors-mcp

## Auth0 configuration contract

Create one Auth0 API whose Identifier is the exact public MCP resource URL:

```
https://<public-host>/mcp
```

Enable these API permissions:

- `tools:read`
- `tools:execute`

Enable offline access so clients that request `offline_access` can receive refresh tokens.

The access token must contain:

- `sub`: authenticated actor ID
- `aud`: exact MCP resource URL
- tenant claim configured by `MCP_TENANT_CLAIM`
- `scope`: space-delimited granted scopes
- `exp`: expiration

Auth0 requires custom claims to be namespaced. Recommended tenant claim:

```
https://mgr.moneygrindreligion.com/tenant_id
```

Add the claim with an Auth0 Action using your real tenant lookup. Do not hard-code one tenant for all users.

## Render deployment contract

`render.yaml` is now the source-controlled deployment blueprint.

For proof, the blueprint uses Render's free plan to avoid automatic spend. Before production traffic, move to an always-on paid plan because Render free services can spin down.

Required Render environment values:

| Variable | Meaning |
| --- | --- |
| `MCP_PUBLIC_BASE_URL` | Public HTTPS service root, e.g. `https://mgr-api-mcp.onrender.com/` |
| `MCP_AUTH_ISSUER` | Auth0 issuer, e.g. `https://<tenant>.auth0.com/` |
| `MCP_JWKS_URL` | Auth0 JWKS endpoint |
| `MCP_AUTHORIZATION_SERVER` | OAuth authorization-server issuer |
| `MCP_TENANT_CLAIM` | Namespaced tenant claim |
| `MCP_RESOURCE_DOCUMENTATION` | Public MGR MCP documentation URL |
| `LEGACY_BASE_URL` | Authenticated MGR Legacy service URL |
| `LEGACY_SERVICE_TOKEN` | Service credential for MCP -> Legacy |
| `LEGACY_TIMEOUT_MS` | Legacy request timeout |

Never commit actual secrets.

## Verification sequence

### 1. Provider readiness

```bash
MCP_AUTH_ISSUER="https://<tenant>.auth0.com/" \
MCP_RESOURCE_AUDIENCE="https://<public-host>/mcp" \
MCP_TEST_BEARER_TOKEN="<optional-real-token>" \
npm run verify:oauth-provider
```

The verifier checks discovery, issuer consistency, authorization endpoint, token endpoint, JWKS, PKCE S256, signing keys, advertised offline access and—when a token is supplied—subject, issuer, audience and expiration.

### 2. Direct remote MCP proof

```bash
MCP_TEST_BASE_URL="https://<public-host>" \
MCP_TEST_BEARER_TOKEN="<access-token>" \
npm run verify:remote-boundary

MCP_TEST_BASE_URL="https://<public-host>" \
MCP_TEST_BEARER_TOKEN="<access-token>" \
npm run verify:mcp-client
```

### 3. OpenAI-hosted MCP proof

```bash
OPENAI_API_KEY="<key>" \
OPENAI_MODEL="gpt-6-astra" \
MCP_SERVER_URL="https://<public-host>/mcp" \
MCP_TEST_BEARER_TOKEN="<access-token>" \
npm run verify:openai-mcp
```

This test requires OpenAI to list and call `mgr_truth_summary` through the remote MCP server. It fails if the server cannot be imported, if the expected tool is absent, or if the MCP call returns an error.

### 4. GitHub one-pass hosted proof

The manual workflow `.github/workflows/hosted-proof.yml` runs all three proof layers from repository secrets.

Required secrets:

- `MCP_AUTH_ISSUER`
- `MCP_RESOURCE_AUDIENCE`
- `MCP_OIDC_DISCOVERY_URL` (optional override; leave absent to use issuer discovery)
- `MCP_TEST_BASE_URL`
- `MCP_SERVER_URL`
- `MCP_TEST_BEARER_TOKEN`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional)

## ChatGPT app proof

ChatGPT connects to **remote** MCP servers. Once the hosted endpoint is reachable and OAuth is configured, create the custom app in ChatGPT developer mode, enter the MCP endpoint, complete OAuth, scan tools, and test read/write actions as allowed by the workspace plan and policy.

The repository can prepare and verify every protocol/deployment artifact, but it cannot manufacture an Auth0 tenant, Render workspace, OpenAI API key, or ChatGPT workspace authorization. Those are external account boundaries, not missing code.

## Completion state

Repository-owned build work for the hosted boundary is complete when:

- main CI is green,
- container boundary proof is green,
- Render blueprint exists,
- OAuth provider preflight exists,
- direct hosted MCP verifier exists,
- OpenAI-hosted MCP verifier exists,
- one-pass hosted proof workflow exists,
- source-of-truth docs identify the remaining account/credential gates exactly.

The final public-host and ChatGPT-session proof becomes complete only after real account configuration supplies the endpoint and credentials.
