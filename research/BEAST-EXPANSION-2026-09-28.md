# BEAST expansion — shared API/MCP edge

Creation OS research identified a required shared agent/API layer. This repo remains the home for the portable assistant task engine and API/MCP edge; it must not duplicate Creation OS media, continuity, rights or asset domain logic.

## Required research/build tracks
1. MCP server + client contracts and capability discovery.
2. OAuth 2.1 authorization, PKCE, protected-resource metadata, audience/resource binding, short-lived tokens, rotation and anti-token-passthrough.
3. ToolCapability / ProviderCapability / Task / Job / ExecutionAttempt / Receipt / Approval / Budget / Schedule / Reconciliation typed contracts.
4. Independent Action Sentinel: reasoning proposes; deterministic policy authorizes.
5. Credential-blind Secret Broker integration.
6. Sandboxed execution bake-off: gVisor vs Firecracker vs managed sandbox by workload.
7. Durable execution bake-off and restart/replay/idempotency.
8. OpenTelemetry-compatible traces/metrics/logs and evidence receipts.
9. Privacy firewall before external providers.
10. Creative MCP surface that calls Creation OS capabilities instead of implementing media generation here.

## Cross-repo contract
MGR-API-MCP = portable assistant/API/MCP task edge.
MGR-CREATE-Os = creation/control-plane capabilities.
MGR-Agents/TIME/HEIRLOOM/apps = consumers/orchestrators.
Provider APIs remain replaceable adapters.

Research source of truth for the expanded capability matrix lives in MGR-CREATE-Os/research/BEAST-CAPABILITY-RESEARCH-MATRIX-2026-09-28.md.
