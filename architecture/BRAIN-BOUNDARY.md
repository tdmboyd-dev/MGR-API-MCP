# Brain / Center of Intelligence Boundary

## Decision
The portable Brain runtime belongs inside MGR-API-MCP for now, not in a new standalone repository.

## Brain is
- deterministic routing and policy inputs
- DecisionEngine/Jev bounded decisions
- memory and retrieval
- provider/model selection requests
- generative planning fallback
- evaluation and feedback
- decision/task receipts

## Brain is not
- permissions or authorization
- direct secret ownership
- a media renderer
- Creation OS
- one fine-tuned model
- a dataset
- OMEGA Ki
- an iKickItz avatar

## Execution boundary
Brain proposes -> policy/Action Sentinel evaluates -> approval if required -> executor acts -> receipt/reconciliation.

## Integration
MGR Agents, TIME, HEIRLOOM and apps call typed Brain/API contracts.
Brain calls Creation OS for creation-domain capabilities.
MCP is one transport into the same Task engine, not a second brain.

## Future extraction gate
Create a standalone Brain service/repo only when independent scaling/deployment and stable multi-product contracts make extraction simpler than this shared edge.
