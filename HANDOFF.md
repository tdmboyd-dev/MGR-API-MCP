# Resume MGR-API-MCP

## Current living checkpoint — 2026-10-31 direct Forge creation (supersedes dated October 30 search-only claims below)

**This is the one current handoff for MGR-API-MCP.** The 2026-10-30 checkpoint below is preserved as dated history, not today's capability limit. Inspected base was GitHub `main` commit `1d69ef9c1c2f16d28c0c10410ba773bf6d2d6ba0`. Clean independent source checkout avoided another worker's modified branch; published revision lives in Git history after push.

**Boundary decision:** MGR-3D-FORGE is a standalone creator owning world geometry, 3D worker, rights-quarantined Vault and output files. Tevin/MGR-ONE and other consumers use this existing authenticated shared MCP/API edge to invoke Forge directly. MGR-CREATE-Os is a separate standalone **optional orchestrator** for cross-factory projects; direct 3D does not require it. Never create a duplicate router, credential authority or Forge asset store here.

### What is actually implemented and tested

- Existing conditional `mgr_forge_asset_discover` remains read-only (`tools:read`) and now exposes a third official live metadata source **ambientCG** alongside 3DAssets.dev and Poly Haven. Source listings are not downloaded models/rights approval.
- New conditional `mgr_forge_world_create` takes a bounded source-world GLB SHA, building edits, stable request ID, the token-bound **existing `tools:execute`** scope, actor, audience and allowed owner tenant. It submits to Forge Studio's real `/api/world-job` endpoint. A verified-looking fabricated receipt, missing SHA, wrong tenant or missing scope is denied; timeouts remain unknown/reconcile instead of claiming success.
- New conditional `mgr_forge_world_status` (`tools:read`) checks a stable job ID through `/api/world-job-status`, retaining interruption/recovery information.
- `ForgeStudioCatalogClient` reuses the existing loopback/HTTPS constrained base URL, bounded request/response size, token header and timeout. No public write endpoint or separate transport introduced.
- **Actual local protocol boundary proof:** `python scripts/verify-forge-studio.py` launched a real sibling Python Forge Studio HTTP process and invoked Node authorized MCP-tool helper calls. Generated a 13,964-byte editable world GLB with SHA `89144125aa7e9ac42d755a10eabdd283d6271cb2fb5f2af948d84e45fb0198ac`, replayed same output with identical hash, and denied wrong tenant and absent execute permission. This proves the local HTTP→Node integration with MCP policy functions, **not** a hosted remote MCP protocol conversation or Tevin session.
- **Regressions:** `npm run verify` PASSED (TypeScript, **60/60** tests, artifact/plugin checks). `test/forge-world.test.ts` covers side effects, false success, wrong tenant, read/write scopes, status and interruption; prior catalog tests still pass.
- Public configuration remains optional `MGR_FORGE_STUDIO_URL`, `MGR_FORGE_STUDIO_TOKEN`, `MGR_FORGE_TENANT_ID`; never commit real tokens. Hosted edge cannot reach local loopback without a separately approved authenticated relay.

### Source and preservation truth

Forge has 18 categorized source families, 3 tested live metadata adapters and one official KayKit pinned `Prototype Bits` archive preserved under the owner PC's private Forge Vault at `%USERPROFILE%\Documents\MGR-Forge-Vault`. The 773,696-byte package / 302 files (72 glTF models) remains rights/quality-quarantined; license text inside nested `Assets` folder does not automatically license all repo code. This repo stores **neither those binaries nor their content-addressed vault**; see sibling Forge `docs/HANDOFF.md` and `docs/DIRECT-CREATION-AND-KIT-PRESERVATION.md`.

### Real open gates / next tests

- Run hosted authenticated Tevin/MGR-ONE MCP client → Forge creative job → persisted file return and actual browser/Blender/Godot acceptance. The local Studio and localhost/HTTPS transport guard are not an internet access solution.
- Verify real OAuth advertised execute scope, service tokens/relay, tenant isolation, restart and cancellation against live infra, unknown status reconciliation and expensive/provider actions. Do not auto-rent GPU or publish source-licensed assets.
- Creation OS: optional cross-factory adapter with real receipts; reject its current reference-only media placeholders. No direct Forge job should be forced through it.
- Reinspect the exact production branch and re-run affected tests after any future implementation; do not reuse old 55-test totals as current source evidence.

**Scoped proof scorecard:** 5/5 local criteria passed (Forge HTTP boot, source read auth, world create+hash, duplicate replay/tenant/write denial, 60-test API verification). Hosted Tevin and real engine acceptance remain separate **OPEN** requirements. This percentage is NOT overall platform readiness.

Dated history preserved in `docs/history/`. Current status is above.
