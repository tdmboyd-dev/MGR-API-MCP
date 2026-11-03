# Native reconstruction and imported-model morph receiving

The existing Forge adapter now supports two additional native creation lanes.
This is a shared-edge transport and acceptance change. Forge retains original
geometry, source bytes, jobs, journals and artifacts. Existing actor/tenant/
audience/scope and publication fences remain the authority boundary. ONE's
five-operation department command union is unchanged.

## Result and defined acceptance

Six applicable connection checks are supported (6/6): strict typed native
routing and transfer bounds; unchanged principal/execution/publication guards;
exact native input and independently checked GLB acceptance; replay and altered
input refusal; original saved navigation/reopen/download; and real denied/read
principals without extra jobs. This is the bounded connection scope, not an
API/Forge completion percentage or production acceptance.

The final executable API source passed canonical `npm run verify`:
**357 results: 336 passed, zero failed, 21 explicit optional-source skips**.
Typecheck, hosted-verifier syntax and plugin gates also passed. See
`npm-verify.txt`. The 12 new native-asset tests and existing saved-history 10 /
exact-request 4 tests separately passed 26/26; these overlap the full result and
must not be added to it. Optional SignMe/Creation/ONE/Code-Monster source-root
and SDK-grant skips remain unverified, as identified in that log.

`real-protocol.json` is actual official SDK StreamableHTTPClientTransport ->
local Node HTTP -> existing shared authenticated MCP handler -> secured
original Python Forge. Its verifier uses explicit synthetic fixture identities;
no deployed OAuth/JWKS, permanent owner state, paid provider or neural model ran.
The launcher checked all 142 owning API/native runtime source hashes before and
after; all stayed unchanged. Later native Studio cancellation/facial changes
require their own qualification rather than silently extending these hashes.

Two real jobs materialized from original locally generated source bytes:

| Native lane | Actual delivered GLB bytes | Output SHA-256 |
|---|---:|---|
| Reconstruction | 148500 | `b57b646a1c539a411b23bccaaf4757b4295c0bffb6d1fa4ca9d5cd1ec86c6a68` |
| Static imported morph | 2636 | `770bb3f10a18733c3862bff9c521438d8c461deaf5a2bae895f67888b5c6c631` |

For each lane, the real protocol test created it, replayed the same request,
opened a fresh official SDK connection, read status with the complete original
input, called native exact-request verification, denied changed-input create/
status/verify, observed the original journal, reopened its exact artifact,
downloaded an embedded private GLB and independently checked its bytes/hash,
and refused a wrong digest. Saved pagination crossed the two kinds.

Read-only identity could inspect status, reopen and read artifacts but could
not create. Cross-actor and cross-tenant identities could neither create nor
read these outputs. The Python launcher independently checked original native
journals and output files after the protocol test: one reconstruction row, one
morph row, **exactly two total native jobs**. All reads, replays and denials
allocated no additional jobs. Both temporary services and the disposable native
workspace closed in `finally`; no permanent runtime was restarted.

The initial launcher fixture failed before server startup because its one-mesh
GLB call omitted an explicit one-material list. The unaltered failure is in
`real-protocol-run.txt`; corrected actual proof output is in
`real-protocol-after-materials.txt`. No successful provider effect or job was
claimed from that harness failure.

## Source and contract

- `src/forge-asset-inputs.ts`: separate reconstruction/morph schema and seven-kind
  direct verification union. Original `src/forge-inputs.ts` and department types
  remain unchanged.
- `src/forge-catalog-client.ts`: native snake_case request translation, original
  create/status routes and new allowlisted GLB paths.
- `src/forge-mcp-tools.ts`: four optional tools, exact native input/receipt plus
  independent artifact validation, and seven-kind saved/artifact read maps.
- `test/forge-native-assets.test.ts`: success, input/size refusal, identity and
  receipt substitution, binary tamper, before/after-await authority, final
  serialized publication, unresolved state and scope checks.
- `test/forge-history.test.ts`: old 5,000 total-row boundary updated to native 7,000;
  page/transfer limits remain unchanged.
- `scripts/verify-forge-native-assets.py` and
  `scripts/verify-forge-native-assets-protocol.mjs`: independent disposable
  native server, official SDK/shared HTTP and original journal/file witness.

Fully configured Forge now registers **19 direct tools**. New names are
`mgr_forge_reconstruction_create`, `mgr_forge_reconstruction_status`,
`mgr_forge_morph_create`, `mgr_forge_morph_status`. Create requires existing
`tools:execute`; status existing `tools:read`. Each requires the exact enrolled
actor/tenant/audience, expiry and current host. These tools register only when
the relevant native method plus original verifyRequest/readArtifact methods
exist; older injected clients keep their existing catalog.

Reconstruction input:
`{requestId,frontPngBase64,sidePngBase64,bounds:{width,height,depth},grid,surface}`.
Bounds 0.01–100 metres, grid 8–64, surface `voxel|smooth`. The native decoder accepts
8-bit non-interlaced grayscale/RGB/RGBA PNG masks up to 256 pixels/axis; luminance
times alpha >= 128 means occupied. Side is the native left view. This measures
an orthographic visual hull, not arbitrary photograph semantics or hidden truth.

Morph input: `{requestId,glbBase64,expectedSha256,morph}` with the original six
bounded deformation controls. Native static/self-contained geometry validation
owns model acceptance; skins/animations/existing targets and unsupported
semantics refuse. No arbitrary rig/likeness-preservation claim is made.

For both new status tools, submit the **same full original input** used for
creation. ID-only status cannot prove exact input. Both native status and native
original-input verification must agree on request/job/state/hash/bytes. A
materialized response also requires native model_inference_used and
owner_art_accepted false, correct source kind, independently fetched canonical
base64 bytes with exact digest/length, and structural GLB inspection. Returned
status is `NATIVE_RECONSTRUCTION_GLTF_VERIFIED` or `NATIVE_MORPH_GLTF_VERIFIED`;
no source bytes, private paths or fabricated public URL are returned.

Upload binary limit is 900,000 decoded bytes each and canonical base64 only. The
unchanged aggregate native JSON POST cap is 1,200,000 bytes, so two independently
valid uploads can still exceed it before network dispatch. Unchanged output
GLB cap 800,000 bytes / base64 cap 1,100,000 characters and response JSON cap 300,000 bytes
remain. Larger original native outputs stay native; this bounded MCP profile
cannot falsely accept/deliver them. Saved navigation allows seven kinds / 7,000
total rows; at most 20 rows/page, with original fingerprinted cursors.

Unknown, interrupted or changed results keep artifactReady false and require
original-state reconciliation. No helper automatically retries a create.
Existing saved-job reopen is read-only ID recovery plus original native status
and independent GLB verification; exact input remains separately available in
the direct native request verifier. No new vault, owner grant or job controller
was introduced.

## How to reproduce and remaining acceptance

From this prepared API repository with its sibling native Forge checkout:

```powershell
npm run verify
python scripts/verify-forge-native-assets.py --receipt evidence/my-fresh-native-proof.json
python scripts/verify_repository.py
```

The launcher refuses existing proof receipts. It generates original calibrated
mask/static-box fixtures and uses a disposable private native workspace. The
proof captures exact runtime source SHA-256 values. Model/PNG originals and
native jobs stay in that temporary fixture rather than adding a second Forge
asset vault to API/MCP.

Operation fields and recovery are documented in `docs/API-MCP-HOW-TO.md`;
completed-product ownership is in `docs/API-MCP-OWNER-HANDBOOK.md`. Source
publication remains parent-coordinated, with no commit/push claimed by this
lane. No deployed OAuth, internet worker reachability, hosted/mobile delivery,
owner-art/rights, arbitrary photoreal reconstruction, animated morph or
production acceptance follows from these results.
