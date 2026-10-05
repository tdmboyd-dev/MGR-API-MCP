# Current work and resume record — MGR-API-MCP

Updated: 2026-10-05. Responsible session: hosted-mcp-hardening-2026-10-05.
Repository: `tdmboyd-dev/MGR-API-MCP`
Working branch: `main`
Last inspected code/base commit: current `main`; verify against latest GitHub Actions receipts in HANDOFF.md before making production claims.
Scope of inspection: entry instructions, tree and the specific records/source stated below; not a complete repository audit.

## Purpose and boundaries

Unified assistant/task/API/MCP home. Brain is a model-independent controller subsystem; Creation OS capabilities are consumed through contracts.

## Read before continuing

Read AGENTS.md. Follow stricter local read orders.
- [HANDOFF.md](HANDOFF.md)
- [BUILD-QUEUE.md](BUILD-QUEUE.md)
- [AUDIT-LEDGER.md](AUDIT-LEDGER.md)
- [docs/full-build/SCORECARD.md](docs/full-build/SCORECARD.md)
- [architecture/SERVICE-TOPOLOGY.md](architecture/SERVICE-TOPOLOGY.md)
- [architecture/BRAIN-BOUNDARY.md](architecture/BRAIN-BOUNDARY.md)
- [research/README.md](research/README.md)


These are existing authority/queue/evidence pointers, not assertions that every listed file is current or fully audited. Resolve conflicting dates against code and executed evidence.

## Current checkpoint

The old research-only HANDOFF text is superseded for implementation status. Current source includes governed MCP stdio/HTTP surfaces, JWT/JWKS authorization, tenant/scope binding, Legacy command dispatch and reconciliation, Creation OS routing, deployment container/Render blueprint, OAuth provider preflight, direct remote MCP verifier, and OpenAI remote-MCP verifier. Containerized cross-process restart/timeout/duplicate-delivery proof is green. The only remaining hosted-MCP gate is external: provision the real public endpoint and credentials, then execute the final hosted proof workflow.

## Next batch and missing evidence

Use BUILD-QUEUE.md and HANDOFF.md as the implementation truth. Repository-owned hosted MCP prerequisites are built. Next work is external proof: provision the public deployment/Auth0/Legacy credentials and execute `.github/workflows/hosted-proof.yml`; record only non-secret receipts in `evidence/`.

The original windows' complete transfer packets are pending. Their private local files, uncommitted work and running-process state cannot be recovered from a shared-chat URL alone. Mark missing items explicitly and reconcile returned packets with fresh HEAD.

## Work ownership

Current claim: UNCLAIMED for product implementation.
Current research claim: RELEASED — 2026-09-29 HTTP authorization research; main at 42ea88906ba92a91deae361b3475bbdb4495b264 before this documentation batch; scope research/MCP-HTTP-AUTH-BOUNDARY-2026-09-29.md, BUILD-QUEUE.md, AUDIT-LEDGER.md and this record. Claimed and released in this bounded batch; no active process.
This documentation recovery claims no ongoing runtime or exclusive ownership over another window.
Before edits, record task, owner/session, branch, exact path scope, fresh base SHA, claimed UTC time and review/expiry UTC time; check other claims. A recorded claim is advisory, not a technical lock. A stale claim requires reconciliation, not an overwrite.

## Verification and stopping point

This batch concerns continuity documentation only. No new product runtime, provider, device, database or deployment success is claimed. Existing test reports retain their original scope and dates. Read the batch's commit/diff and any local integrity receipt before calling the documentation installed.
At resume, compare current HEAD with the base above, inspect intervening changes, and update this file plus the existing queue/audit/scorecard after the next meaningful batch. Never force an update over another writer.
No scheduled continuation was created by this recovery.

## Backwards–Forwards HTTP research — 2026-09-29
New owner dossier: research/MCP-HTTP-AUTH-BOUNDARY-2026-09-29.md. Actual HTTP handler currently creates an MCP server without invoking the separate `authorizeMcpRequest` helper. Primary MCP spec and repo source define the bridging requirements and denial cases. Existing handler test proves only exported functions. Queue and ledger updated. No HTTP service, provider or deployment was run; public entry remains a research-to-build item.
