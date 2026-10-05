# Resume MGR-API-MCP

## Current resume checkpoint — October 5, 2026

MGR-API-MCP is now the shared external edge, switchboard, and Brain transport layer. MGR Legacy is the authoritative business data/workflow/action system. Creation OS remains the creation engine. See `architecture/LEGACY-INTEGRATION.md`.

Verification:
- Node 22 install: passed
- `npm run verify`: passed after Legacy client + privacy-firewall fixes
- earlier verification commit: `efbe9660e1d7fe998901a96d213e49faed38b96c`
- authenticated Legacy/Creation integration verification: `0cf7d95f05ea78bd76943b823d1b0259ef957ac8`
- cross-service reconciliation verification: `a0334b3e8f5acefb69999754a70da4baa84439b5`
- restart/timeout/duplicate-delivery hardening verification: `44f9b6f167a166c1e1714ca2823c868ee21726f8` (GitHub Actions run 37290188660 passed)\n- hosted-surface/unit verification: `7060bcdd53dae64f5bafc79aec23eac7e7890aad` (CI passed)\n- containerized cross-service boundary proof: GitHub Actions run `37291231033` passed

New implementation:
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
- verify a hosted ChatGPT MCP session against a deployed authenticated endpoint

New hardening now verified:
- production HTTP entrypoint, JWKS JWT verifier, protected-resource metadata, health route, Dockerfile, environment contract, and remote-boundary verifier are built\n- `LegacyEdgeClient` has bounded request timeouts
- timeout after dispatch reconciles against Legacy Truth receipts instead of blindly retrying the mutation
- duplicate delivery with the same idempotency key produces one simulated business mutation and a replay result
- a fresh edge coordinator/client instance can replay safely after an API-MCP process restart because authoritative idempotency remains behind the Legacy boundary
- `InMemoryTaskEngine` explicitly declares `edge_session_only` authority and tenant-namespaces local idempotency keys

Do not claim the remote MCP surface is production-ready until those gates pass.

---

## Current resume checkpoint — September 29, 2026

Read [WORK-STATE.md](WORK-STATE.md), AGENTS.md, BUILD-QUEUE.md and the latest dated section of docs/full-build/SCORECARD.md.
Inspected base: d5fdea390702b7ca7e5a3602ad2e4d149960aea8.

The repository now contains the first executable shared-edge foundation. The README and September 29 scorecard supersede the September 28 research-only implementation status below. Source includes an in-memory task engine, model-independent Brain controller, DecisionEngine, approval/security boundaries, Creation OS client, MCP stdio server and HTTP/OAuth-related modules.

This recovery inspected engine.ts, brain-controller.ts and mcp-server.ts in the preceding read pass and located the HTTP/OAuth modules; it did not execute or fully audit those modules. Existing recorded CI success retains its original scope. Do not claim durable persistence, live provider integration, a hosted ChatGPT MCP session or production deployment from source presence.

The next window must reconcile the build queue with implemented primitives, recover the older window's exact CI/test receipts and private local originals, and preserve the source manifests' unread/unavailable boundaries. No original-source checkpoint was recovered by this continuity update.

## Historical September 28 handoff — preserved evidence

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
