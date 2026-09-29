# Persistent evidence scorecard

## September 28 — repository home and continued research

Before: empty public remote; research only in the prior workspace. After: curated project home, local original-source checkpoint, recovery tooling and additional source review. Historical scope and evidence are retained under docs/history and evidence/history.

| Acceptance gate for this wave | State | Evidence |
|---|---|---|
| Inspect designated remote and preserve existing history | PASS | Public empty repository confirmed before clone; no prior commits replaced |
| Preserve every original checkpoint file | PASS | 204 entries in research/manifests/checkpoint-inventory.json; local hash verification |
| Carry working method and actual instruction precedence | PASS | AGENTS.md, BEAST-UNIVERSAL.md, skills/beast-universal |
| Publish findings/inventories without private source originals | PASS | .gitignore, source policy, curated tree verification |
| Make source restoration reproducible | PASS | Fresh TypeSafe checkout restored at pinned commit |
| Reproduce existing SDK observations from new home | PASS | evidence/typesafe-sdk-probes-2026-09-28.json: 7/7 synthetic observations |
| Resume authenticated community collection | PASS | New 24-page pack; community-additions-2026-09-28 manifest |
| Read new acquired pack completely and record corrections | PASS | research/2026-09-28-REVIEW.md; 24 pages extracted and read |
| Expand source/test and standards review with exact scope | PASS | Seven SDK test/config files; full MCP security and SQLite WAL extracted texts |
| Correct stale access and implementation-home records | PASS | SOURCE-UNIVERSE.md, BUILD-QUEUE.md, HANDOFF.md |
| Validate repository integrity and failure detection | PASS | 309 checks passed in recorded run; five verifier tests passed |
| Commit, push and verify the published remote tree | PASS | evidence/remote-publication.json; fresh remote clone passed |

Coverage is 12/12 passed acceptance gates (100%) for this migration/research wave after initial publication and fresh-clone verification. This denominator is not assistant-build completeness or total research completeness.

## Product states

| Scope | Current state | Remaining |
|---|---|---|
| Community PDFs | 13 acquired; 139 extracted-text pages fully read | Visual inspection, linked videos, other attachments and restricted packages |
| Community workflows | Two fully read, not executed | Remaining workflow collection and provider/runtime tests |
| TypeSafe docs | 111 captured pages; six fully read in original checkpoint | 105 pages unread; unchanged index URL set does not prove unchanged content |
| SDK | 12 source modules previously read; seven more test/config files now read; synthetic probes reproduced | Remaining tests/scripts/docs; upstream suite and live provider not run |
| Public repositories | 20 pinned snapshots | Most internals, dependencies and assets unreviewed |
| Unified assistant | Research and design constraints only | Contracts, application, persistence, interface and integration unbuilt |
| ChatGPT/MCP and providers | Official source research | No live host/account/provider verification |

Overall product completion: **Unassessed**. No invented percentage. Next batch follows BUILD-QUEUE.md; optional features must use the shared engine and evidence contracts.

Dated transition: initial 10/12; local verification 11/12; remote clone verification 12/12. The portable full-build and time-voice skill copies are also preserved. Full-product work remains open.


## September 29 — executable shared-edge foundation

This wave changes the repo from research-only to first executable primitives. It does NOT make the assistant production-ready.

| Acceptance gate | State | Evidence |
|---|---|---|
| Typed Task/Job/Decision/Approval/Receipt contracts exist | PASS | src/contracts.ts |
| Task/job transitions reject invalid terminal resurrection | PASS | src/state.ts + tests |
| Idempotent job creation rejects conflicting key reuse | PASS | src/engine.ts + test/engine.test.ts |
| Approval binds to exact action digest | PASS | src/security.ts + tests |
| DecisionEngine cannot return out-of-allowlist choice | PASS | src/decision.ts + tests |
| Brain controller is model-independent | PASS | src/brain-controller.ts |
| Token audience/scopes enforced before tool access | PASS | src/authz.ts + tests |
| Independent Action Sentinel evaluates side effects | PASS | src/action-sentinel.ts + tests |
| Privacy Firewall redacts/blocks sensitive text by policy | PASS | src/privacy-firewall.ts + tests |
| Creation OS client blocks underspecified capability requests | PASS | src/creation-client.ts + tests |
| Governed MCP v2 stdio server boots with read-only validation tools | PASS | src/mcp-server.ts; consolidated CI success |
| Hosted/HTTP OAuth MCP, durable DB, live providers and production deployment | OPEN | build queue |

The executable shared-edge foundation passed the consolidated GitHub CI batch after CI was changed to explicit batch triggering to preserve Actions budget.
