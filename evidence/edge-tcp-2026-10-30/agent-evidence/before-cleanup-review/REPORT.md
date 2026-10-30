# Actual shared MCP edge over owned loopback TCP

Date2026-10-30. Proposal-only isolated lane `work/next-api-loopback`. Canonical MGR-API-MCP remains unchanged on repair/completion-2026-10-28, HEAD f8113d6d002ca11a69e0aab29a2ee2516c833aa3. No commit/push/checkouts/resets or canonical source/config/docs changes. Untracked .backpack/ and runner receipts were not opened, copied or changed.

## Result

YES: the EXISTING authenticated edge handler can be exercised by the official MCP client over actual owned loopback TCP using current locked dependencies, real cryptographic local JWKS verification and explicit synthetic actor/tenant/scope fixtures. No architecture change, new production API, permission engine, second domain store or provider account is necessary for this bounded local proof.

New proposal is ONLY test/edge-tcp-loopback.test.ts, SHA256141519cd47e84455e2ae5c7ccf26c2f32ffc65e81e053ed4dfc720a07a208fa5. changed-files.json and task-only.patch cover that one new file; copied foundation source/tests are NOT proposed source changes.

Three ephemeral servers bind explicitly127.0.0.1: edge TCP adapter forwards Requests to actual createAuthorizedMgrMcpHttpHandler; local JWKS serves ephemeral public key; synthetic Legacy HTTP fixture enforces its known service bearer, actor/tenant, selected scope and mutable grant before returning an inert read-only event page. The actual copied JwksAccessTokenVerifier uses jose remote-JWKS cryptographic signature/issuer/audience/expiry verification. The actual LegacyEdgeClient uses its DEFAULT fetch over TCP. Official SDK StreamableHTTPClientTransport uses its DEFAULT network fetch, NOT an injected handler/fetch callback. The test-only Node bridge is equivalent to the existing HTTP-server Request/Response forwarding boundary; it does not claim the environment-configured public src/http-server.ts process was deployed or launched.

The harness installs an observation/egress-denial wrapper around global fetch: it admits ONLY the3allocated fixture origins and delegates unchanged to the actual original network fetch. It never synthesizes responses or rewrites credentials. Final source records38 observed fetches,29edge requests,1JWKS request,8synthetic domain GETs,0unowned/outside HTTP fetch attempts. This is observed fixed-fixture HTTP behavior, not a machine-wide packet capture or assertion about unrelated applications. No DNS to public host, real provider/model call, deploy, installer, external service write or real tenant credential was used.

## Acceptance actually executed

Dedicated test run: `node --import tsx --test test/edge-tcp-loopback.test.ts` =>12/12PASS0fail/cancel/skip4074.3581ms, exit0; evidence/tcp-refrozen-final.txt. Count includes11acceptance subtests plus1parent aggregate; do not call it12independent journeys.

1. Actual TCP missing bearer, wrong audience and expired signed token =>401before any domain request, with valid challenge.
2. Official client initialize/listTools advertises real mgr_legacy_events without domain fetch.
3. Actual default LegacyEdgeClient HTTP transmits exact actor/tenant/GET/path, page cursor and next cursor; exact Unicode survives both network boundaries.
4. Strict tool schema denies caller identity override without domain contact.
5. Missing additional legacy:events:read scope denies before domain contact.
6. Signed alternate actor/tenant cannot borrow the fixture domain's separate principal grant.
7. Withdrawn fixture domain grant returns failure through actual MCP TCP.
8. Wrong domain page identity is withheld, without private event content.
9. Malformed real domain UTF8 is rejected across bothHTTP boundaries.
10. Expiry while downstream TCP is held withholds the later result (no result publication/retry claim).
11. Actual per-origin/request observations match only owned loopback, outside attempts0.

Cleanup assertions after finally: all3server listeners closed, handler/client close attempted, global fetch restored. Explicit cleanup receipt is in final log. This is owned listener/handler cleanup, not physical worker/process termination proof. No child service/worker/process was spawned by this harness.

Affected selection: `node --import tsx --test test/edge-tcp-loopback.test.ts test/jwt-verifier.test.ts test/mcp-http.test.ts test/legacy-event-read.test.ts` =>29/29PASS0fail/cancel/skip3989.2093ms, exit0, evidence/affected-final.txt. This includes new12aggregate/subtests plus17existing related checks; not additive with previous113API or27chain scopes. Actual copied-source `node node_modules/typescript/bin/tsc --noEmit` =>exit0, evidence/typecheck-final.txt. No shared dist/build output was emitted.

## First failure preserved and corrected fixture

First-run log evidence/first-run.txt:10pass/2fail (one failing subtest plus parent), because raw401challenge returned503. Root cause was harness using HTTP resourceMetadataUrl. Existing buildWwwAuthenticate deliberately requires HTTPS metadata; it threw before challenge creation. Corrected ONLY advertised fixture metadata to a valid unused https://owned-edge.fixture.invalid URL, matching existing repository test policy. That URL is NEVER fetched (egress gate would deny); actual audience/transport/JWKS remain explicit localhost HTTP. No production TLS/audience/issuer/SSRF/certificate rule or product source changed. This was a fixture correction, not a repaired production auth defect. The passing TCP proof must not be labeled public HTTPS/OAuth-host proof.

## Exact baseline and readback

baseline-source.json pins33tracked source/package/lock/tsconfig inputs copied from canonical. evidence/final-readback.json independently compares each copied input and canonical source against those BEFORE hashes:0drift; canonical tracked diff empty; HEAD still f8113d6. The3copied existing tests have exact source hashes recorded too. node_modules is an existing dependency junction treated read-only; no install or dependency changes.

Installed/locked proof versions: official client2.1.0, server2.1.0; jose6.2.13; tsx4.23.15; TypeScript6.0.3; zod4.6.5. No external version discovery/update is claimed. The lock and installed metadata remain pinned to this local source snapshot.

Read source/authority scope: repo AGENTS; root HANDOFF and both ecosystem AI/HUMAN supporting handoffs; BUILD-QUEUE/current scorecard; portable voice and BEAST working contract; actual mcp-http/http-auth/jwt-verifier/oauth-metadata and Legacy event-read/client transport; actual mcp-server registration/consumer and normal HTTP forwarding; existing local-department-edge and official client/JWKS/event tests/scripts. Supporting handoffs retain old dated54/100/1453counts; root current checkpoint/actual source govern this proposal. No fresh full strategic-source/library/license/283-child audit is claimed.

## How parent can integrate

Compare canonical HEAD/foundation hashes, apply ONLY the new test via task-only.patch, then run its direct command and affected selection using the existing locked dependencies; it is automatically discoverable by existing test/*.test.ts npm script once applied. Parent may replace the synthetic domain fixture with the actual existing PostgreSQL-backed Legacy27chain host in a separate joined harness, preserving its tenant-grant/cursor/signature/database/cleanup proof. This packet does NOT edit or invalidate that PG chain and should not silently relabel it a TCP edge run.

## Remaining acceptance

This closes only the missing actual edge TCP/JWKS/official client local proof. Synthetic Legacy HTTP is not actual Legacy PostgreSQL persistence, field authority, real tenant enrollment/grants or business effects; those are proven only by their own exact domain/27chain receipts. No public TLS/Render/Auth0 account/JWKS provider discovery/PKCE/ChatGPT hosted session, real token entitlement, production deployment, model/service/device behavior, signing/sending or broad load/operational acceptance is established. ONE remains conversation/approval owner; API-MCP remains shared transport; Legacy owns business records and receipts. No new production cursor/event database or permission fabric was added.
