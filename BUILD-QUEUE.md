# Research-to-build queue

The unified assistant remains the goal. MGR-API-MCP is now the designated home; do not ask the user to choose it again.

1. Finish free-community collection: carousel skill, editable brand template, remaining n8n workflows and linked workflow library, voice resources, new lesson attachments and videos. Preserve access/reading boundaries.
2. Complete the 111-page TypeSafe snapshot, compare the newly captured index, finish SDK tests/build/release/docs inspection and upstream test execution in an isolated checkout. Recheck exact models, API contracts and price claims with official provider sources.
3. Finish strategic Zubair source trees and asset/dependency license reviews. Most snapshots are still unread. Public repo metadata alone does not clear reuse.
4. Compare durable task execution, local retrieval, voice and Windows tools using official source, standards, model cards, papers, test harnesses, maintenance and real failure reports. Record costs and hardware constraints.
5. Turn architecture/DECISIONS.md into complete typed contracts, persistent schema, provider/tool interfaces, failure-state transitions and executable acceptance criteria. Preserve one shared system.
6. Build the actual engine, memory, research/coding flows and interface together with failure recovery; only then add optional phone/content/sensor surfaces through shared contracts.
7. Add and verify ChatGPT MCP and independent model-provider paths separately. Credentials use secure configuration; no secrets in chat or repository.
8. Run whole journeys, malformed inputs, cancellation, duplicates, concurrent work, restart/backup restore, budget limits and external reconciliation. Label synthetic, local, provider/device and production evidence separately.

Finished paid JARVIS/TARS/SPARK and level-locked materials remain unavailable; they are not required dependencies for independent development. The present wave did not purchase anything, send email, make a call or expose a local service.


## Brain / shared-edge migration wave — added 2026-09-29
9. Define portable Brain controller contracts inside this repo: DecisionRequest/DecisionRecord, RetrievalRequest, ControllerPlan, ToolRecommendation and EvalResult. Brain is model-independent.
10. Build an adapter from MGR Agents' existing Brain pre-router into these contracts without changing execution authorization.
11. Move bounded routing toward deterministic policy -> DecisionEngine/Jev -> economical controller -> frontier escalation; preserve tool allowlists at every step.
12. Add protected evaluation harnesses inspired by BFCL V4, ToolSandbox, tau3-bench and LongMemEval-V2 before any fine-tuned controller is promoted.
13. Add Action Sentinel/Approval/Receipt integration. Brain may propose actions but may not authorize itself.
14. Add Secret Broker references so tools receive scoped grants rather than raw long-lived credentials.
15. Implement OpenTelemetry-compatible Task -> Decision -> ToolCall -> ProviderCall -> Artifact/Receipt traces.
16. Keep Creation OS media/identity/rights/factory logic behind capability calls. Do not copy those systems here.
17. Add API/MCP deployment surface only after local Task/Job contracts and restart/idempotency tests pass.
18. Use `architecture/SERVICE-TOPOLOGY.md` for deployment/domain decisions; repo count never implies public-domain count.

## Backwards–Forwards HTTP boundary research — 2026-09-29
19. [R] Reconcile `src/mcp-http.ts`, `src/http-auth.ts`, metadata and tests against the 2025-11-25 MCP authorization/transport requirements in [MCP HTTP research](research/MCP-HTTP-AUTH-BOUNDARY-2026-09-29.md). The existing web handler does not invoke the separate authorization primitive.
20. [ ] Research an exact authorization server/SDK/host combination and its cost/license; then implement request authentication, actor/tenant binding, forbidden token passthrough, durable idempotency and failing-path HTTP tests before exposing `/mcp` publicly.

## Legacy shared-system integration — added 2026-10-05

21. [x] Audit MGR Legacy and define the service boundary in `architecture/LEGACY-INTEGRATION.md`.
22. [x] Add typed `LegacyEdgeClient` for governed command dispatch and Truth Console reads.
23. [x] Add tests proving tenant, actor, correlation and idempotency propagation into Legacy calls.
24. [ ] Bind verified MCP HTTP auth context directly into `LegacyEdgeContext`; callers must not supply tenant/actor identity independently.
25. [ ] Replace side-effecting MCP bootstrap tools with governed Legacy calls where the capability is business-domain state.
26. [ ] Preserve Action Sentinel as an edge guard, but make Legacy the final business authorization/approval authority.
27. [ ] Return Legacy event/receipt/correlation evidence in MCP results.
28. [ ] Add Legacy capability/connector discovery as MCP tools/resources without duplicating registries.
29. [ ] Route creation-domain capabilities through Creation OS and return artifact/evidence references.
30. [ ] Add cross-service idempotency, restart, timeout, duplicate-delivery and reconciliation tests.
31. [ ] Reconcile the in-memory Task/Job/Approval/Receipt engine so it remains edge/session orchestration only; it must not become a duplicate business system of record.
32. [ ] Harden remote `/mcp` authentication: wire `authorizeMcpRequest` into the HTTP handler before public exposure.
33. [ ] Verify a hosted ChatGPT MCP session only after authenticated Legacy dispatch and durable receipt evidence pass end to end.
