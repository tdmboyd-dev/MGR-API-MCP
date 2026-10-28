# Tevin department integration — October 28, 2026

ONE remains the brain and host authority. This repository transports bounded commands. Legacy owns business records and receipts; Creation OS owns creation jobs and artifact bytes; VOICE owns synthesis and speech receipts; SignMe owns drafts and immutable document versions.

## Implemented and locally exercised

The official MCP SDK transports `mgr_department_execute`, `mgr_department_status`, `mgr_department_artifact` and `mgr_department_cancel`. Every tool accepts the same strict `{operation,requestId,input}` command. Identity never comes from command arguments. The configured service credential, verified MCP identity and configured department principal must agree. Execute/cancel require `departments:execute`; status/artifact require `departments:read`. Expiry is checked again before publishing the result.

| Operation | Input | Actual effect / evidence |
| --- | --- | --- |
| `legacy.contact.create` | `{displayName,email?}` | PostgreSQL contact and authoritative receipt; exact actor/tenant/action/idempotency/digest receipt match and entity readback |
| `creation.document.render` | `{workspaceId,title,sections:[{heading,body}],rightsRefs:["owner-authored"]}` | Existing Markdown renderer, durable SQLite BLOB, request digest and independently downloaded SHA256/size |
| `voice.speech` | `{sessionId,turnId,text,profileId:"af_heart",exactText:true}` | Local Kokoro CPU synthesis, queued/running/terminal receipt, exact input/text/session binding and actual WAV hash/size |
| `signme.draft.create` | `{workspaceId,title,content,documentId?,expectedVersion?}` | Existing Document/User/AuditLog tables plus immutable versions and idempotent operation receipt; full version readback |

Request IDs are 1–128 ASCII letters/digits/underscore/dot/colon/hyphen, except speech IDs which allow only letters/digits/underscore/hyphen and at most 80 characters. Speech is limited to 1500 characters. SignMe updates require both documentId and expectedVersion. No tool exposes signing, sending, payments, arbitrary shell execution, cloning or paid generation.

Native department services have bearer credentials bound to a specific actor and tenant. Loopback is explicit; HTTP to a remote hostname is refused. Redirects are refused. Responses are bounded; JSON bodies are capped at 1 MiB and artifact downloads at 8 MiB. Reported artifact hashes alone do not establish success: the edge downloads the bytes and hashes them independently. ONE additionally binds later downloads to the hash in its saved accepted receipt.

## ONE owner workflow

Configure `createRareServer({store,ownerToken,publicOrigin,ecosystemWorkflowConfig:{client,tenantId,actorId}})` with an authenticated MCP client. A durable store and previously enrolled host authority are required. Existing databases are never automatically enrolled. The owner page is `/departments`.

1. Preview a strict department command. ONE saves it in existing requests/goals/jobs and computes the existing host execution digest.
2. Owner approves that exact digest. The existing anchored ExecutionCoordinator issues a zero-cost grant/approval.
3. Execute admits and records unknown dispatch state before the network call.
4. ONE calls the department status tool after initial execution. Success requires independently verified durable readback.
5. Timeout/restart preserves unknown state; subsequent execute only reconciles status, never blindly repeats the mutation.
6. A completed request can be reopened without another dispatch. Creation/audio downloads are rehashed at the edge, ONE and browser.

## Local launch and reproducible proof

Run from this repository with Node 24 and installed locked dependencies:

```powershell
node --import tsx scripts/prove-departments-local.ts <private-runtime-directory> <optional-unused>
node --import tsx scripts/prove-tevin-departments-local.ts <private-runtime-directory> <path-to-MGR-ONE>
node --import tsx scripts/start-tevin-departments-local.ts <private-runtime-directory> <path-to-MGR-ONE>
```

The private runtime directory contains `legacy/runtime.private.json`, `creation-signme-runtime.private.json` and `voice-runtime-private.json`. These carry credentials and are deliberately excluded from delivery. They reference isolated PostgreSQL, SQLite and cached local Kokoro configuration. The proof scripts start/stop their own Creation/SignMe processes; stop the persistent launcher before running proof. Legacy and VOICE must already be running. No model is downloaded and no microphone, playback, signing, message or payment action occurs in proof.

The persistent launcher runs ONE on loopback port17954 and MCP on17953. It creates a new isolated lab database under owner-lab, explicitly enrolls only that newly allocated database, and protects its owner credential to the current Windows user. Its access token expires after eight hours. The owner credential is in owner-lab/owner.private.json; never publish it or place it in a URL. The production owner database is untouched. The launcher is a local integration lab, not a production deployment or a live business workspace migration.

## Production configuration

The existing `start:http` entrypoint retains JWKS/issuer/audience OAuth validation. Set `MGR_DEPARTMENTS_ENABLED=true`, `MGR_DEPARTMENT_ACTOR_ID`, `MGR_DEPARTMENT_TENANT_ID`, `CREATION_BASE_URL`, `CREATION_SERVICE_TOKEN`, `VOICE_BASE_URL`, `VOICE_SERVICE_TOKEN`, `SIGNME_BASE_URL`, `SIGNME_SERVICE_TOKEN`, and existing Legacy settings using secure environment provisioning. Configure the OAuth issuer to issue the department scopes to the intended principal. The edge must reach each private domain endpoint; these local sidecars do not listen publicly. Hosted OAuth issuance, a public deployment and a hosted ChatGPT session remain separate unverified gates.

## Evidence limits

The current local proof runs exercise real PostgreSQL, SQLite persistence and cached Kokoro inference, including a deliberately discarded committed response and owner database reopen. This does not prove production hosting, physical microphone/speaker behavior, third-party provider delivery, legal signing, paid entitlement fulfillment, complete natural-language agent routing, or every feature of each repository. All source runtime TypeScript in this API repository was read; research originals and broader ecosystem source have separate per-file reading ledgers.


## October 28 continuation: inline review, delegated execution and OmniDev

The current owner-to-real-department harness passed53/53 checks after cold restarting the isolated PostgreSQL, Legacy and VOICE services. It exercises real PostgreSQL contacts, Markdown bytes, immutable unsigned SignMe drafts and offline Kokoro WAV synthesis. The model Responses used to select the four proposal tools are explicit fixtures; this is not a live model-provider qualification. The exact same conversation parser, saved source custody, ONE host coordinator, owner HTTP routes, MCP HTTP SDK and real domain services run in the proof.

The main conversation now brings exact proposals, source/digest, current status, owner controls and verified output directly inline. Owner-issued policies can authorize the four connected zero-cost operations within exact tenant/actor and operation-specific workspace/session scopes. Owners may select count/time limits or no count limit/until revoked. Child authority remains exact, anchored, revocable and checked at dispatch. No unlimited policy was silently activated for the owner. The proof checks policy retry, restart, all four automatic effects, duplicate avoidance, exhaustion, revocation and cross-operation denial.

OmniDev Swarm is added to the actual source-pinned MCP catalog as repository19, engineering department, at26e230d052c45c1f42cb731ff095679497af045a. Its live execution tool list remains empty pending a qualified adapter. The supplied126-page PDF is evidence of capability claims and plans, not runtime authority. Active work on its default branch is preserved.

Full API verification69/69 passed, TypeScript passed, hosted verifier syntax and plugin checks passed. These acceptance denominators describe local scopes. Production hosting/OAuth, actual model-provider routing, physical audio devices, signing and sending, paid external actions, and a real OmniDev Docker host remain separate unverified gates.


## October 28 wave4: bounded OmniDev verification transport

Added optional `omnidev.job.verify` with strict input `{workspaceId, jobId, sourceDigest, candidateDigest, testManifestDigest}`. `workspaceId` is the actual OmniDev project. Job IDs accept UUIDs or existing `request-<64 lowercase hex>` identifiers. `mgr_omnidev_candidate_binding` retrieves only the current exact tuple and enrolled worker identity; it returns no source files or objective. ONE remains the approval/delegation authority. This operation runs only an explicitly enrolled approved MGR snapshot test; it does not generate code, apply a patch, publish Git changes or purchase inference.

The service principal must equal the outer gateway principal. Explicit configuration pins host ID, launcher/runtime SHA256 and qualification digest. The client independently reads and hashes the durable canonical JSON report and checks accepted assignment, exact input hashes, actual AppContainer token/capability/job receipt and verified cleanup. Accepted failed tests have a verified failure report; this never changes their status to success. `mgr_department_artifact` can download that exact canonical report for accepted succeeded/failed tests. Unknown, cancelled and pre-admission failures have no invented report.

`currentBindingVerified` is separate from `readbackVerified`: a valid historical executed snapshot can remain durable after project edits while its current applicability is false. The host must require both for a current-workspace success claim. Queued cancellation and running cancellation requests remain distinct. Lost POST acknowledgments require GET reconciliation; the transport never automatically repeats an execution. Response bytes are capped at 1 MiB, UTF8 is decoded strictly, JSON nesting is bounded at64, and the entire headers/body operation has a deadline with active stream cancellation.

Configure production transport only explicitly with `OMNIDEV_ENABLED=true`, `OMNIDEV_BASE_URL`, `OMNIDEV_SERVICE_TOKEN`, matching service actor/tenant and `OMNIDEV_EXPECTED_POLICY_JSON` (the four identity fields). The local lab launcher accepts an optional fourth argument after runtime directory and ONE directory: an owner-protected engineering JSON configuration containing baseUrl, engineeringToken, actorId, tenantId and workerPolicy. It projects only enrolled identity fields into ONE and MCP; no credential is logged or included in a URL. Existing four departments remain configured independently.

Protocol verification:20 focused tests pass, including denial, exact readback, failed report artifact, lost acknowledgment, historical drift, cancellation states, malformed UTF8, depth/byte budgets, hung body cancellation and authorization expiry. These tests use injected HTTP responses to exercise contract boundaries; they are not actual worker execution proof. The separate wave4 end-to-end acceptance must exercise the actual SQLite service, approved OS worker and ONE/MCP path before that integration is marked verified.

Catalog discovery now includes21 entries:19 source-pinned snapshots and two explicitly empty public repositories, MGR-OMNISIGHT and MGR-CODE-MONSTER. The latter carry no fabricated commit or executable tools; the owner reports active construction by another builder. Their source remains unavailable and runtime unverified.

Wave4 API regression checkpoint:89/89 full tests passed (the20 focused Omni tests are included), TypeScript passed and repository integrity172/172 passed. These denominators do not include the separately pending live ONE/service/OS-worker acceptance.
