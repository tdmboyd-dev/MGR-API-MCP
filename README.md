# MGR-API-MCP

For the current operating contract, read [MGR Beast Pack](MGR-Beast-Pack/MGR-BEAST-PACK.md). The supplied pack is preserved unchanged; existing work queues and evidence remain the project source of truth.

The research and build home for an owned, portable assistant informed by JARVIS and Jev. The intended system brings research, coding, memory, voice, tools and optional content/phone/device workflows into one task engine, with ChatGPT-facing MCP and replaceable model providers.

**Current state: research plus the first executable shared-edge foundation.** Typed Task/Job/Decision/Approval/Receipt/Budget/Schedule/Reconciliation contracts, lifecycle guards, idempotency, exact-action approval digests, a model-independent Brain controller, audience/scope authorization, Action Sentinel, Privacy Firewall, Creation OS client contract, and a governed MCP v2 stdio server now exist with tests. No live Jev/OpenAI provider, production persistence, ChatGPT-hosted MCP session, phone/camera integration or production deployment has been verified.

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
