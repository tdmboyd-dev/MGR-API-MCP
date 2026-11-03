# MGR API/MCP — how to use and verify it

MGR API/MCP is the shared connection behind authorized clients such as Tevin
and MCP-compatible applications. It has no separate Forge editor. Forge Studio
owns the local 3D interface; this repository routes authorized tool calls to the
same original Forge jobs and files.

Read the [current handoff](../HANDOFF.md) before starting an existing owner
runtime. For product destination and ownership, see the
[owner handbook](API-MCP-OWNER-HANDBOOK.md). For source details, use the
[engineering handbook](API-MCP-ENGINEERING-HANDBOOK.md).

## Check the local repository

Run from the actual API/MCP repository root with the existing Node/npm and
Python installation. Use the committed dependency lock. If dependencies have
not been installed in a fresh checkout, `npm ci --ignore-scripts --no-audit
--no-fund` installs them and needs package-network access; it is unnecessary
for an already prepared checkout.

```powershell
npm run typecheck
npm test
npm run verify
python scripts/verify_repository.py
```

`npm run verify` already includes typecheck, the test suite, hosted-verifier
syntax checks and plugin verification. Use the smaller commands while fixing a
specific problem and the combined command for final qualification. The Python
verifier checks repository integrity and public-document links; it does not
test an assistant, model provider or deployment. Its optional `--local` mode
also needs the original private checkpoint and is not required for a normal
public clone.

Optional integration tests may explicitly skip when their independent source
roots or runtime requirements are unavailable. Keep the skipped checks open;
do not relabel them as passing.

## Use the configured connection

Use the intended client's existing configured MCP connection, authenticate
through its normal secure account flow, and discover tools with the official
MCP tool-list operation. The returned catalog is the available implementation
for that host, not a grant to execute every tool.

`npm run start:http` starts the existing HTTP entrypoint **after** the trusted
host has provisioned its process environment. The source requires
`MCP_PUBLIC_BASE_URL`, `MCP_AUTH_ISSUER`, `MCP_JWKS_URL` and `LEGACY_BASE_URL`.
It derives the protected `/mcp` audience from the configured public base URL.
`MCP_REQUIRED_SCOPES`, `MCP_ADVERTISED_SCOPES`, claim names and `PORT` have the
source-defined defaults shown in the tracked `.env.example` reference.

The entrypoint does not automatically load `.env.example` or configure an
issuer, account or public deployment. That file documents variable names;
real values belong in the approved host's secret/configuration flow. Existing
owner launchers also compose the same shared service through their own protected
configuration; do not start a second server over their ports or state.

`npm run mcp:stdio` selects the bootstrap stdio source entrypoint. Running it
does not inject Forge or grant native execution: optional adapters must be
provided by the trusted host. Direct Windows stdio entrypoint activation is not
qualified by the HTTP/SDK proof described here.

## Enroll the original Forge workstation

The trusted HTTP host supports these four process-environment names together:

| Setting | Purpose |
|---|---|
| `MGR_FORGE_STUDIO_URL` | Address of the authorized original Forge service |
| `MGR_FORGE_STUDIO_TOKEN` | Private current native-service credential, supplied by the secure host flow |
| `MGR_FORGE_ACTOR_ID` | Exact actor allowed to use that workstation |
| `MGR_FORGE_TENANT_ID` | Exact tenant allowed to use that workstation |

All four absent disables the optional Forge adapter. Partial configuration
refuses startup. Inbound identity must match the enrolled actor and tenant as
well as audience, scope and expiry. The typed client accepts HTTPS or explicit
`http://127.0.0.1` loopback and refuses redirects. A hosted server cannot reach a
private Windows loopback address without a separately implemented and verified
authorized transport. No tunnel or remote deployment is created by setting a URL.

## Available Forge operations

This fully configured adapter registers 15 optional tools. Actual discovery is
authoritative for the running host; older injected clients may omit optional
methods. Request exact schemas from tool discovery before creating anything.

| Tool or pair | Scope | Use |
|---|---|---|
| `mgr_forge_asset_discover` | `tools:read` | Source metadata; not installed assets or rights clearance |
| `mgr_forge_request_verify` | `tools:read` | Match exact original creation input and native request identity |
| `mgr_forge_world_create` / `mgr_forge_world_status` | `tools:execute` / `tools:read` | Original source-bound world edits and status |
| `mgr_forge_creature_create` / `mgr_forge_creature_status` | `tools:execute` / `tools:read` | Native procedural creature/morph and status |
| `mgr_forge_biome_create` / `mgr_forge_biome_status` | `tools:execute` / `tools:read` | Native optional terrain layer and status |
| `mgr_forge_human_lipsync_start` / `mgr_forge_human_lipsync_status` | `tools:execute` / `tools:read` | Existing generic-human animation from supplied timed phonemes |
| `mgr_forge_world_compose_create` / `mgr_forge_world_compose_status` | `tools:execute` / `tools:read` | Original world/biome Blender composition and status |
| `mgr_forge_artifact_read` | `tools:read` | Private allowlisted GLB bytes bound to job ID and expected SHA |
| `mgr_forge_saved_jobs` | `tools:read` | Browse existing native journals, at most 20 rows per page |
| `mgr_forge_saved_job_reopen` | `tools:read` | Reopen an original job and independently verify its bounded GLB |

This timed-phoneme tool is not an automatic raw-audio alignment service.
Creation requests use stable IDs; changed instructions need a separately
authorized new request. Do not repeat an unknown write just to get another ID.
The owner workflow's exact approval/preparation remains separate from this
direct tool catalog.

## Find, reopen and retrieve a saved creation

Call `mgr_forge_saved_jobs` with JSON arguments such as:

```json
{"kind":"creature","limit":20}
```

Allowed kinds are `all`, `world`, `creature`, `biome`, `human` and `composed`.
Omitting kind selects all. Rows are ordered by kind then request ID, not by
creation time. If `journal.next_cursor` is non-null, pass that exact returned
cursor with the same filter to read the next page. It is tied to the current
listing; if jobs change, refresh instead of manufacturing a cursor.

`accepted:true` here means the journal was read successfully. The response is
`JOURNAL_OBSERVATION`, with `artifactReady:false` and `artifactVerified:false`.
Use the returned row's original kind and `request_id` to call
`mgr_forge_saved_job_reopen`. Example argument shape:

```json
{"kind":"creature","requestId":"saved-creature-0001"}
```

The ID above is illustrative; substitute the exact ID actually returned by
your own list. Do not expect an example ID to exist. Successful reopen returns
`SAVED_CREATION_GLTF_VERIFIED`, `jobId`, `artifactSha256`, `artifactBytes` and
`artifactBytesVerified:true`. It creates no job. For actual file delivery,
call the existing artifact reader using those exact returned values:

```text
mgr_forge_artifact_read({
  jobId: <jobId returned by reopen>,
  kind: <same kind>,
  expectedSha256: <artifactSha256 returned by reopen>,
  includeData: true
})
```

The last block shows field mapping, not literal JSON to submit. With
`includeData:true`, successful delivery includes an embedded
`model/gltf-binary` MCP resource. The existing consumer should save its bytes
and retain the receipt/hash. It is not a fabricated public download URL.
Delivery remains capped at 800,000 GLB bytes. Reopen and structural/hash
verification do not approve artistic quality, rights, a final rig or an engine.

## Recover without creating duplicates

For `RUNNING`, inspect the same original request again. `FAILED`,
`NEEDS_RECONCILIATION`, a missing artifact, an altered hash or an unavailable
journal needs inspection of retained native state. The list reports unavailable
kinds while keeping unaffected journals usable. Neither read tool repairs,
deletes or regenerates files. Fix the cause and reconcile the original request
before any separately authorized retry.

On `DENY`, check current account/host enrollment, actor, tenant, audience, scope
and expiry through the normal secure host flow. Changing a request ID or using
another tool does not repair permission. On a changed-list cursor, refresh the
listing. On a transfer-size refusal, preserve the original result; larger
private delivery is separate engineering, not evidence that creation failed.

## Reproduce the local Forge connection proof

The existing harness needs the real sibling `MGR-3D-FORGE` checkout and API
dependencies. From API/MCP, choose an unused receipt path:

```powershell
python scripts/verify-forge-creator-mcp.py --receipt ../MGR-3D-FORGE/artifacts/my-shared-proof.json
```

It refuses an existing receipt, creates a disposable world/workspace, launches
the real secured native server, and uses the official SDK/HTTP handler with
fixture identity. Default mode creates world, creature and biome files; checks
input identity, replay, private bytes, saved-list pagination/reopen and denial;
then closes its service and disposable workspace. It does not use the permanent
owner database, a live model, a paid provider or deployed OAuth. Blender human
and composition modes are optional and were not part of this default trial.

The current executed final proof is recorded in the owning Forge
`evidence/native-creation-2026-11-02/shared-mcp-history-final-capacity.json` and
its matching source-custody record. Follow the living handoff for later source
pins and publication. A local successful fixture is not a hosted ChatGPT,
mobile, permanent-owner or production acceptance result.
