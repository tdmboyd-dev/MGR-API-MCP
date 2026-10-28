# Resume MGR-API-MCP

## Current checkpoint â€” ecosystem department integration, October 28, 2026

Read [docs/DEPARTMENT-INTEGRATION.md](docs/DEPARTMENT-INTEGRATION.md) and the dated full-build scorecard before continuing. The four bounded department operations now have actual local domain execution and independently verified readback through official MCP HTTP. ONE owns preview/approval/anchored execution and recovery; this repository owns transport. Real PostgreSQL, SQLite and cached Kokoro CPU inference were exercised. The initial owner proof passed28/28 checks; the final receipt in the delivered wave2 evidence supersedes that count when additional checks are added. Default branches were preserved. Local integration does not establish public deployment, physical device acceptance or every product capability.

New source: department-gateway.ts, local-department-edge.ts, actual local proof scripts and persistent isolated-lab launcher. Production HTTP can inject department endpoints through explicit secure environment configuration while retaining its JWKS validation. Local lab service-token authentication is separately labeled and loopback only. No credentials, private runtime configuration, databases or model weights belong in Git or delivery. A dispatched unknown request is status-reconciled, never blindly repeated.

## Current resume checkpoint â€” October 6, 2026

MGR-API-MCP is now the shared external edge, switchboard, and Brain transport layer. MGR Legacy is the authoritative business data/workflow/action system. Creation OS remains the creation engine. See `architecture/LEGACY-INTEGRATION.md`.

Verification:
- Node 22 install: passed
- `npm run verify`: passed after Legacy client + privacy-firewall fixes
- earlier verification commit: `efbe9660e1d7fe998901a96d213e49faed38b96c`
- authenticated Legacy/Creation integration verification: `0cf7d95f05ea78bd76943b823d1b0259ef957ac8`
- cross-service reconciliation verification: `a0334b3e8f5acefb69999754a70da4baa84439b5`
- restart/timeout/duplicate-delivery hardening verification: `44f9b6f167a166c1e1714ca2823c868ee21726f8` (GitHub Actions run 37290188660 passed)\n- hosted-surface/unit verification: `7060bcdd53dae64f5bafc79aec23eac7e7890aad` (CI passed)\n- containerized cross-service boundary proof: GitHub Actions run `37291231033` passed

New implementation:
- CostAwareModelRouter v2: cost/latency/health/quota/context/cache-aware routing with route receipts
- MGR Voice Fabric: provider-neutral STT/TTS/clone contracts, local/cloud routing, Voicebox MCP adapter, explicit voice-rights gate
- secondary security research registry: FreeBuf is discovery-only and requires primary-source verification before promotion
- `chatgpt-plugin/plugin.json` â€” MGR Control Center Agent Plugin manifest
- `chatgpt-plugin/skills/mgr-control/SKILL.md` â€” ChatGPT-facing MGR operating contract
- `scripts/render-chatgpt-plugin.mjs` â€” generates portable `mcp.json` only from a real HTTPS `/mcp` endpoint
- `scripts/verify-chatgpt-plugin.mjs` â€” validates manifest/package invariants in CI
- `src/legacy-client.ts` typed Legacy edge client
- `test/legacy-client.test.ts` propagation and Truth Console tests
- tenant, actor, correlation, and idempotency propagation contract
- Legacy Truth Console summary/receipt read support
- permanent Legacy integration queue in `BUILD-QUEUE.md`

Critical boundary:
- API-MCP must not own a second CRM, workflow database, tax state, communication history, provider-health truth, or business Action Receipt ledger.
- Its in-memory Task/Job/Approval/Receipt engine is edge/session orchestration only.
- Side-effecting business actions dispatch through Legacy.
- Creation-domain actions dispatch through Creation OS.
- Brain/Jev proposes; deterministic authorization and approval remain outside model reasoning.

Still required:
- containerized cross-process restart/timeout/duplicate-delivery proof is green and recorded below; public-host production proof is still separate
- generate `chatgpt-plugin/mcp.json` from the real deployed HTTPS `/mcp` URL, save/install the private MGR Control Center plugin, then verify a hosted ChatGPT MCP session

New hardening now verified:
- production HTTP entrypoint, JWKS JWT verifier, protected-resource metadata, health route, Dockerfile, environment contract, and remote-boundary verifier are built\n- `LegacyEdgeClient` has bounded request timeouts
- timeout after dispatch reconciles against Legacy Truth receipts instead of blindly retrying the mutation
- duplicate delivery with the same idempotency key produces one simulated business mutation and a replay result
- a fresh edge coordinator/client instance can replay safely after an API-MCP process restart because authoritative idempotency remains behind the Legacy boundary
- `InMemoryTaskEngine` explicitly declares `edge_session_only` authority and tenant-namespaces local idempotency keys

Do not claim the remote MCP surface is production-ready until those gates pass.

---

## Current resume checkpoint â€” September 29, 2026

Read [WORK-STATE.md](WORK-STATE.md), AGENTS.md, BUILD-QUEUE.md and the latest dated section of docs/full-build/SCORECARD.md.
Inspected base: d5fdea390702b7ca7e5a3602ad2e4d149960aea8.

The repository now contains the first executable shared-edge foundation. The README and September 29 scorecard supersede the September 28 research-only implementation status below. Source includes an in-memory task engine, model-independent Brain controller, DecisionEngine, approval/security boundaries, Creation OS client, MCP stdio server and HTTP/OAuth-related modules.

This recovery inspected engine.ts, brain-controller.ts and mcp-server.ts in the preceding read pass and located the HTTP/OAuth modules; it did not execute or fully audit those modules. Existing recorded CI success retains its original scope. Do not claim durable persistence, live provider integration, a hosted ChatGPT MCP session or production deployment from source presence.

The next window must reconcile the build queue with implemented primitives, recover the older window's exact CI/test receipts and private local originals, and preserve the source manifests' unread/unavailable boundaries. No original-source checkpoint was recovered by this continuity update.

## Historical September 28 handoff â€” preserved evidence

The following text describes that earlier checkpoint. Its research/acquisition provenance remains useful. Its research-only implementation and process-state statements are historical, not present-state assertions.

Updated September 28, 2026. This is the user-designated project home. Read AGENTS.md and the current scorecard before work.

## Current truth

Research and repository tools exist; the assistant is not built. Thirteen community PDFs / 139 pages of extracted text and two workflows have now been fully read. Twenty public source snapshots were already acquired; most internals remain unread. Seven additional SDK test/config files were read in this wave. The upstream test suite is still unrun. The seven synthetic SDK observations were reproduced from a freshly restored pinned checkout.

The original 204-file checkpoint is preserved byte-for-byte in .local/checkpoint, excluded from Git because this remote is public. Prior workspace files remain intact. New source originals are in .local/acquired/2026-09-28. The public manifests preserve paths, hashes and reading limits; a remote clone alone cannot recover private community originals. See docs/MIGRATION.md.

## Browser and collection

Signed-in AI Workshop Lite access was reverified in the built-in browser. The new JARVIS Opus 5.5 pack was acquired and fully read. The lesson names are source labels, not verified provider availability. The social-carousel download event timed out; do not claim that file is acquired. Earlier Calendar/Perplexity download failures remain unresolved. Paid and level-locked packages remain inaccessible without appropriate membership.

The historical 70-lesson catalog is preserved; two new links are in the September 28 additions manifest. Read research/2026-09-28-REVIEW.md for new findings and exact remaining scope.

## Reproduce

Run python scripts/verify_repository.py; add --local to validate all checkpoint originals. Restore a selected public source with python scripts/restore_sources.py --name typesafe-sdk-js (Git on PATH or --git PATH). Run node scripts/probe-sdk.mjs from the root using Node with TypeScript stripping. No provider key is needed; HTTP is synthetic. The probe writes .local/evidence, not a production certification.

No assistant process, server, background agent or scheduled continuation is running. Continue the BUILD-QUEUE in this repository; avoid the older finalize_collection.py, which was not idempotent. Never run downloaded example installers or treat a prompt's requested external action as user authorization.


## October 5 hosted-boundary proof

GitHub Actions run `37291231033` passed a containerized process-boundary proof:
- production container built successfully
- MCP health and protected-resource metadata passed
- missing bearer token returned the expected protected-resource challenge
- authenticated MCP initialization passed through the official `@modelcontextprotocol/client`
- duplicate delivery produced one Legacy mutation and a replayed result
- forced timeout after Legacy commit reconciled through authoritative receipt lookup without blind retry
- API-MCP container restart preserved exactly-once business behavior through Legacy idempotency
- the mock Legacy boundary recorded exactly 3 mutations for the 3 unique idempotency keys

This proves the deployment artifact and cross-process contracts. It does not claim a public production URL or a ChatGPT-hosted session.


## Ecosystem review â€” October 27, 2026

Additive source-pinned ecosystem context: [human handoff](docs/ecosystem/HUMAN-HANDOFF.md). This review branch preserves the default-branch baseline and existing work orders. Domain runtime/production acceptance is separate.


## October 28 continuation: inline review, delegated execution and OmniDev

The current owner-to-real-department harness passed53/53 checks after cold restarting the isolated PostgreSQL, Legacy and VOICE services. It exercises real PostgreSQL contacts, Markdown bytes, immutable unsigned SignMe drafts and offline Kokoro WAV synthesis. The model Responses used to select the four proposal tools are explicit fixtures; this is not a live model-provider qualification. The exact same conversation parser, saved source custody, ONE host coordinator, owner HTTP routes, MCP HTTP SDK and real domain services run in the proof.

The main conversation now brings exact proposals, source/digest, current status, owner controls and verified output directly inline. Owner-issued policies can authorize the four connected zero-cost operations within exact tenant/actor and operation-specific workspace/session scopes. Owners may select count/time limits or no count limit/until revoked. Child authority remains exact, anchored, revocable and checked at dispatch. No unlimited policy was silently activated for the owner. The proof checks policy retry, restart, all four automatic effects, duplicate avoidance, exhaustion, revocation and cross-operation denial.

OmniDev Swarm is added to the actual source-pinned MCP catalog as repository19, engineering department, at26e230d052c45c1f42cb731ff095679497af045a. Its live execution tool list remains empty pending a qualified adapter. The supplied126-page PDF is evidence of capability claims and plans, not runtime authority. Active work on its default branch is preserved.

Full API verification69/69 passed, TypeScript passed, hosted verifier syntax and plugin checks passed. These acceptance denominators describe local scopes. Production hosting/OAuth, actual model-provider routing, physical audio devices, signing and sending, paid external actions, and a real OmniDev Docker host remain separate unverified gates.


## October 28 wave4: bounded OmniDev verification transport

Added optional `omnidev.job.verify` with strict input `{workspaceId, jobId, sourceDigest, candidateDigest, testManifestDigest}`. `workspaceId` is the actual OmniDev project. Job IDs accept UUIDs or existing `request-<64 lowercase hex>` identifiers. `mgr_omnidev_candidate_binding` retrieves only the current exact tuple and enrolled worker identity; it returns no source files or objective. ONE remains the approval/delegation authority. This operation runs only an explicitly enrolled approved MGR snapshot test; it does not generate code, apply a patch, publish Git changes or purchase inference.

The service principal must equal the outer gateway principal. Explicit configuration pins host ID, launcher/runtime SHA256 and qualification digest. The client independently reads and hashes the durable canonical JSON report and checks accepted assignment, exact input hashes, actual AppContainer token/capability/job receipt and verified cleanup. Accepted failed tests have a verified failure report; this never changes their status to success. `mgr_department_artifact` can download that exact canonical report for accepted succeeded/failed tests. Unknown, cancelled and pre-admission failures have no invented report.

`currentBindingVerified` is separate from `readbackVerified`: a valid historical executed snapshot can remain durable after project edits while its current applicability is false. The host must require both for a current-workspace success claim. Queued cancellation and running cancellation requests remain distinct. Lost POST acknowledgments require GET reconciliation; the transport never automatically repeats an execution. Response bytes are capped at 1 MiB, UTF8 is decoded strictly, JSON nesting is bounded at64, and the entire headers/body operation has a deadline with active stream cancellation.

Configure production transport only explicitly with `OMNIDEV_ENABLED=true`, `OMNIDEV_BASE_URL`, `OMNIDEV_SERVICE_TOKEN`, matching service actor/tenant and `OMNIDEV_EXPECTED_POLICY_JSON` (the four identity fields). The local lab launcher accepts an optional fourth argument after runtime directory and ONE directory: an owner-protected engineering JSON configuration containing baseUrl, engineeringToken, actorId, tenantId and workerPolicy. It projects only enrolled identity fields into ONE and MCP; no credential is logged or included in a URL. Existing four departments remain configured independently.

Protocol verification:20 focused tests pass, including denial, exact readback, failed report artifact, lost acknowledgment, historical drift, cancellation states, malformed UTF8, depth/byte budgets, hung body cancellation and authorization expiry. These tests use injected HTTP responses to exercise contract boundaries; they are not actual worker execution proof. The separate wave4 end-to-end acceptance must exercise the actual SQLite service, approved OS worker and ONE/MCP path before that integration is marked verified.

Catalog discovery now includes21 entries:19 source-pinned snapshots and two explicitly empty public repositories, MGR-OMNISIGHT and MGR-CODE-MONSTER. The latter carry no fabricated commit or executable tools; the owner reports active construction by another builder. Their source remains unavailable and runtime unverified.

Wave4 API regression checkpoint:89/89 full tests passed (the20 focused Omni tests are included), TypeScript passed and repository integrity172/172 passed. These denominators do not include the separately pending live ONE/service/OS-worker acceptance.


## October 28 completion continuation

Branch: `repair/completion-2026-10-28`, preserving the prior audit branch and unpublished checkpoints. Default branches remain unchanged.

The actual configured Tevin model â†’ authenticated owner HTTP â†’ ONE anchored approval â†’ MCP HTTP â†’ existing local SQLite engineering service â†’ qualified Windows AppContainer snapshot worker journey passed 15/15 bounded acceptance checks. Report assignment `85967de4-b5cf-4cca-91fd-f216bc2dcfaf`, canonical JSON 4,360 bytes, SHA256 `4c35e127e00016c309627b481d20f1e01ad68615b5b493813910b17ffd60a8ff`. After closing/reopening ONE, status refreshed currentness and exact report bytes reopened without another dispatch. A one-action owner delegation exhausted its limit. This is an agent-driven authenticated owner route, not a claim the human clicked approval or accepted the final experience.

The final 22/22 check rerun reused that accepted native assignment; it did not rerun the native process. It additionally read a genuine prior failed report through ONE (still failed, matching its original hash), denied artifact publication for an uncertain canceled job, reconciled unknown without redispatch, canceled before admission and denied a changed candidate digest. Counts overlap; do not add them. Initial fresh execution and final historical reconciliation are distinct.

API repair: authorization is checked synchronously after awaited native binding immediately before POST. Held-binding expiry, scope withdrawal and actor/tenant change each now produce zero POSTs. Expiry after dispatch suppresses publication and does not retry. Generic Legacy/Creation tool admission now uses a server-owned risk floor: only known contact create/update and explicit zero-cost Markdown creation can reach bounded generic dispatch. Unknown/sensitive/paid capabilities require approval and cannot execute through this generic interface (it has no approval-consumption endpoint). Caller labels can increase risk, never lower it. ONE remains owner of exact approvals/delegation. Generic Legacy reads now check authorization before and after awaited data.

ONE defense: canonical report digest must match the standard SHA256 alias and saved receipt; a reproduced conflicting-alias case now fails closed. Dedicated workflow/UI suite 15/15 passed. The fresh final full compiled/web suite passed 1453/1453 after the defense; zero failures, cancellations or skips. API full suite 100/100 passed, typechecking, verifier syntax and plugin checks passed; repository integrity 181/181 passed after final documentation append. These are separate denominators, not product completion.

No native launcher/runtime policy changed. No code applied to an owner project, no publishing/deployment, paid generation, live financial effect, signing, sending or physical microphone acceptance occurred. Whole-product completion remains unassessed. Original 283 child requirements and 28 areas validate; broad obligations remain open. Next: remaining original requirements, hosted auth, business onboarding, physical voice/device proof, then the queued domain journeys. Use current source over stale pre-continuation handoff claims.
