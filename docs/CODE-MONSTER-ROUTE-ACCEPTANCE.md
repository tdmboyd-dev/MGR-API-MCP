# Rare → original MGR API/MCP → MGR Code Monster

**Date:** November 9, 2026. **State:** locally integrated and independently exercised with test identity/approval; **NOT hosted, NOT production-ready**.

## No duplicate servers

1. Rare / ChatGPT uses the **existing** `MGR-API-MCP` OAuth/JWKS Streamable HTTP entry `/mcp`, not the internal Code Monster port. The existing JWT verifier binds user, tenant, audience, scopes and token expiry before MCP tool registration.
2. Only the MCP server holds an internal HMAC key. `src/code-monster-client.ts` sends a fresh signed, bounded request to the existing Code Monster `src/rare-bridge.mjs`. Its `src/rare-service.mjs` starts bound to `127.0.0.1` by default. Remote service meshes require a separately verified authenticated HTTPS/private connection; never open the raw service on the public internet.
3. Code Monster independently checks tenant, audience, scopes, nonce freshness/replay and exact action-approval digest. Its code-graph and portfolio tools are read-only. Candidate writes go through its native Git CAS/territory ownership/durable ledger and **remain unverified** until a separate signed-v2 verifier has run.
4. A durable independent owner-approval service is still missing. Without it the MCP repair-stage tool replies `APPROVAL_UNAVAILABLE`. An OAuth execute token or a model suggestion cannot authorize its own code change.

## Registered tools

| Actual tool | Scope | Action and truth |
|---|---|---|
| `mgr_code_monster_capabilities` | `tools:read` | Read real internal service methods/availability; never stage |
| `mgr_code_monster_portfolio_plan` | `tools:read` | Return pinned discovery-only repository intake, not production certification |
| `mgr_code_monster_code_search` | `tools:read` | Query fixed Git SHA source graph for path/symbol; lexical, not a compiler-grade semantic proof |
| `mgr_code_monster_repair_stage` | `tools:execute` **plus independent exact-action approval** | Stage an isolated candidate; default hosted config DENIES because no durable resolver exists |

### Config owned by the API host

The optional `MGR_CODE_MONSTER_URL`, `MGR_CODE_MONSTER_BRIDGE_SECRET_BASE64` and `MGR_CODE_MONSTER_TENANT_ID` must be provided together; `.env.example` documents them without exposing real values. The key must be independently generated, at least 32 bytes, and privately installed on both the API and Code Monster internal service. Users/models/tool arguments never choose the URL or see the key. HTTPS is mandatory outside local loopback. Outbound redirects are prohibited. Write timeouts return `UNKNOWN_EXTERNAL_STATE` and require reconciliation before any retry.

Code Monster internal service (`src/rare-service.mjs`) takes `MGR_CM_BRIDGE_SECRET_BASE64`, `MGR_CM_OWNER_TENANT_ID`, `MGR_CM_SOURCE_REPO_ROOT`, `MGR_CM_SOURCE_COMMIT`, `MGR_CM_PORTFOLIO_PATH`, and optional `MGR_CM_PORT` (default 8799). Native literal staging requires **both** `MGR_CM_STAGE_STATE_DIRECTORY` and an operator-selected `MGR_CM_STAGE_APPROVED_COMMAND_JSON` pinned outside model input. Stage-only never reports verified/production-ready. Do **not** enable a writable tool on a hosted service without the durable trusted approval resolver and private hardened runner.

### Actual source tests

From a clean checkout of MGR-API-MCP:

```bash
npm install --ignore-scripts --no-audit --no-fund --no-package-lock
npm run verify
python scripts/verify_repository.py
```

The November 9 development run passed **95/95** API tests plus TypeScript, artifact syntax and plugin checks. MGR Code Monster advanced branch passed **222/222** tests including the real internal service and candidate stage. No bypass of earlier signed v2 receipt admission was accepted.

For the **optional cross-repo test**, place genuine Code Monster source on the same trusted host and run:

```bash
MGR_CODE_MONSTER_SOURCE_DIR=/path/to/MGR-CODE-MONSTER \
  node --import tsx scripts/verify-code-monster-actual-route.mjs
```

This runner creates a **temporary synthetic repository**, not an MGR production app. It uses the official MCP client, an OAuth test-token fixture, a trusted test-only approval resolver and the **actual** Code Monster service and Git writer. It reproduced a known bug in `src/bug.mjs` (`a + 0`), got a failing baseline `node --test`, signed the exact MCP→Code Monster request, staged `a + b` in `refs/heads/mgr/candidates/*`, verified the original Git HEAD was unchanged and re-ran `node --test` successfully from the candidate worktree. Ledger verification succeeded. An invalid approval ID was refused. This does not count as a production app repair or full signed v2 promotion; candidate remains pending independent signed evidence and owner release review.

### Denials and known gaps

- Missing/invalid JWT, wrong issuer/audience, expired token, scope mismatch, wrong owner tenant → denied before downstream dispatch.
- Missing or forged approval, changed digest, wrong actor/tenant or expired independently resolved grant → denied before code stage.
- Wrong HMAC, stale time, replayed nonce, unknown method → Code Monster denies; no public or unsigned fallback.
- Underlying source drift, repeated patch anchor, dirty checkout, missing command policy, concurrent territory lease, candidate compare-and-swap drift → existing Code Monster controls deny or require reconciliation.
- HTTP 200 with domain-level `accepted:false` no longer falsely returns MCP success; unknown write outcome is **not** blindly retried.
- **Still required:** genuine hosted OAuth/JWKS and Rare account registration; private secure service deployment, durable external approval resolution and revocation; real provider model proposals; independent signed-v2 verification runner; comprehensive audits and production gates for all 14 repositories.

**Owner source:** [MGR Code Monster advanced branch](https://github.com/tdmboyd-dev/MGR-CODE-MONSTER/tree/mgr/receipt-admission-20261029), `HANDOFF.md`, `docs/MGR-NATIVE-CODING-ENGINE.md`. **Shared source:** this repo's one `HANDOFF.md`, `BUILD-QUEUE.md`, `AUDIT-LEDGER.md`, `docs/API-MCP-ENGINEERING-HANDBOOK.md`.
