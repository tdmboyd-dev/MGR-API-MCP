# Backwards–Forwards research: remote MCP authorization boundary — 2026-09-29

Status: narrow RESEARCHED and proposed SPECIFICATION; no hosted server, live OAuth provider or authenticated request journey. Base main @ 42ea88906ba92a91deae361b3475bbdb4495b264. This is the API/MCP-owned research, not a new Creation OS implementation.

## Backwards: exact source behavior

- `src/mcp-http.ts` returns a web-standard handler and creates a fresh `createMgrMcpServer()` per request. Its comment says middleware must establish caller identity before public exposure, but it does not call the repo's `authorizeMcpRequest` function.
- `src/http-auth.ts` defines an injected token verifier and checks audience, expiry and scopes, returning an AuthContext. `src/oauth-metadata.ts` constructs metadata/challenge values. These are independent primitives, not a connected HTTP authentication flow.
- `src/mcp-server.ts` registers five bootstrap tools. They are read-only/deterministic in effect. `mgr_validate_creation_request` simulates a successful downstream transport to report whether a request *would* dispatch; it never calls Creation OS. The HTTP factory test only checks that `fetch` and `close` functions exist; it does not send a request with a bearer token or assert denial.
- `src/engine.ts` persists tasks/jobs in an in-memory Map and checks duplicate job keys in that process. Restart recovery, cross-tenant idempotency namespace and database receipts are not shown by this class. The current scorecard already calls durable storage and live hosted MCP open.

## Primary sources and disposition

- MCP authorization specification, 2025-11-25: https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization . Resource server must validate token audience for itself; expired/invalid tokens return HTTP 401; passthrough to downstream services is prohibited. **ADOPT** as HTTP boundary invariants. We read the authentication, resource and security sections; not the entire specification or every linked RFC.
- MCP Streamable HTTP transport, 2025-11-25: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports . **ADAPT** transport handling and browser-origin/session constraints to the selected SDK; verify the deployed SDK version against that protocol edition. No protocol conformance suite executed here.
- OpenTelemetry context propagation: https://opentelemetry.io/docs/concepts/context-propagation/ and baggage: https://opentelemetry.io/docs/concepts/signals/baggage/ . **ADAPT** correlation/trace links but exclude personal and secret content from headers; propagated baggage is visible to intermediaries. Instrumentation cannot substitute for action receipts.

## Required bridge before publishing `/mcp`

1. Authenticate *each* inbound HTTP request before parsing tool dispatch. Reject missing/invalid/expired/wrong-audience tokens at HTTP 401; missing scope at 403 with a truthful challenge. Supply the validated actor/tenant/scopes to the request-scoped tool server; no user-supplied tenantId may override it.
2. Serve protected-resource metadata for the exact HTTPS resource. Choose a real authorization server and verify token signatures/issuer, audience/resource, expiry and required scopes via a trusted verifier. The current `AccessTokenVerifier` interface is not itself such a provider.
3. Keep read-only tool scopes distinct from future consequential tools. Re-run execution-time policy, exact-action approval and receipt checks for any side effect. Exchange for separate downstream credentials; never forward the incoming MCP token to Creation OS or another API.
4. Bind task/job idempotency to tenant + actor + operation and durable persistence before offering resumable work. Compare identical keys with different payloads and reconcile an external side effect after timeout/restart. Scope and memory isolation must be proved with two independent tenants.
5. Expose privacy-safe trace correlation across Task -> Decision -> ToolCall -> ProviderCall -> Receipt. Sanitized logs, measured latency/cost and failure reason belong to the evidence; raw tokens and personal data do not.

## Acceptance/failure matrix

Cases: no token; malformed bearer; untrusted issuer/signature; wrong audience; expired token; valid token without scope; forged tenantId; replay of different payload under same key; two tenants with same idempotency key; blocked tool; method/origin mismatch; disconnect mid-stream; cancellation; restart after downstream side effect; provider timeout. Each has an observable HTTP result, stored state and denial/receipt proof as appropriate. A function-existence test is not enough. No live provider or hosted test was run.

## Queue decision

Research first on selected IdP/host/SDK exact versions, OAuth integration and HTTP fixtures. Then implement this narrow bridge with failure tests; only later expose a live server and evaluate the long-running assistant. The current source is useful scaffolding, not a deployed authenticated service. Third-party protocols are referenced, not copied or vendored; dependency licenses/costs remain to be resolved before integration.
