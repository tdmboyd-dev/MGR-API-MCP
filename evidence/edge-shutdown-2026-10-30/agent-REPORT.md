# Shared authenticated edge terminal admission and finite request ownership

Date2026-10-30. Isolated source packet work/next-api-shutdown. Parent owns canonical application/testing/publication. Prior b3 TCP packet/foundation in work/next-api-loopback remains unchanged. No .backpack/runner receipt contents read/copied/modified; no Git mutation or provider/account/native process action by this lane.

## Exact source scope

Only2paths: src/mcp-http.ts BEFOREb2dc9e8edf820bf7e287807111f460599ad1c2291970b01c4546e979d1fe79ce →AFTERb4f45113514173b4faa5cf7d89299259031cf3a3b7b5f1275706e4b56e177221; NEW test/edge-shutdown.test.ts847b3e06326deca4ae364d0e7a889f5464bfbea36188d8ee6a7bbfdfac0a4155. changed-files.json/task-only.patch/frozen/ contain onlythese2taskpaths. Baseline33tracked source/package/lock/tsconfig inputs and read-only existing dependency junction; no install/build/shared output. Final readback canonicalHEAD3728df92c694329a7615b0fdab63523611689130 (parent's new firstAPIcheckpoint), all33input hashes unchanged, all isolated unowned inputs unchanged. b3TCP test copy hashb3fce3c5 unchanged.

## Actual defect and bounded repair

The outer authenticated factory had no terminal admission state. A valid Request submitted AFTER awaitclose returned200; a Request awaiting verifier auth could construct/dispatch a fresh MCP server after close completed. The official inner SDK already rejects fetch on a closed inner handler, but the outer factory could create a NEW one. This is an actual lifecycle fence defect, not a speculative SDK.close failure or provider retry incident.

The fixed wrapper sets a sticky closed flag synchronously at close entry BEFOREawait; fetch denies both before authentication and immediately after authentication/before SDKconstruction (including final pre-construction fence). Both closed and overloaded requests return fixed503 JSON {error:MCP service unavailable}, no private context or alternate permission path. A closed wrapper cannot reopen; a separate genuine wrapper remains usable.

The pinned SDK creates subscription/inflight state PERcreateMcpHandler. The actual application makes a new handler per request, so its per-handler subscription cap is NOT an outer process-wide admission cap. Added a fixed64 outer admitted-request budget with host option maximumPendingRequests that may only LOWER to integer1..64; missingundefined defaults64, null/boolean/nonfinite/fraction/out-of-range rejects. Reservation is synchronous BEFOREauthenticationawait; it covers held verification, actualSDK/tool handling and confirmed local handler cleanup. Ordinary auth denial/exception releases only its own reservation. Overload denies before auth/server construction, never evicts/retries an admitted request. No new registry, database, permission engine or queue.

Per-handler close promises coalesce concurrent request/global cleanup. A handler leaves the existing ownership Set and releases its slot only after the required SDK close promise resolves. Rejected/unconfirmed cleanup retains its exact reference and budget slot; an explicit later globalclose may retry LOCAL cleanup only. No SDKclose-failure was invented or monkeypatched to claim a real leak; this preservation branch is source-reviewed conservative policy. Existing domain authorization, identities/scopes, risk floors and postawait checks are unchanged.

## Private pending-auth and shutdown truth

close DOESNOT await/cancel an unresolved verifier promise: the AccessTokenVerifier interface has no cancellation/stop acknowledgment. It immediately stops new admission, and an already pending auth decision is denied503 after it eventually resolves and releases its own reservation. A never-settling verifier remains private pending work, not falsely stopped or deleted. Cap64 prevents additional admitted verification/handler growth while open; terminalclosed then denies allnewrequests. No timeout-based reset/autoretry/remote cancellation or stopped/healthy receipt was added.

This is wrapper auth/handler admission, NOT Node HTTP ingress/body/socket/OS memory/concurrency containment. Normal http-server.ts reads the request body before invoking this wrapper; that boundary retains its own existing limits. A resolved SDK.close is not independent proof that accepted domain effects stopped/reconciled or every hidden SDK resource ended. Admitted pre-close work retains its original domain outcome/uncertainty contract; this packet does not cancel effects or redefine successful historical receipts.

The preexisting public http-server shutdown awaits mcp.close BEFORE closing the listener and scheduling its10second fallbacktimer. A never-settling SDKclose can therefore prevent those latersteps. This remains an explicit ordinary host-shutdown residual; this packet does NOT claim bounded whole-process shutdown. No liveCLI/signals/process termination test ran. GlobalSDKclosefailure/retry/error telemetry and wider field/ledger/operational acceptance remain separate.

## Meaningful RED/GREEN

Initial maintained2 socket-free tests on actual BEFOREsource failed200vs503, exit1, evidence/before-red.txt. Real SDKserver construction is observed with a forwarding registerTool spy; no fabricated close failure or business effect is injected. Originalnoauthorizationsourcehash is preserved at evidence/mcp-http.before.ts.

For exact current test-custody proof, FINALtestbytes were copied beside the preserved BEFOREsource plus identical foundation modules under evidence/old-source-control. `node --import tsx --test --test-name-pattern='closed authenticated edge|authentication released' evidence/old-source-control/test/edge-shutdown.test.ts` =>2actualRED200vs503, exit1 (final-tests-old-source-red.txt). SAME2named tests/finaltestbytes against current source =>2/2PASS1158.9342ms, exit0 (final-tests-current-source-green.txt). This is actual Request/Response behavior, no socket/server/provider.

Current dedicated8checks cover: closed before verifier/construction; auth released after completedclose;64heldauthrequests plus65thdenial then exact originaldrain; lower2budget/invalidauth release; actualreal SDKtools held through Legacy fetcher fixture plusoverload denial; repeated/concurrentstickyclose +independentwrapper; invalidhostlimits; realverifierexception releasesreservation withoutdomainretry. Counted64 controlledmemory Requests, not64TCPconnections or deployedclients. Legacy callback fixture is in-memory only.

## Executed qualification

1. `node --import tsx --test test/edge-shutdown.test.ts` =>8/8PASS0fail/cancel/skip992.2485ms (focused-final.txt). This preceded ONLY2test `this:McpServer` annotations; runtimeb4unchanged. Current exact40selection below qualifies finaltestbytes.
2. `node --import tsx --test test/edge-shutdown.test.ts test/edge-tcp-loopback.test.ts test/jwt-verifier.test.ts test/mcp-http.test.ts test/legacy-event-read.test.ts` =>40/40PASS0fail/cancel/skip3658.2524ms, exit0, affected-refrozen-final.txt.8new+32prior related/b3aggregate scopes; do not add to previous128API or27PG chain as disjoint whole-product counts.
3. `node node_modules/typescript/bin/tsc --noEmit` =>exit0, typecheck-refrozen-final.txt. Prior actual TS2683 missingthis annotation in2test spies is retained in typecheck-before-annotation.txt; annotation-only correction and earlier test bytes retained, no assertion weakening. Initialruntime40/40onoldannotations remains separate historical proof.
4. final-tests exact2RED/GREEN above are independently named to avoid claiming sourceobservation exit0 was a failing regression.
5. packet.mjs readback =>33baseline inputs0drift/unowned0drift, exact2sourcehashes and unchanged b3TCP fixture. Parent concurrently published itsfirstAPIcheckpoint; that changesHEAD but doesnotchange these33runtime inputs.

The40selection includes existing actual ownedTCP/JWKS/b3fixture, not an outside network service or configuration change. Its cleanup/egress receipt still reports38ownedfetches/0outsideattempts AFTERallcleanup, listenersclosed/globalfetchrestored. The8newtests themselves use pure in-memory Requests/SDK and synthetic verified principals, not external JWTaccount/provider authority. Ephemeral mockdata and previous realPG27chain scopes remain distinct.

## Integration and acceptance

Parent compares exact BEFOREb2dc with canonical, applies ONLY2taskpaths, runs typecheck/fullAPI verification/security/readbacks and updates the existing root handoff/queue/scorecard after actual qualified outcome. New test is automatically discovered by test/*.test.ts. Peer independent source review reports no blocking defect within this exact narrow scope; no self-acceptance/packageclosure. Preserve failedhandle references/unknown outcomes instead of clearing them just to claim zero. No publicTLS/JWKSprovider/production/whole-product acceptance follows.
