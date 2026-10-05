# MGR API MCP — Container Boundary Proof — 2026-10-05

GitHub Actions run: 37291231033
Result: PASS
Workflow: `.github/workflows/container-boundary.yml`

## Proven in the run

- Production Docker image built from the repository.
- Separate JWKS/OIDC-style verifier boundary ran over HTTP.
- Separate Legacy service boundary ran over HTTP.
- MCP service ran as its own containerized Node process.
- Health endpoint passed.
- OAuth protected-resource metadata passed.
- Unauthenticated MCP request returned 401 with resource metadata challenge.
- Authenticated initialization passed using the official `@modelcontextprotocol/client`.
- `mgr_legacy_execute` duplicate delivery reused the authoritative idempotency result.
- Forced timeout-after-commit reconciled through Legacy Truth receipts.
- The MCP process was destroyed and recreated; replay after restart returned the original Legacy receipt.
- Mock Legacy mutation count was exactly 3 for exactly 3 unique idempotency keys.

Observed proof payloads:

```json
{"ok":true,"health":"pass","protectedResourceMetadata":"pass","unauthenticatedChallenge":"pass","authenticatedInitialize":"pass"}
{"ok":true,"mode":"full","duplicateDelivery":"pass","timeoutReconciliation":"pass","restartSeed":"pass","duplicateReceiptId":"receipt-1","timeoutReceiptId":"receipt-2","restartReceiptId":"receipt-3"}
{"ok":true,"mode":"restart-replay","restartReplay":"pass","receiptId":"receipt-3"}
{"mutationCount":3,"keys":["idem-duplicate-boundary","idem-timeout-boundary","idem-restart-seed"]}
```

## Boundary

This is a real process/network/container deployment proof inside CI. It is not evidence of a public production host, a production authorization provider, production secrets, or a ChatGPT-hosted MCP session.
