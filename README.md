# MGR-API-MCP

For the current operating contract, read [MGR Beast Pack](MGR-Beast-Pack/MGR-BEAST-PACK.md). The supplied pack is preserved unchanged; existing work queues and evidence remain the project source of truth.

The research and build home for an owned, portable assistant informed by JARVIS and Jev. The intended system brings research, coding, memory, voice, tools and optional content/phone/device workflows into one task engine, with ChatGPT-facing MCP and replaceable model providers.

**Current state: executable authenticated shared edge with deployment-ready hosted MCP surface.** The repo now includes typed task/decision/security contracts, governed stdio + HTTP MCP, JWT/JWKS auth, tenant/scope binding, Legacy-backed side-effect dispatch with authoritative receipts and reconciliation, Creation OS routing, container deployment, Render blueprint, Auth0/OIDC preflight, direct remote MCP verification, OpenAI Responses remote-MCP verification, and green containerized restart/timeout/duplicate-delivery proof. A real public host, real Auth0/OAuth credentials, deployed Legacy endpoint, and final hosted OpenAI/ChatGPT MCP session remain external proof rather than missing repository code.

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
