# Universal MCP + Cost-Aware Model Routing

## Decision

MGR-API-MCP is client-neutral. ChatGPT is one client, not the architecture owner. The remote MCP endpoint must remain standards-based so other MCP-capable AI clients can connect without duplicating business logic.

## Two model layers

1. **Host model** — the model selected by ChatGPT, Claude, Codex, or another MCP client. MGR does not silently control this model.
2. **MGR downstream model router** — models MGR itself calls for classification, extraction, research, coding, planning, reasoning, multimodal work, or tool-using subwork.

The downstream router should choose the cheapest eligible model, then escalate only when quality, risk, tools, latency, or provider-health policy requires it.

## Routing inputs

- task class
- risk level
- minimum quality
- maximum cost tier
- tool requirement
- latency preference
- provider exclusions / outage state
- tenant budget policy
- evaluation history

## Safety boundary

Model selection never grants execution authority. Brain/Jev/model routing may select or recommend a model, but deterministic policy, Action Sentinel, approvals, scopes, and Legacy receipt authority remain separate.

## Pricing

Do not hard-code provider prices in routing source. Maintain price/capability observations as versioned provider metadata with source + observed date. Routing consumes normalized cost ranks/budgets so provider pricing can change without rewriting policy.
