# Resume MGR-API-MCP

## CURRENT RECOVERED FORGE WORLD COMPOSITION — 2026-11-01

**This is the ONE existing shared MGR API/MCP repository**, not a new local service. Recovering source built after 2026-10-31 published commit 7ce84d7. Current src/forge-catalog-client.ts and src/forge-mcp-tools.ts add scoped composed-world creation/status using the SAME authorized tenant, audience, tools:execute and tools:read, reusing Forge's one Studio job/vault. No duplicate transport/router/Creation OS middleman. Tests/test/forge-world-composition.test.ts and existing full suite npm run verify 85/85 PASS.

**Real related Forge backend:** sibling MGR-3D-FORGE/forge/world_composition.py and forge/world_composition_jobs.py, existing Studio /api/world-compose-create/status and Blender receiver, one GLB plus Godot source archive and replay-safe job. Evidence in Forge evidence/world/2026-11-01-combined-world-blender-godot.json and evidence/world/2026-11-01-studio-composed-world-acceptance.json. Source archive packaging does NOT prove a running Godot engine, hosted remote endpoint, production OAuth/JWKS, or ChatGPT/Tevin app acceptance. The private Forge Creator plugin remains skills-first unless deployed hosted tools are independently proven.

**Current operator reading order:** THIS HANDOFF.md -> docs/API-MCP-ENGINEERING-HANDBOOK.md -> src/forge-mcp-tools.ts, src/forge-catalog-client.ts, src/mcp-http.ts and tests -> sibling MGR-3D-FORGE/docs/HANDOFF.md. Keep exact state/repair/next proof in these two canonical handoffs, not a competing document.


## CURRENT DIRECT MGR FORGE CREATION + VERIFIED GLB MCP EDGE — 2026-10-31

**Latest exact verification:** npm run verify => 81/81 API tests PASS; real official MCP protocol using fixture authorizations also passed both original biome/creature and Human Forge independent Blender GLB bytes with tenant/scope/digest checks. Forge full same-wave regression: 624 tests run, 3 skipped, zero failures, source MGR-3D-FORGE/evidence/audits/2026-10-31-megawave-full-regression.json. Both repo-owned Chrome source tests passed in the Forge checkout. No public deploy/OAuth credentials or paid neural GPU was proven in these local tests.



**One original shared API/MCP repo, not a new local project.** It owns the real HTTP, OAuth/JWKS, verified audience and scope binding. Forge owns geometry, Blender jobs, model assets and job state. The local SDK tests use a FIXTURE token verifier to test the real existing handler and do NOT prove a deployed hosted session.

**Source paths built in this wave:** src/mcp-server.ts fixed misleading old tools:write status to actual tools:execute. src/forge-catalog-client.ts gained six-field MorphRig contract, createBiome/biomeStatus, startHumanLipSync/humanLipSyncStatus and readArtifact. src/forge-mcp-tools.ts registers governed mgr_forge_biome_create/status, mgr_forge_human_lipsync_start/status and mgr_forge_artifact_read with job ID + exact SHA and optional real GLB resource (800KB maximum). tools:read for read-only, tools:execute for side effects, no public file URL, no new backend or duplicate Forge Vault. Negative proof includes wrong tenant, missing execute scope, forged receipt/wrong digest.

**Actual source/test/evidence:** test/forge-biome.test.ts, test/forge-human-lipsync.test.ts, test/forge-artifact-transfer.test.ts; official SDK scripts/verify-forge-native-mcp-protocol.mjs and scripts/verify-forge-creator-mcp.py; evidence/forge-creator/2026-10-31-native-mcp-protocol-artifact-transfer.json and evidence/forge-creator/2026-10-31-native-mcp-protocol-human.json (real Human MCP Blender + GLB receipt PASSED, SHA verified). Real Python Forge Studio generated distinct creature+biome GLBs with SHA-verified embedded binary through MCP. Run npm run verify, python scripts/verify-forge-creator-mcp.py from sibling checkout, and actual hosted OAuth test only after real configured deployment exists.

**OPEN / blockers:** Real hosted OAuth/JWKS protected URL + connected Forge worker, secure artifact/object storage with expiring download URLs and owner-controlled secrets, actual Tevin and ChatGPT remote consumer/phone acceptance, 14–24GB CUDA inference/cloud model with clear license and cost. Current private ChatGPT Forge Creator plugin remains skills-only source and cannot automatically read owner Windows model files. The Render blueprint in this repo is a deployment plan, NOT live acceptance. Every new model requires code/weight/dataset rights and Blender/Godot materialization proof.

**Resume:** THIS HANDOFF.md, docs/API-MCP-ENGINEERING-HANDBOOK.md, AUDIT-LEDGER.md, BUILD-QUEUE.md, source/test/evidence, sibling MGR-3D-FORGE/docs/HANDOFF.md. All new work must update the ONE source of truth and push/test same-commit.


## CURRENT FULL SOURCE-BASED API/MCP HANDBOOK — 2026-10-31

**Additional integrity fix:** docs/history/FORGE-SOURCE-CHECKPOINT-2026-10-30.md had a broken relative WORK-STATE.md link; corrected to ../../WORK-STATE.md and preserved the dated record. python scripts/verify_repository.py now **184 checks PASS, 0 failures**. Safe proof: evidence/audits/2026-10-31-reference-link-repair.json. This is repository integrity, not hosted service certification.



**Final same-wave verification:** npm run verify **69/69**, python scripts/verify-forge-studio.py actual local Node/Python original world and creature GLB PASS after Forge artifact token security update; Forge 608 run with 3 skips and Creation OS 123/123. No hosted remote Tevin/ChatGPT acceptance claimed.

This is the user's ACTUAL shared MGR-API-MCP repository, not a new local bridge. Current code includes hosted src/http-server.ts, src/mcp-http.ts, src/mcp-server.ts, real JWT/OAuth auth and source bindings to Forge; 'local' in the previous test report only names the Windows location of verified Python Studio -> Node adapter tests. A live hosted remote client and private Forge worker relay are not proved by localhost.

Static full tracked-file audit: 169 files at b0b225c, 56 JS/TS source texts read, 4 Python AST, 47 Markdown, 21 tests, zero parse errors; exact hashed inventory evidence/audits/2026-10-31-baseline-static-inventory.json. New real how-to and call/permissions map: docs/API-MCP-ENGINEERING-HANDBOOK.md. Forge's current complete module/operating guides live in sibling MGR-3D-FORGE; do not copy as a rival handoff.

Forge now consistently requires its session token for all local private output /files GET, not just creatures. This existing API/MCP bridge already uses the Studio token; hosted expiring artifact delivery/real OAuth path remains OPEN. Baseline verification 68/68 tests, plus new handbook guard pending rerun. Creation OS is optional multi-factory. This HANDOFF.md stays sole living API/MCP resume authority.

## Current native 3D Forge Creator connection — 2026-10-31

**Only current API/MCP handoff remains HANDOFF.md**; sibling Forge authority is MGR-3D-FORGE/docs/HANDOFF.md and the published full spec is MGR-3D-FORGE/docs/MASTER-FORGE-PROGRAM-2026-10-31.md. The previous dated REA and world-creation sections below are historical proof, not a claim that hosted ChatGPT execution now exists.

**Real newly implemented:** src/forge-catalog-client.ts ForgeStudioCatalogClient.createCreature/creatureStatus and src/forge-mcp-tools.ts gated mgr_forge_creature_create/mgr_forge_creature_status, conditional on existing Forge configured, using the CURRENT resource audience, tools:execute for creation, tools:read for status and EXACT permitted tenant. No new domain brain, transport server or asset storage introduced. Forge handles actual CPU original mesh generation in sibling MGR-3D-FORGE/forge/creature_jobs.py and existing Studio API /api/creature-create /api/creature-status. Stable IDs and restart/replay recovery are Forge-owned.

**Actual integration proof:** scripts/verify-forge-studio.py started REAL Forge Python HTTP process and called node test policy helpers with authenticated local Studio token: source search, same hashed world edit, **original 114,192-byte/1,748 triangle GLB** SHA b019e6617175a3d4ec3d30a9f72bc372fc6578c5beaf97565c80efc00b6a1b1c, replay same SHA, live GET of GLB hash verified; tokenless GET, wrong owner tenant and missing execute scope denied. Machine-safe receipt evidence/forge-creator/2026-10-31-native-creature-local-bridge.json. No GPU, hosted service, external model API or paid job. Actual GLB owner art/Blender rig for THIS sample remains unverified.

**Tests:** npm run verify 68/68 passed with TS typecheck, existing plugin check and new test/forge-creature.test.ts, test/forge-creator-plugin.test.ts. A strict TypeScript exactOptionalPropertyTypes morph disagreement was found and repaired in existing ForgeCreatureInput rather than weakening global project settings.

**ChatGPT Forge Creator plugin source and account:** private v0.1.0 saved at https://chatgpt.com/plugins/plugins_6ae67e8cb4c481919d905592722c2a7d and contents fetched back. Exact source fingerprints match integrations/forge-creator-plugin/{plugin.json,skills/mgr-forge-create/SKILL.md,README.md}; immutable receipt integrations/forge-creator-plugin/RELEASE-RECEIPT.json. This release is intentionally SKILLS ONLY: it guides ChatGPT to use existing authorized Forge connector or desktop workflow, but DOES NOT supply a remote MCP endpoint, OAuth secret, hosted GLB downloads, or a new backend. Saving a private plugin won't magically make owner's local Windows Forge reachable from iOS. This must be a follow-on deploy/verification step; do not publish fake localhost/mcp URL. Existing REA X-Ray remains optional for source audits, not a mandatory creation hop.

**Studio front end:** sibling Forge viewer/template.html and viewer/runtime.js now contain Creator prompt/seed/variants, local job/status and hash-checked in-memory GLB download under existing Studio; actual Chrome click-through/render acceptance OPEN. Creation OS remains optional cross-factory coordinator; Tevin/ChatGPT/Forge Studio must share this same job lane. Next: protected hosted MGR API/MCP with OAuth/tenant scope + private artifact storage and signed/short-lived URLs; real ChatGPT plugin remote connection, real mobile user journey and preview/Blender/Godot acceptance.


## Forge master-program continuity reference — 2026-10-31

The canonical Forge handoff is MGR-3D-FORGE/docs/HANDOFF.md, and its complete master plan is https://github.com/tdmboyd-dev/MGR-3D-FORGE/blob/main/docs/MASTER-FORGE-PROGRAM-2026-10-31.md . The 184-target, 177-distinct-name REA source research register is https://github.com/tdmboyd-dev/MGR-3D-FORGE/blob/main/research/external-provenance/BEAST-3D-RESEARCH-UNIVERSE-2026-10-31.json . Those are planned candidates, not completed scans or licensed/installed models.

This repo owns existing source client src/forge-catalog-client.ts, MCP tools src/forge-mcp-tools.ts, tenant/audience, tools:read/tools:execute and approved artifact transport. A Forge Creator plugin belongs under planned integrations/forge-creator-plugin/ and must call the SAME Forge job/asset/receipt service used by Tevin and direct Studio users, not duplicate Forge geometry/vault/approval logic. REA X-Ray is optional and already local-tested, not a required creation hop. Hosted ChatGPT/iOS 3D creation and full Tevin consumer journey remain UNVERIFIED.



## Current REA X-Ray checkpoint — 2026-10-31 (supersedes older test totals below)

**Canonical current handoff is this file.** The upstream REA repo is NOT a second MGR system: it is an optional evidence inspector used by the existing Beast Pack X-Ray workflow and Forge's own Vault + creation engine. Ordinary Tevin→MGR API/MCP→Forge world jobs continue directly without REA or Creation OS as mandatory hops.

- **Private plugin saved:** [MGR REA X-Ray](https://chatgpt.com/plugins/plugins_6ae674d617d881919da938edf6e018d4), version 0.1.0, account-private release. Source `integrations/rea-xray-plugin/` includes `plugin.json`, portable `mcp.json`, a focused skill, a one-tool static artifact MCP wrapper and `rea-dependency-pin.json`. The wrapper does **not** expose REA's unrestricted active MCP tools, shell commands, browser controls, or a cloud-wide file reader. Approved workspace is `~/.mgr-tools/rea/workspace`.
- **Real runtime:** official REA 6.8.0 npm package with matching published integrity and official portable Node 24.22.1 installed separately on owner Windows; local REA `--version --json` passed, global Node not replaced. Exact plugin archive downloaded back from ChatGPT and **real local stdio MCP initialized, listed one inspection tool, denied a system-file path outside scope, and inspected the pinned KayKit ZIP through REA**. REA full evidence retained locally, not uploaded in Git. Saving to ChatGPT does not make local MCP run on iOS or cloud without a supported local execution connection.
- **Forge consumption:** sibling `MGR-3D-FORGE/forge/xray_kit.py` + `rea-kit-audit` CLI validates the REA complete ZIP evidence against existing pinned Forge Vault receipt. Real **302/302 ZIP child SHA/size matches**, quarantined and rights uncleared. Cross-repo evidence `MGR-3D-FORGE/evidence/asset-atlas/2026-10-31-rea-official-kaykit-proof.json`. No duplicate router, vault, blob mirror or generalized X-Ray job database.
- **Verification:** `npm run verify` **62 tests passed** with TypeScript, artifact and plugin checks; local plugin startup and outsider-path refusal included. Forge full suite **589 run / 3 skips**, no failures. No remote hosted Tevin→plugin→Forge trace, no hosted local-files bridge, no general owner UI and no legal rights grant claimed.
- **Open:** implement a safe Forge Studio browse/preview/use flow, authorized plugin connection via supported desktop/workstation, real remote Tevin caller with tenant/actor guard and stable receipts, original creation improvements and independent Blender/Godot acceptances. Never expose direct REA arbitrary filesystem or executable analysis to a public API; remote capability must be separately reviewed.


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
