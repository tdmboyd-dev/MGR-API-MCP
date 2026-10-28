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


## October 28 completion continuation

Branch: `repair/completion-2026-10-28`, preserving the prior audit branch and unpublished checkpoints. Default branches remain unchanged.

The actual configured Tevin model → authenticated owner HTTP → ONE anchored approval → MCP HTTP → existing local SQLite engineering service → qualified Windows AppContainer snapshot worker journey passed 15/15 bounded acceptance checks. Report assignment `85967de4-b5cf-4cca-91fd-f216bc2dcfaf`, canonical JSON 4,360 bytes, SHA256 `4c35e127e00016c309627b481d20f1e01ad68615b5b493813910b17ffd60a8ff`. After closing/reopening ONE, status refreshed currentness and exact report bytes reopened without another dispatch. A one-action owner delegation exhausted its limit. This is an agent-driven authenticated owner route, not a claim the human clicked approval or accepted the final experience.

The final 22/22 check rerun reused that accepted native assignment; it did not rerun the native process. It additionally read a genuine prior failed report through ONE (still failed, matching its original hash), denied artifact publication for an uncertain canceled job, reconciled unknown without redispatch, canceled before admission and denied a changed candidate digest. Counts overlap; do not add them. Initial fresh execution and final historical reconciliation are distinct.

API repair: authorization is checked synchronously after awaited native binding immediately before POST. Held-binding expiry, scope withdrawal and actor/tenant change each now produce zero POSTs. Expiry after dispatch suppresses publication and does not retry. Generic Legacy/Creation tool admission now uses a server-owned risk floor: only known contact create/update and explicit zero-cost Markdown creation can reach bounded generic dispatch. Unknown/sensitive/paid capabilities require approval and cannot execute through this generic interface (it has no approval-consumption endpoint). Caller labels can increase risk, never lower it. ONE remains owner of exact approvals/delegation. Generic Legacy reads now check authorization before and after awaited data.

ONE defense: canonical report digest must match the standard SHA256 alias and saved receipt; a reproduced conflicting-alias case now fails closed. Dedicated workflow/UI suite 15/15 passed. The fresh final full compiled/web suite passed 1453/1453 after the defense; zero failures, cancellations or skips. API full suite 100/100 passed, typechecking, verifier syntax and plugin checks passed; repository integrity 181/181 passed after the final documentation append. These are separate denominators, not product completion.

No native launcher/runtime policy changed. No code applied to an owner project, no publishing/deployment, paid generation, live financial effect, signing, sending or physical microphone acceptance occurred. Whole-product completion remains unassessed. Original 283 child requirements and 28 areas validate; broad obligations remain open. Next: remaining original requirements, hosted auth, business onboarding, physical voice/device proof, then the queued domain journeys. Use current source over stale pre-continuation handoff claims.
