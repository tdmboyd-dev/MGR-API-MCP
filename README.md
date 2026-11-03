# MGR-API-MCP

## Current joined Forge and Tevin shared edge — November 1, 2026

The same shared edge retains department/repository knowledge connections and existing native Forge creation/status/private-artifact tools. Exact workstation actor and tenant enrollment, scope/expiry/current-host fences and final response checks are required. Full API247/247 and actual SDK/HTTP/Forge/Blender resource proofs pass in their stated scopes. [Current handoff](HANDOFF.md) and [Forge integration contract](docs/FORGE-CONNECTION-AND-RECOVERY.md) distinguish this from permanent Tevin job/approval integration and hosted/production acceptance. Earlier dated checkpoints retain historical scope.


For the current operating contract, read [MGR Beast Pack](MGR-Beast-Pack/MGR-BEAST-PACK.md). The supplied pack is preserved unchanged; existing work queues and evidence remain the project source of truth.

The research and build home for an owned, portable assistant informed by JARVIS and Jev. The intended system brings research, coding, memory, voice, tools and optional content/phone/device workflows into one task engine, with ChatGPT-facing MCP and replaceable model providers.

**Current state: executable authenticated shared edge; hosted source exists and production acceptance remains open.** The repo now includes typed task/decision/security contracts, governed stdio + HTTP MCP, JWT/JWKS auth, tenant/scope binding, Legacy-backed side-effect dispatch with authoritative receipts and reconciliation, Creation OS routing, container deployment, Render blueprint, Auth0/OIDC preflight, direct remote MCP verification, OpenAI Responses remote-MCP verification, and green containerized restart/timeout/duplicate-delivery proof. A real public host, real Auth0/OAuth credentials, deployed Legacy endpoint, and final hosted OpenAI/ChatGPT MCP session remain external proof rather than missing repository code.

**Current Forge integration:** 15 optional shared tools cover source discovery, native world/creature/biome, timed-phoneme Human animation, composition, original request verification, status, bounded private artifact return and saved-creation listing/reopen. Enroll the four actor/tenant/URL/token settings through the trusted host's configuration flow; `.env.example` documents names and is not automatically loaded. Partial enrollment is refused. Raw-audio behavior still needs its typed shared adapter. [Setup and recovery](docs/FORGE-CONNECTION-AND-RECOVERY.md).

Read the [Owner Handbook](docs/API-MCP-OWNER-HANDBOOK.md) for the completed shared-edge destination and [How to Use API/MCP](docs/API-MCP-HOW-TO.md) for current commands, Forge tool arguments and safe recovery. The existing handoff and scorecard retain exact source-specific qualification and unfinished work.

## Start here

- [Working agreement](AGENTS.md)
- [Resume checkpoint](HANDOFF.md), [build queue](BUILD-QUEUE.md), [scorecard](docs/full-build/SCORECARD.md)
- [Research index](research/README.md), [community review](research/COMMUNITY-MERGE-REVIEW.md), [source universe](research/SOURCE-UNIVERSE.md)
- [Source manifests](research/manifests/) and [architecture decisions](architecture/DECISIONS.md)
- [Migration and recovery](docs/MIGRATION.md), [audit ledger](AUDIT-LEDGER.md)

## What is collected

The September 23 checkpoint contains 12 community PDFs (115 pages of extracted text fully read), two fully read n8n workflows, 20 pinned repository snapshots, 111 TypeSafe documentation pages and two OpenAI guides. Seventy classroom lessons are cataloged; that is discovery, not 70 completed lessons. Most repository internals and documentation still need reading. See current manifests and review notes for exact coverage.

This public repository contains authored research, working rules, manifests, source file inventories and verification tools. All original checkpoint files are also preserved inside the local checkout under ignored `.local/checkpoint/`. They are **not uploaded**: community redistribution rights remain unresolved, and the historical conversation stays local. Public source repositories can be restored at pinned commits using `python scripts/restore_sources.py --name typesafe-sdk-js` (requires Git). Downloading does not install or run the source.

## Verify this home

Requires Python 3.10+ and Git; no Python packages or API credentials required.

```sh
python scripts/verify_repository.py
python scripts/verify_repository.py --local
python scripts/restore_sources.py --name typesafe-sdk-js
node scripts/probe-sdk.mjs
```

The local flag checks the preserved checkpoint bytes. The Node probe requires Node 22.13+ with TypeScript stripping and uses synthetic transport only. Its seven observations include SDK weaknesses; seven passing observations are not a production certification.

No project-wide redistribution license has been selected. Third-party sources retain their own terms. See [source policy](docs/SOURCE-POLICY.md).
