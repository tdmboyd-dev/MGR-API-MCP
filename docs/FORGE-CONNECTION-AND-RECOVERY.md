# Forge through the existing shared API

The joined gateway retains department/repository services and adds the original optional Forge bridge from main. Forge owns geometry, native jobs, private artifacts and replay. ONE owns owner intent and permissions. API-MCP authenticates/transports; it does not become a new studio or duplicate vault.

## Enrollment and operations

Trusted server configuration must supply MGR_FORGE_STUDIO_URL, MGR_FORGE_STUDIO_TOKEN, MGR_FORGE_ACTOR_ID and MGR_FORGE_TENANT_ID together. Leave all four empty for a disabled Forge backend. Never place real tokens in tracked .env.example or chat. The verified inbound actor and tenant must both match the workstation enrollment. tools:read and tools:execute do not enroll additional users. A shared multiuser Forge service needs per-user authoritative ownership/storage; pointing multiple unrelated users at one owner workstation is not that implementation.

| Registered operation | Existing domain route | Scope |
|---|---|---|
| mgr_forge_asset_discover | /api/asset-sources or /api/asset-search | tools:read |
| mgr_forge_world_create / mgr_forge_world_status | /api/world-job / /api/world-job-status | tools:execute / tools:read |
| mgr_forge_creature_create / mgr_forge_creature_status | /api/creature-create / /api/creature-status | tools:execute / tools:read |
| mgr_forge_biome_create / mgr_forge_biome_status | /api/biome-create / /api/biome-status | tools:execute / tools:read |
| mgr_forge_human_lipsync_start / mgr_forge_human_lipsync_status | /api/human-lipsync-start / /api/human-lipsync-status | tools:execute / tools:read |
| mgr_forge_world_compose_create / mgr_forge_world_compose_status | /api/world-compose-create / /api/world-compose-status | tools:execute / tools:read |
| mgr_forge_artifact_read | Fixed private /files/{jobId}/allowlisted-kind paths | tools:read |

Use official MCP tool discovery to obtain exact bounded schemas. Start jobs with a stable caller request ID; a changed request under an old ID is not a retry. Preserve RUNNING, BUSY, missing/failed and NEEDS_RECONCILIATION outcomes. Read status for the original ID before another mutation; permission loss after dispatch does not establish that execution stopped. A result is available only while actor, tenant, scope, expiry, backend and current host remain valid, including final callback serialization.

Artifact read requires immutable job ID, allowlisted kind and expectedSHA256. includeData returns a typed model/gltf-binary resource up to800KB, not a public URL. Receiving clients must verify the bytes and keep private state/artifact identity in their existing store. Hash validation is not model quality, legal rights, engine acceptance or complete GLB semantic validation. Personal Tevin's proposal/approval/saved artifact/worker flow is still to be integrated; direct protocol proof must not be relabeled as that journey.

## Repeatable local verification

Set MGR_FORGE_SOURCE_DIR to the inspected Forge checkout. Run python scripts/verify-forge-creator-mcp.py --receipt evidence/your-fresh-proof.json. The receipt must not exist; overwrite is rejected before jobs. Set MGR_RUN_HUMAN_LIPSYNC=1 and/or MGR_RUN_WORLD_COMPOSITION=1 only for the authorized real Blender proof, with MGR_FORGE_BLENDER_BINARY pointing at the installed binary if needed. The verifier uses synthetic inputs and a fixture identity verifier, actual SDK/HTTP/Forge storage and real returned artifacts; it does not certify deployed OAuth or the permanent owner runtime.

[Current scope, executed results and remaining gaps](../evidence/forge-joined-2026-11-01/REPORT.md). The twelve shared operations are not Forge's entire product. Existing source also supports a raw-WAV loudness-reactive Human path that still needs its own typed shared adapter and acceptance; no speech phoneme recognition is implied.

## Secured native Studio entry

Use Forge57619c8 or later qualified source: anonymous `/` is an unlock shell, `/studio` requires the exact session header, and owner browser entry uses the private fragment link printed by `serve-studio`. The fragment is stripped before the authenticated request; never publish a real launch link. Shared MCP continues sending the private header from trusted host configuration. Actual SDK/Blender regression against this repaired server passed; see `../evidence/forge-studio-access-2026-11-01/REPORT.md`. This is a local single-owner service, not deployed multiuser OAuth or permanent Tevin execution.

## Bounded GLB receiver profile

`src/forge-glb.ts` adapts the native Forge inspector's geometry/range checks for the shared transfer boundary. Both actual HTTP and alternate adapters must provide canonical base64, matching hash/bytes and a structurally accepted indexed triangle GLB. It rejects external URI keys, sparse/nonindexed/required-compression paths and integer matrices; it does not certify all scene, animation, skin or material semantics. Limits:800KB bytes,4096views,8192accessors/primitives,64JSON depth/100000nodes and2000000scalar work. Failed/oversized/microchunk responses cancel unread bodies, release locks and never retry mutation automatically. Source/actual native compatibility: ../evidence/forge-glb-2026-11-01/verification.json. These are current transport qualifications, not the whole Forge feature set or a permanent asset-size product limit.

Native comparison: ADAPT `MGR-3D-FORGE/forge/glb.py` instead of adding a provider or spawning a Python geometry engine per returned MCP blob. The in-process receiver owns only envelope/geometry custody; Forge still owns asset generation and independent Blender proof. Khronos format reference: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html (header/chunks, buffers/accessors/alignment). Complete official glTF validator equivalence and benchmarked cost/quality savings are not claimed.
