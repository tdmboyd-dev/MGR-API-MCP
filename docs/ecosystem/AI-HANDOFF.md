# MGR-API-MCP — AI ecosystem handoff

Baseline: `95648526c6b7d380bed67e7b6f322ecf8faf428a`. Existing default: `main`. Repository: https://github.com/tdmboyd-dev/MGR-API-MCP.

Read existing AGENTS/work order/current handoff first. This file is integration context, not an additional work order or grant.

## Architecture and source anchors

Role: transport. No second business or brain database; no token passthrough; a configured transport is not a live successful connection.

Source anchors: `src/mcp-server.ts`, `src/mcp-http.ts`, `src/creation-mcp-tools.ts`, `src/action-sentinel.ts`. Paths are source locators, not an assertion that all internals were read. See the central path/hash ledger for inventory; human-read scope is narrower.

Inputs: Verified caller token; exact action/input, tenant, actor, correlation and idempotency identifiers.

Outputs: Protocol responses, authoritative downstream receipts, denied/approval-required/unknown states and read-only catalog.

Declared root package scripts (source declarations; not all were executed):

```json
{
  "typecheck": "tsc --noEmit",
  "test": "node --import tsx --test test/*.test.ts",
  "verify": "npm run typecheck && npm test && npm run verify:hosted-artifacts && npm run plugin:verify",
  "mcp:stdio": "tsx src/mcp-server.ts",
  "start:http": "tsx src/http-server.ts",
  "verify:remote-boundary": "node scripts/verify-remote-boundary.mjs",
  "verify:mcp-client": "node scripts/verify-mcp-client.mjs",
  "verify:oauth-provider": "node scripts/verify-oauth-provider.mjs",
  "verify:openai-mcp": "node scripts/verify-openai-remote-mcp.mjs",
  "verify:hosted-artifacts": "node --check scripts/verify-oauth-provider.mjs && node --check scripts/verify-openai-remote-mcp.mjs && node --check scripts/verify-mcp-client.mjs",
  "plugin:render": "node scripts/render-chatgpt-plugin.mjs",
  "plugin:verify": "node scripts/verify-chatgpt-plugin.mjs"
}
```

## Current repair and proof

Bind full creation input and authenticated identity/risk to digest; add actual catalog tool and protocol regression.

This cycle: 54/54 passed for typecheck + Node suite + packaging checks. This is not whole-product acceptance.

## Next implementation contract

Work item `ECO-006`: Server-owned action/risk registry and durable approval consumption; implement and prove admitted Creation/VOICE transports.

Before dispatch bind principal, tenant/workspace/resource, canonical domain action, input/artifact revision digest, idempotency/correlation, account/recipient/cost ceiling and grant expiration where applicable. Resolve risk using server-owned action policy, not caller labels. Exact fields must adapt to existing ONE/domain contracts, not duplicate them.

Negative acceptance: wrong actor/tenant/scope, modified payload/target, expired/replayed approval, duplicate request, lost response, cancellation and restart. Domain owner retains authoritative receipt; unknown outcomes are reconciled before retry. Rights and consent follow the actual artifact/model/use.

Rollback: Preserve original source/data; revert only owned source change; reconcile external effects before retry or compensation.

## Integration truth

The new source catalog lists this repository as catalogued, with runtimeVerified=false and no executable tools. Local read-only discovery through ONE/API-MCP has separate integration proof. No discovery response authorizes execution or proves this domain is deployed. Candidate existing tool: `mgr_ecosystem_catalog`; validate configured transport and scopes.

Highest-value measured upgrade: Typed capability admission with exact grants, schema versions and provider-independent connection receipts; benchmark discovery and unknown-result recovery.
