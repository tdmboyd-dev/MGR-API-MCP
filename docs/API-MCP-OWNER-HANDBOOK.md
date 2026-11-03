# MGR API/MCP — owner handbook

This handbook defines what the completed shared edge should do. The
[living handoff](../HANDOFF.md) records what currently works and the exact proof;
the [how-to](API-MCP-HOW-TO.md) explains operation. The
[engineering handbook](API-MCP-ENGINEERING-HANDBOOK.md) maps the source owners.

## The finished product

MGR API/MCP should let an authorized person or application use MGR tools through
one consistent connection: discover available capabilities, submit an exact
authorized request, inspect its real progress, obtain the original verified
result, and recover after an interruption without repeating an uncertain action.
It should work with interchangeable clients and independently owned MGR domains.

The shared edge owns protocol, typed transport, authentication checks and bounded
delivery. It must preserve the identity, input, permission and result linkage
across that connection. It does not become another product's database,
generator, job controller or permission authority.

| Owner | What stays there |
|---|---|
| MGR-ONE / Tevin | Conversation, reasoning, intent, owner approval/delegation and saved owner workflows |
| MGR API/MCP | Shared MCP/HTTP connection, principal/scope enforcement, typed domain adapters and independent result readback |
| MGR 3D Forge | Geometry, original creation jobs/journals, source/artifact identity and its private files |
| MGR Creation OS | Its own creation factories/projects and coordination when a project spans factories |
| MGR Legacy | Authoritative business records, actions and business receipts |
| MGR VOICE / SignMe | Their original speech or document operations, versions and results |
| Engineering domains | Their own source/candidate/job/worker/observation contracts; a catalog entry alone grants no execution |

Forge can be called directly through the shared edge. Creation OS is optional
coordination for a mixed project, not a mandatory extra stop for every 3D job.
Existing edge task state remains session orchestration, not a second business
system of record.

## What completion requires

A connected capability is complete for a stated use only when the intended
client can execute the entire authorized flow and recover the saved result.
For a creation, that means validated input, current permission before dispatch,
original request/job identity, actual native output, independent byte/hash
checks, saved result and a successful reopen. The original domain remains the
source of truth for whether work started, finished, failed or needs review.

The same flow must refuse the wrong actor, tenant, audience, scope or stale
authority. A late response must not publish private results after authority is
withdrawn. An expired or lost response must not silently trigger another write.
Unknown work is reconciled by its original ID before anyone retries it.

For hosted use, local tests must be followed by an actual authenticated remote
client, real configured issuer/audience, reachable authorized domain worker,
private artifact return, restart/revocation checks and operational acceptance.
Code for HTTP/OAuth and a deployment blueprint do not satisfy those checks by
themselves. A health response proves neither account authorization nor a working
Forge connection.

Keep these evidence states separate: coded; integrated; local runtime verified;
real provider/device verified; owner accepted; production verified. Do not turn
test counts or a registered tool list into a whole-product percentage.

## Current usable Forge connection

The existing optional Forge adapter now supports **15 tools**: the original 13
plus saved-journal navigation and verified reopen. Availability depends on the
host injecting/enrolling that adapter. Read tools use `tools:read`; native
creation uses `tools:execute`. The current exact actor and tenant must also
match the workstation enrollment. A scope does not enroll another user.

Saved Creations has two deliberately different results:

- A list is `JOURNAL_OBSERVATION`. Its rows describe stored state, with
  `artifact_verified:false`. The top-level result has `artifactReady:false` and
  `artifactVerified:false`. A successful list read is not acceptance of a model.
- Reopen uses the original native status reader and the existing private GLB
  reader. A successful `SAVED_CREATION_GLTF_VERIFIED` result includes the exact
  original job ID, SHA-256 and byte count after independent structural/hash
  checks. It starts no job and does not approve the art or grant write authority.

An unfinished, failed, missing or altered result remains unresolved. The list
does not delete, repair or regenerate it. The current shared GLB delivery limit
is 800,000 bytes; that qualification is not the full native Forge product limit.

The November 2 local proof used the official MCP client, real local HTTP,
secured native Forge and actual world/creature/biome files. It exercised
pagination, original job reopen, exact bytes, stable replay and foreign
actor/tenant denial without allocating another job. Its identities were
fixtures. It did not activate the permanent owner host or qualify deployed
OAuth, mobile, live models, premium art or production.

Full local API verification at this checkpoint returned 345 results: 324 passed,
zero failed and 21 explicit optional-source skips, plus passing typecheck,
hosted-artifact syntax and plugin gates. The Forge-focused 108 tests are an
overlapping scope. Exact source guards and logs live in the owning Forge
`evidence/native-creation-2026-11-02/shared-mcp-history-final*` packet. Publication
and later checks belong in the living handoff.

## Ownership, cost and recovery

Preserve replaceable adapters and public protocols. Add capabilities to their
existing domain and shared transport rather than creating a parallel router,
vault or permission engine. Keep private tokens in the configured host secret
flow. Never put them in tool arguments, public source, handoffs or download URLs.

No provider purchase, model download or paid generation follows from connecting
a tool. Actual budgets, rights and provider acceptance stay explicit. The
local procedural Forge proof used no paid provider or neural model; it does not
establish a price or performance comparison for the whole ecosystem.

When a connection fails, retain the original request, exact input digest,
principal/workspace linkage and any native receipt. Recover by reading the
original domain's status and bytes. Preserve the previous source and failed
evidence so a source update can be reversed or requalified. The existing
[queue](../BUILD-QUEUE.md) and [scorecard](full-build/SCORECARD.md) retain unfinished
work; this handbook does not replace them.
