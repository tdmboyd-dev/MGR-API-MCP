# Normal HTTP owner shutdown — isolated packet

Date2026-10-30. Parent owns canonical application/qualification/publication. No canonical/Git edits, real signal, host process exit/OS kill, account/provider action or machine/service startup was performed. Earlier b3TCP and b4authenticated-wrapper packets remain frozen. This packet depends on canonical b4wrapper; it does not replace its admission/unknown-outcome rules.

## Exact files and baseline

NEW src/http-shutdown.ts44dfbe4670391f189b9932883a5c50f8025c06d553aad4eebc79ea0aff88f55a.

src/http-server.ts BEFOREf150e44d6c7777ff853dcf06626e5d88cf84422c429fbc34ea9f8fa151e36972 →AFTER5a02d0a1889ebe0d45e103fd12786da758553c6e9035a0b888c7b0f2d6f91ac3.

NEW test/http-shutdown.test.ts9bf650641d98b0ef9f47bcac31004d7ceb7b2f35e36923cde8cf89fe3bf24fcc.

changed-files.json/task-only.patch/frozen contain ONLYthese3taskpaths.33tracked foundation inputs and26copied existing tests have0canonical/unowned/copydrift. Existing mcp-http remains b4f45113. Final readback canonicalHEAD4be702f29b56c8ce69adb8a1c66d83f65dd22912 (parent checkpoint); no assumption that a metadata commit changed runtime. node_modules junction treated read-only; no package install/shared build emission. .backpack/runner receipt contents untouched/unread.

## Problem and actual implementation

The old normal HTTP source awaited mcp.close BEFORE server.close and BEFORE scheduling its unref fallback timer. A hanging/rejecting handler could therefore skip listener cleanup/deadline. Normal SDKhangs were NOT observed; failure cases below deliberately inject owned failures, rather than presenting an invented production incident.

A fixed owned controller is NOW actually composed once by normal http-server.ts, beforelisten, with the SAME exact server/mcp. Both SIGTERM/SIGINT call its one shared operation. A sticky closing flag is set synchronously. After unchanged Host/Origin checks and BEFOREhealth-success/bodyreading/MCPdispatch, the actual requestcallback returns static503 {error:MCP service unavailable} whileclosing. No new executable, permission engine, account, retry or transport configuration.

A referenced10000ms deadline is installed BEFOREeither potentially failing close call. Initial process exit state is conservatively1. Listenerclose and handlerclose both start in the SAMEturn withoutawaiting either or deferring handlerclose to a later microtask. Synchronous throws, rejectedpromises, bothfailures and even reject(undefined) remain failures, not successful acknowledgments. Only bothconfirmedclosure with no owned failures allows requestedexit0. Repeatedsignals share the exactsame promise and cannot resetdeadline/reopenadmission.

Atdeadline the exact owned server's closeAllConnections is attempted, uncertainty is preserved and exit1 requested even if forceclose throws. Latecompletion cannot change a timed-out result or emit a laterexit0; actual lateerror causes remain privately available once. Successfulorfailedcompletedcleanup clearsdeadline; otherwise deadline remains referenced. Static event-only diagnostics exclude rawprovidererrors/JWTs/paths/payloads. failureCauses() is a trusted owner-only diagnostic closure (no route/serialization); actual Errorobjects are preserved. A host exit callback is a REQUEST, not proof that a process/provider/accepted effect stopped.

## Executed proof and exact scope

Focused current tests derive from11checks covering both completion orders; referenceddeadline with never-settling handler; sync listener/handlerthrows; both callbackfailure+async rejection; undefinedrejection; deadline+forceclosethrow+lateoutcome; failedtimerref; loggingfailure/privatecause; actual normal-entrypoint composition/gate.

The actual normal HTTP source is transpiled and executed in a controlled VM with FIXED trusted dependency stubs. Its realcontroller implementation is used with owned clock/exit fixtures. The actual source's createServer/listen/process.on are captured, NOT real socket binding/signals/process.exit. Real requestcallback is then invoked: health200beforeclose; aftercapturedSIGTERM health/body503; wrongHost421 and wrongOrigin403preserved;0bodyreads/0MCPcalls; bothrequiredclosure acknowledgments then requestedexit0once. This proves actual maincomposition and gate ordering, not a real OSprocess shutdown.

For meaningful BEFOREcharacterization, EXACTFINALtest bytes were copied beside exactoldmainf150 with identicalotherfoundations. `node --import tsx --test --test-name-pattern='actual normal HTTP entrypoint' evidence/old-main-control/test/http-shutdown.test.ts` =>actual1REDhealth200instead503, exit1 (final-test-old-main-red.txt). The handler's pendingclose is an explicitly controlled fixture, not an observed SDKhang. SAMEtest/finalbytes/currentmain =>1/1PASS1333.0595ms, exit0 (final-test-current-main-green.txt). No private data/realprocess/resource action is involved.

`node --import tsx --test test/http-shutdown.test.ts` =>11/11PASS1449.1503ms, focused-final.txt. This preceded ONLYthetest VMoption type correction described below; final fullsuite qualifies currenttuple.

`node --import tsx --test test/*.test.ts` =>147/147PASS0fail/cancel/skip5422.7166ms, exit0, evidence/full-api-refrozen-final.txt.11new+136existing source-scoped API checks; not additive with oldproofs or whole-product acceptance.

`node node_modules/typescript/bin/tsc --noEmit` =>exit0, evidence/typecheck-refrozen-final.txt. Initial actual TS2353 indicated VM runInNewContext uses contextCodeGeneration ratherthancreateContext's codeGeneration; onlytestoption corrected, rawfailure/previoustest retained in evidence/typecheck-before-vm-option.txt and test-before-vm-option.ts. No assertion or productionpolicy weakened. Earlier147run7677.9899ms retains its earlier testoption scope.

Finalreadback evidence/final-readback.json and packet.mjs verify exact3hashes and33baseline/26existingtest inputs0drift. No tests qualified real process.signal/exit, SDKnormalhangs or externalstop. Existing fullsuite includes its prior owned loopback/JWKS/SDK fixtures; the NEW11controller tests create no listener, nativeprocess or provider request.

## Remaining acceptance / integration

Parent independently reviews all3paths, compares BEFOREf150 and b4dependency, selectively applies, runs canonical fullverification/security/source readback, then updates the existing APIhandoff/queue/scorecard. Peer memory_audit assigned currenttuple review; finaldisposition not assumed beforetheirread. New test is automatically discovered by current test/*.test.ts.

This repairs bounded local HTTP cleanup ORDER, deadline ownership, gate and requestedexitstate. It DOESNOT establish physical process termination, everySDKhiddenresource stopped, privatependingauth cancellation, descendantcleanup or accepted domain-effect stop/reconciliation. Wrapperclose may still leave private authpending untilits verifier resolves; SDKclosepromise is its own contract. Edge session-state is not an authoritative business receipt. No automatic commandretry/recovery, remoteabort, failedhandledeletion or newpersistentledger added. Wholeprocess/targetOS/publicTLS/provider/hostedMCP/productionacceptance remain separate. Actualcontrolledchildprocess/signals acceptance would need a later explicitly scoped fixture; do not run an owner's livehost just to refresh counts.
