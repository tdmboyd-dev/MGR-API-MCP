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

This fully configured adapter registers 21 optional tools. Actual discovery is
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
| `mgr_forge_reconstruction_create` / `mgr_forge_reconstruction_status` | `tools:execute` / `tools:read` | Native orthographic-mask visual hull, exact-input and independent GLB verification |
| `mgr_forge_morph_create` / `mgr_forge_morph_status` | `tools:execute` / `tools:read` | Bounded non-destructive revision of an uploaded static GLB |
| `mgr_forge_uv_create` / `mgr_forge_uv_status` | `tools:execute` / `tools:read` | Native padded per-triangle UV atlas on a supported untextured static GLB |
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

Allowed kinds are `all`, `world`, `creature`, `biome`, `human`, `composed`,
`reconstruction`, `morph` and `uv`. The bounded journal envelope allows up to
8,000 rows across eight native kinds; each page still returns at most 20.
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

## Create a measured visual hull or revise an uploaded static model

Discover the exact registered schemas first. `mgr_forge_reconstruction_create`
takes these required fields: `requestId`, `frontPngBase64`, `sidePngBase64`,
`bounds:{width,height,depth}`, `grid`, and `surface`. Upload the canonical base64
bytes of two calibrated orthographic foreground masks, without a data-URL
prefix. Front maps image width to X, side maps it to Z; Y is up and the top
image row is the top of the physical capture volume. White foreground on black
or transparent background is expected: the native mask decoder multiplies
luminance by alpha, then uses threshold 128. An ordinary white-background
photograph needs segmentation and calibrated framing first.

Bounds are metres, each from 0.01 to 100. The interactive grid is 8–64.
`surface:"voxel"` keeps voxel boundary faces; `surface:"smooth"` constructs
rounded surface-nets geometry. The native decoder accepts bounded 8-bit,
non-interlaced grayscale/RGB/RGBA PNGs up to 256 pixels per axis. This creates an
editable visual hull. It cannot measure hidden concavities or invent a faithful
unseen back from one photograph.

`mgr_forge_morph_create` takes `requestId`, `glbBase64`, `expectedSha256`, and
`morph`. Hash the exact uploaded GLB bytes locally with SHA-256. The morph
object can specify length/height/width 0.5–2.2, twist_degrees −45–45,
bend_degrees −30–30 and taper 0.65–1.45. Omitted controls use native defaults.
This lane revises supported static, self-contained triangle GLBs. Native
validation refuses skins, animation, existing morph targets and unsupported
geometry; it is not arbitrary animated-character or likeness morphing.

Each uploaded binary is at most 900,000 decoded bytes. The existing combined
JSON transport request cap remains 1,200,000 bytes, including base64 and fields;
two individually valid uploads can exceed it. Output GLB delivery remains
800,000 bytes. A larger native output is retained by Forge but cannot be
accepted/delivered through this bounded shared profile.

Save the exact original input. The corresponding reconstruction/morph
`_status` tools require that **same complete input**, including uploaded bytes;
an ID alone cannot prove that the saved model came from those instructions.
Successful create/status returns `NATIVE_RECONSTRUCTION_GLTF_VERIFIED` or
`NATIVE_MORPH_GLTF_VERIFIED`, with original input fingerprint, job ID, output
SHA-256/bytes, `nativeInputVerified:true` and `artifactBytesVerified:true`.
Native request verification and independent structural/hash verification of
actual GLB bytes must both pass. No input bytes, private source paths or public
artifact URL are returned in this receipt. After saving identity, use the
existing saved-job reopen/artifact reader for ID/hash-bound recovery.

These new tools use the existing scopes and enrolled actor/tenant. They do not
add commands to ONE's five-operation department owner workflow, consume a new
grant, approve art or claim hosted delivery. Unknown/changed results retain
`artifactReady:false` and reconciliation state; do not issue another creation
to hide an uncertain first outcome.

To run the disposable real SDK/shared HTTP/native proof without paid services,
choose a fresh receipt path:

```powershell
python scripts/verify-forge-native-assets.py --receipt evidence/my-native-asset-proof.json
```

It creates owned PNG masks and a static box GLB in a temporary workspace,
starts the secured original Forge server, exercises both jobs through the
official MCP SDK and shared HTTP handler, checks replay/exact status/changed
input/reopen/private bytes and denied principals, then checks the original
native journals contain exactly three jobs (reconstruction, morph and UV).
Fixture identities are explicit;
this does not use permanent owner state, deployed OAuth, a neural model or GPU.

## Add a native UV atlas to an untextured static model

`mgr_forge_uv_create` takes `requestId`, `glbBase64`, `expectedSha256`,
`atlasSize` and `padding`. The schema defaults to atlasSize 2048 and padding 2;
the adapter sends both fields explicitly to the original native job. Other
atlas sizes are 256, 512, 1024 or 4096. Padding must be a whole number from 1 to
16 pixels. Upload canonical base64 GLB bytes and their exact SHA-256, using the
same upload/request/output caps described above.

This authors one padded UV island for every original triangle and duplicates
vertices at seams. Native limits include 16,384 triangles, enough cell space
for padding, and non-collapsed float32 islands. Original triangle order,
materials, parts, hierarchy and source bytes are preserved. The diagnostic
checker is original QA pixels; this tool does not paint, bake or generate a
texture or claim efficient semantic chart unwrapping.

Existing UV attributes or textures are deliberately refused to preserve them.
Skins, animation, existing morph targets and unsupported/compressed geometry
also require their separate native pipelines. Choose the original supported
untextured source; do not remove a texture just to make a valuable source pass.

`mgr_forge_uv_status` takes the same complete original input as create. A
successful `NATIVE_UV_GLTF_VERIFIED` receipt requires native exact-request
verification and independent output GLB structure/hash checks. Saved kind is
`uv`; the existing artifact reader fetches only the allowlisted native
`uv/uv-mapped.glb` path for that original job and expected hash. This introduces
no owner grant or additional ONE department operation.

The native-assets proof launcher now exercises reconstruction, static morph
and UV together and checks exactly three native jobs. Earlier two-kind receipts
retain their own source hashes and 19-tool scope; use the current living handoff
for the later 21-tool result.

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
