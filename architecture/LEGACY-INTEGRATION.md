# MGR API/MCP ↔ MGR Legacy Integration Boundary

Updated: 2026-10-05

## Decision

MGR-API-MCP is the shared **front door / switchboard / Brain edge** for MGR applications.

MGR Legacy is the shared **business system of record** for customer graph, CRM/work, workflows, communications, intelligence state, analytics, tax-pack shared data, receipts, audit, and governed mutations.

MGR Creation OS remains the **creation/control-plane engine** for media, web, image, video, 3D, and other creation-domain capabilities.

These are separate services with versioned contracts. Do not merge the entire ecosystem into one repository.

## Responsibility split

### MGR-API-MCP owns
- ChatGPT-facing MCP server and remote MCP HTTP edge
- authentication/token verification at the external edge
- actor/tenant binding from authenticated sessions
- Brain/Jev planning and bounded decision routing
- model/provider routing requests
- retrieval/context assembly for assistant tasks
- Action Sentinel pre-dispatch checks
- privacy filtering before external model/provider calls
- task/job orchestration at the assistant edge
- MCP tool discovery/registration
- cross-app command entrypoint
- optional local/mobile/voice device entrypoints

### MGR Legacy owns
- canonical tenant/scope/entity graph
- CRM/work records
- workflow definitions/runs/checkpoints/replay/dead letters
- approvals/governance/policy enforcement for business mutations
- Action Receipts and Truth Console business evidence
- communications state, consent, delivery, provider health/failover
- analytics/intelligence persistence
- Tax & Service Bureau Pack shared state
- extension/provider/connector registries used by business capabilities
- outbox/event ledger/audit/idempotency
- MGR Agents and MGR Elite Hub adoption/cutover authority

### Creation OS owns
- creation-domain execution
- media pipelines
- identity/continuity locks
- render/provider execution
- creation artifacts and acceptance evidence
- creation-specific retries/reconciliation

## Critical rule

MGR-API-MCP must never create a second authoritative copy of Legacy business state.

Its current in-memory Task/Job/Approval/Receipt engine is useful as an edge/runtime prototype, but business mutations must ultimately dispatch through Legacy API/SDK contracts.

Brain proposes → edge policy/auth checks → Legacy authorization/approval → Legacy command execution → Legacy Action Receipt/event/audit → result returns through API/MCP.

Creation requests follow:
Brain/API-MCP → governed Creation OS capability request → Creation OS executes → artifact/evidence result → API-MCP/Legacy records references as appropriate.

## Integration contract

Each API-MCP request that can mutate business state must carry:
- tenantId
- actorId
- correlationId
- idempotency key
- requested action
- target
- arguments
- edge scopes/audience
- risk
- approval reference when required

Legacy returns:
- accepted/blocked/failed state
- event ID
- Action Receipt ID
- correlation ID
- result/evidence refs
- approval requirement when applicable

## Do not duplicate

Do not independently reimplement these inside API-MCP:
- CRM tables
- workflow persistence
- communication history
- tax lifecycle storage
- action receipt source of truth
- provider health source of truth
- customer/entity graph
- business audit ledger

API-MCP may cache/read projections, but Legacy remains authoritative.

## Build sequence

1. Add a typed Legacy client to MGR-API-MCP.
2. Add tenant/actor/correlation propagation from MCP auth context into Legacy requests.
3. Convert side-effecting MCP tools into thin governed Legacy capability calls.
4. Keep read-only edge utilities local only where no authoritative state is duplicated.
5. Map API-MCP Action Sentinel outcomes into Legacy approval/policy requests instead of authorizing final business execution locally.
6. Return Legacy Action Receipt IDs through MCP tool results.
7. Add MCP tool/resource discovery backed by Legacy capability/connector registries.
8. Add Creation OS calls as separate governed capability routes.
9. Add restart/idempotency/reconciliation tests across the boundary.
10. Add live ChatGPT-hosted MCP verification only after auth + durable Legacy dispatch are proven.

## Completion gate

The integration is complete when a ChatGPT/MCP request can safely:
authenticate → bind actor/tenant → plan → select capability → obtain approval if needed → execute through Legacy or Creation OS → persist receipt/evidence → return a correlated result without duplicate authoritative state.
