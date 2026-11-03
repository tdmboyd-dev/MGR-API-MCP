# Native UV extension and three-lane receiving proof

This extends the same native asset adapter with `mgr_forge_uv_create` and
`mgr_forge_uv_status`. The earlier 19-tool/two-kind report and receipt retain
their original source-qualified scope. Current full configuration has **21
direct Forge tools**, eight saved kinds and at most 8,000 total journal rows.
Pages remain 20 rows and the original transfer caps remain unchanged. ONE's
original five-operation department union is unchanged.

`src/forge-asset-inputs.ts` adds a separate UV schema:
`{requestId,glbBase64,expectedSha256,atlasSize,padding}`. Atlas choices are 256,
512, 1024, 2048, 4096 with default 2048. Padding is integer 1–16 with default 2. Both
defaults are sent explicitly in the exact native request, as `atlas_size` and
`padding`, alongside `request_id`, `glb_base64`, `expected_sha256`.

The typed client calls original `/api/uv-create`, `/api/uv-status` and native
`/api/request-verify` kind `uv`. It only reads the allowlisted artifact path
`/files/JOB/uv/uv-mapped.glb`. Create/status reuse the existing native-asset
guard, original input verification and independently hashed structural GLB
check before returning `NATIVE_UV_GLTF_VERIFIED`. Status requires the same
complete original typed input. No new credential, owner grant, vault or job
controller is introduced. Existing execute/read scopes and all original
actor/tenant/audience/expiry/before-dispatch/after-await/final-publication fences
are retained.

Native UV authoring owns the actual geometry: one padded UV chart per triangle,
explicit vertex seams and active-index remapping while preserving original
triangle order, supported attributes, materials, parts, hierarchy and source
bytes. Its complete source was read. Limits include 16,384 triangles, fit for
chosen pixel padding and noncollapsed float32 UV islands. Existing UV/textured,
skinned, animated, targeted and unsupported/compressed inputs refuse. Diagnostic
checker pixels are original QA, not texture/material art or efficient semantic
chart unwrapping. Upload 900 KB, combined native JSON 1.2 MB, output 800 KB and prior
response/embedded-base64 limits remain.

## Executed proof

The focused native-assets/history/UV test run passed 28/28, including six new UV
tests. These check exact schema choices/defaults, native field mapping,
independent input/artifact acceptance, receipt substitution, binary tamper,
scope/principal denial, after-await authority withdrawal, unknown create/no
retry, saved kind/transfer cap and final serialized-publication refusal.
Typecheck passed before the actual native trial. The final canonical `npm run verify` passed 363 results: 342 passed, zero failed
and 21 explicit optional-source skips, plus typecheck, hosted-artifact syntax
and plugin gates. Its log is `npm-verify-three-kinds.txt`. The skipped independent
source/SDK-grant checks remain unverified; they are not Forge UV successes.

`real-protocol-three-kinds.json` records the official SDK over actual local
shared HTTP into secured original native Forge for **all three lanes**. Its
untextured/no-UV static box is locally authored, so UV actually executes rather
than using a textured fixture that native code must reject.

| Lane | Actual GLB bytes | Independently downloaded SHA-256 |
|---|---:|---|
| Reconstruction | 148500 | `b57b646a1c539a411b23bccaaf4757b4295c0bffb6d1fa4ca9d5cd1ec86c6a68` |
| Morph | 2636 | `770bb3f10a18733c3862bff9c521438d8c461deaf5a2bae895f67888b5c6c631` |
| UV | 3668 | `bc6f1619d21c4049b8d4e501bb0a87952b373837277bc47a7b7313c1487ac1f9` |

For each lane, real create/replay/fresh-SDK exact-input status/native request
verification passed. Changed instructions were denied by create, status and
request verification. Original saved observation/reopen/embedded GLB delivery
and wrong-hash refusal passed. Read-only identity could inspect/read and could
not create. Other actor/tenant identities could neither create nor read these
private artifacts.

The Python launcher independently inspected original native rows/files:
one row per kind, **exactly three total native jobs**, matching original output
hashes/bytes. All replay/read/denied operations produced no additional job.
All 143 API/native runtime source fingerprints remained unchanged before/after
the trial. The disposable service/workspace closed; permanent owner state was
untouched. The source window includes the new initial-admission recovery repair
and UV native adapter, unlike the earlier two-kind receipt. Blender bridge
execution is not claimed by this CPU-only protocol test.

Six defined connection checks are supported for this extended scope: typed
bounded routing, original authority/publication fences, exact native input and
independent GLB acceptance, replay/changed-input refusal, saved recovery/
delivery, actual denied/read principals without extra jobs. This is 6/6 of the
specified connection checks, not API/Forge whole-product completion.

See `docs/API-MCP-HOW-TO.md` for operation, original inputs, limits and the
fresh-receipt reproduction command. No deployed OAuth/JWKS, internet worker,
hosted/mobile delivery, learned generation, texture painting, owner art,
production acceptance or Git publication is inferred. Publication remains
parent-coordinated; prior evidence stays historical for its exact source.
