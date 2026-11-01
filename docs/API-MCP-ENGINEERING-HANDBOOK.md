# MGR API/MCP — Actual Shared-Bridge Engineering Handbook

**Verified baseline**: main b0b225cc9f225a02b9465db3817fc128532a23b4 (2026-10-31). The repo is the user's REAL shared MGR API/MCP, not a local helper or duplicate API. It contains hosted HTTP/OAuth implementation plus optional integrations with Legacy, Creation OS, Forge, voice and other MGR tools. Its existing HANDOFF.md remains the ONE living operating authority; do not replace it with the Forge master plan.

**Static audit**: 169 tracked files, 56 JS/TS source files inspected as text, 4 Python files AST parsed, 47 Markdown files, 21 test files, 0 parsed syntax/JSON failures. Every baseline tracked source path, content SHA-256 and import/route mentions is recorded in evidence/audits/2026-10-31-baseline-static-inventory.json. This does not prove live hosted deployment or every other MGR app's integration.

## Actual code ownership

| Owner lane | Real source | Function |
|---|---|---|
| Shared MCP protocol and hosted entry | `src/mcp-server.ts`, `src/mcp-http.ts`, `src/http-server.ts` | Assemble tools, protocol handlers and real HTTP service. Do NOT create a second Forge-specific MCP server. |
| Authentication | `src/authz.ts`, `src/http-auth.ts`, `src/jwt-verifier.ts`, `src/oauth-metadata.ts` | OAuth/JWKS actor/tenant/audience, scopes, resource metadata and denial before side effects. |
| Existing app connections | `src/legacy-client.ts`, `src/legacy-mcp-tools.ts`, `src/creation-client.ts`, `src/creation-mcp-tools.ts` | Connected app domains, each with its own action/verification contract. |
| Current 3D Forge bridge | `src/forge-catalog-client.ts`, `src/forge-mcp-tools.ts` | Guarded direct Forge catalog, original creature and world creation and status. Forge itself owns geometry/asset files/job state. |
| Shared risk policy | `src/action-sentinel.ts`, `src/privacy-firewall.ts`, `src/security.ts`, `src/state.ts` | Scope/approval/privacy/idempotency and unknown-outcome reconciliation. |
| Other supporting brains | `src/model-router.ts`, `src/voice-fabric.ts`, `src/brain-controller.ts` | Policy-aware model/tool selection and specialized requests; not a duplicate of MGR-ONE itself. |
| Private REA inspector | `integrations/rea-xray-plugin/` | Optional restricted local inspection specialist; NOT blanket access to Windows. |
| Private Forge Creator | `integrations/forge-creator-plugin/` | Skills-only ChatGPT workflow and artifact approval contract; the hosted file-delivery connection remains OPEN. |

## Real setup and tests

```powershell
cd MGR-API-MCP
npm install --ignore-scripts --no-audit --no-fund --no-package-lock
npm run typecheck
npm run verify
python scripts/verify-forge-studio.py
```

Previous checked baseline: 68/68 API tests and artifact/plugin checks PASS. `verify-forge-studio.py` requires the real sibling MGR-3D-FORGE source and launches a temporary Python Forge Studio local HTTP process. It tests local authorized source search, world GLB and original creature GLB (114,192 bytes/1,748 triangles), stable replay and hashed token-only file retrieval. That is a **local integration receipt using this actual repository**, not a new "local API/MCP" repo or proof a cloud deployment can reach a private Windows computer.

## Direct 3D route and exact permissions

Clients: Forge Studio UI, Tevin/MGR-ONE, the private ChatGPT Forge Creator (once hosted remote tools are actually connected), or Creation OS multi-factory caller.

1. Shared protocol verifies token, issuer/audience and tenant. Use `tools:read` for catalog/status and `tools:execute` for side effects. Never invent a parallel `tools:write` scope.
2. `mgr_forge_asset_discover` queries Forge source metadata, NOT rights-approved installed assets.
3. `mgr_forge_world_create`/`mgr_forge_world_status` call existing Python `/api/world-job` and `/api/world-job-status` with source-fingerprinted document and stable request ID.
4. `mgr_forge_creature_create`/`mgr_forge_creature_status` call existing Python `/api/creature-create` and `/api/creature-status` with original CPU geometry and SHA proof.
5. GET of actual GLB/project/report stays private and authenticated. Forge's localhost Studio binds to `127.0.0.1`; do not assume remote/hosted API/MCP can reach it without a separately tested secure worker relay.
6. Return real artifact SHA and state, not "succeeded" simply because an API returned a job reference. Retry with same ID only when unchanged/reconciled; unknown outcome is NOT green.

## Hosted deployment — code exists, proof remains open

Read `src/http-server.ts`, `src/mcp-http.ts`, `src/jwt-verifier.ts`, `.env.example` (configuration template only; no live secrets). The presence of hosted source, OAuth metadata and a deploy manifest `render.yaml` is not proof it is deployed, reachable, or bound to Forge. Test real authenticated remote client with correct tenant; scope, rate/cost and zero secret leakage; durable jobs; private artifact delivery with short-lived permissions; recovery, concurrency and revocation.

**Critical difference**: direct Forge creation does not require Creation OS. Creation OS should coordinate ONLY cross-factory jobs with video/audio/campaign parts and submit approved requests through this existing API/MCP.

## Maintenance, security and evidence

When changing an app connector: inspect its existing app contract and request ID, reuse current auth/approval/tenant data and service adapter; add deny/success/replay/timeout tests; prove real remote business/creative side effects; update this repo's HANDOFF.md, BUILD-QUEUE.md and AUDIT-LEDGER.md in the same commit. Do not claim local tests equal remote adoption. No duplication of Forge Vault binaries or REA brain in the API/MCP repo.

Independent archive/route audit baseline: `evidence/audits/2026-10-31-baseline-static-inventory.json`. Forge-specific how-to: sibling `MGR-3D-FORGE/docs/HOW-TO-INTEGRATION-VERIFY-RECOVER.md`. Creation OS's boundary: sibling `MGR-CREATE-Os/HANDOFF.md`.

## New shared Forge model and artifact read tools

The original MGR-API-MCP Forge adapter now registers mgr_forge_biome_create/status, mgr_forge_human_lipsync_start/status and mgr_forge_artifact_read under existing tools:execute or tools:read, tenant/audience scopes. The last tool reads an allowlisted GLB path (max 800KB), independently matches a job-receipt SHA and can return it as an embedded MCP model/gltf-binary resource. src/mcp-server.ts erroneous tools:write label fixed. Repro: scripts/verify-forge-native-mcp-protocol.mjs, python scripts/verify-forge-creator-mcp.py. This is a local client/handler fixture proof; no hosted OAuth/provider or private Windows-to-cloud tunnel has been accepted.


## Joined receiving checkpoint - November 1, 2026

Existing Forge main and Tevin gateway histories reconciled;247/247API and638run/635pass/3skipForge with2,051stable inputs. Exact actor plus tenant enrollment and after-await/final-serialization authority checks now cover the optional Forge bridge; document UTF8/root identity repaired. See ../evidence/forge-joined-2026-11-01/REPORT.md and the current root handoff. That dated checkpoint predates later bounded GLB validation, native exact-request proof and approved workflow integration; use the current handoff for remaining permanent worker, full semantic, raw-WAV and hosted/production acceptance. Prior dated baselines retain historical scope.

## Approved Forge workflow preparation

`src/forge-department.ts` adapts five native creators into the existing DepartmentGateway. `mgr_department_prepare` requires departments:read and exact enrolled actor/tenant/workspace; it checks native original-input/source validation without job/grant/artifact creation. Fixed owner SDK and registered transport allow the read. ONE requires its command-bound preparation receipt before admission/approval consumption. NOT_FOUND may describe a valid new ID, never proof of success or authority to retry an unknown effect. Existing IDs require native exact-input/job proof. Original thirteen direct Forge MCP tools are separate from this generic department method. The current native world editor validates its source hash, schema, materials, identities, transforms and grounds before allocation; broad shared schema acceptance alone cannot prove native geometry validity. Source/proof: root-relative evidence/forge-preparation-2026-11-01/REPORT.md. Permanent owner worker/launcher and broader original scope remain open.
