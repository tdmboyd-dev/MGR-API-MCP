# Architecture decisions and open comparisons

These are design constraints from the owner's request and inspected evidence, not implemented features.

| ID | Decision | Reason / evidence | State |
|---|---|---|---|
| A01 | One shared task engine for chat, voice, research, coding and optional domain workflows | Avoid separate state, approval and receipt systems; community merge review | Direction accepted from user scope; contracts pending |
| A02 | Separate provider reasoning/routing from deterministic authorization/execution | Jev scores cannot authorize actions; SDK probes and community review | Required invariant |
| A03 | Executor receipts bind exact action, task, inputs, account and outcome | Unrelated receipts must never support success claims | Contract pending |
| A04 | Stable source/revision/chunk identities; graph is a view | Brain Map uses snapshot/index IDs, not durable memory | Contract pending |
| A05 | Optional phone/content/screen capabilities use the same shared engine | New mobile pack adds replay, dedupe and authentication requirements | Interfaces pending; no accounts connected |
| A06 | Direct API providers and ChatGPT MCP are distinct integration paths | A model SDK does not prove host MCP interoperability | Host validation pending |
| A07 | Local-first persistent catalog; SQLite is a candidate, not a locked dependency | Official WAL constraints reviewed in research/2026-09-28-REVIEW.md | Compare, then measure |
| A08 | Public knowledge repository with local original-source archive | Remote is public; community redistribution rights unresolved | Implemented repository layout |

The next specification must cover Task, Job, ToolCapability, ProviderCapability, Approval, ExecutionAttempt, Receipt, SourceRevision, MemoryChunk, Artifact, Budget, Schedule and Reconciliation. Define allowed state transitions and recovery before creating UI surfaces.

Acceptance gates: an unauthorized action never dispatches; an altered approved payload cannot reuse approval; duplicate delivery cannot silently repeat; cancellation prevents new dispatch but preserves already accepted external results; restart resumes durable work without inventing outcomes; retrieval points to the exact source version; budget exhaustion stops further spend; unknown external state is reconciled before retry; adapters preserve provider-specific features and failures. These gates are not passed until executed against an implementation.
