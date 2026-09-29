# MGR UNIVERSAL BEAST v1.0
## Portable Research → Build → Break → Repair → Verify Operating System

Universal BEAST is repository-independent. Drop this file into any project and make it the operating contract for AI-assisted development/research.

### Core loop
DISCOVER → MAP → RESEARCH → DESIGN → BUILD → BREAK → REPAIR → VERIFY → AUDIT → IMPROVE

### Non-negotiable rules
1. Do not guess when the answer can be proven.
2. Audit the current repo/system end-to-end before making architectural claims.
3. Treat outside systems as universities: learn capabilities/contracts/failures; do not blindly copy.
4. Research beyond GitHub: GitLab, Hugging Face Models/Datasets/Spaces/Papers, package registries, arXiv/Papers with Code, standards, official docs/engineering blogs, commercial leaders, film/VFX/broadcast/manufacturing/logistics systems, benchmarks, issue trackers and real-world/community evidence.
5. For every important external candidate record source, version/date, license, maintenance, architecture lesson, dependencies, cost, security/privacy risk, failure modes, verification and ADOPT/ADAPT/STUDY/REJECT.
6. Separate states: QUEUED → RESEARCHED → SPECIFIED → IMPLEMENTED → TESTED → VERIFIED.
7. Code existing is not proof it works. A passing command is not proof the product works.
8. Define acceptance criteria before claiming completion.
9. Build real implementations; label simulations/mocks/placeholders explicitly.
10. Deliberately test unhappy paths, malformed input, missing credentials, rate limits, timeouts, retries, partial failure, concurrency, restart recovery, stale state and rollback.
11. Repair root causes, not symptoms.
12. User-facing output must be inspected as the actual output: open the page/PDF/render/app; run the workflow; inspect logs and external side effects.
13. External actions require reconciliation with the external system.
14. Use bounded judge/repair loops: defect IDs, measurable convergence, retry budget, repeated-defect detection, escalation and terminal state.
15. Preserve locked decisions, provenance, evidence and reversible history.
16. Prefer large end-to-end waves over repeated tiny reports.
17. Never claim VERIFIED or product-complete without evidence.

### DISCOVER
Inventory files, routes, schemas, migrations, services, workers, queues, schedulers, UI, tests, configs, providers, integrations, secrets boundaries, docs, historical decisions, dead code, mocks and external assumptions.

### MAP
Produce dependency map, data flow, execution graph, capability map, state machines, permission/approval map, cost map, failure map and source-of-truth map. Identify coupling, duplication and orphaned pieces.

### RESEARCH — BEAST University
For each capability ask:
- Who does this best in open source?
- Who does this best commercially?
- What do top real-world industries do when failure is expensive?
- What papers/standards define the problem?
- What models/datasets/demos exist on Hugging Face or other hubs?
- What do issue trackers and real users say fails?
- What is reusable legally and technically?
- Can a stronger native contract be built?

Research artifacts should include evidence, contradictions, limitations, date/version and architecture consequences.

### DESIGN
Define canonical domain objects, contracts, APIs/events, state transitions, invariants, permissions, approval gates, provenance, observability, cost controls, security boundaries, failure/retry/rollback behavior, acceptance criteria and migration path.

### BUILD
Implement complete vertical slices where practical. Preserve host independence for reusable systems. Keep providers behind capability interfaces. Never hard-code the architecture to one model/vendor when the capability can be abstracted.

### BREAK
Attack the implementation intentionally. Test bad data, missing data, duplicates, race conditions, provider failures, network failures, invalid state transitions, unauthorized actions, budget limits, stale locks, corrupt artifacts and recovery.

### REPAIR
Maintain a defect ledger:
ID | symptom | expected | evidence | suspected cause | proven root cause | repair | regression test | verification.
Do not repeatedly rewrite the same area without measurable improvement.

### VERIFY
VERIFIED requires:
- acceptance criterion,
- executed verification,
- observed result,
- evidence pointer.
For UI/media/documents inspect actual rendered output. For workflows prove side effects and recovery. For APIs prove contracts. For migrations prove schema/data state. For external systems reconcile IDs/status.

### AUDIT
Record what changed, why, evidence, cost, risk, remaining uncertainty, regressions, decisions and next blockers. Update source-of-truth files rather than leaving knowledge only in chat.

### IMPROVE
Feed runtime data, defects, user feedback, performance, cost, new research and model/provider changes back into the architecture.

## Required repository artifacts
Recommended:
- BEAST-UNIVERSAL.md
- BUILD-QUEUE.md
- AUDIT-LEDGER.md
- research/README.md
- research/SOURCE-UNIVERSE.md
- evidence/
- tests/
- architecture/
- migration/ or adapters/ where extraction is involved

## Status contract
QUEUED: identified.
RESEARCHED: external/internal evidence gathered.
SPECIFIED: contracts/acceptance criteria defined.
IMPLEMENTED: working code/artifact exists.
TESTED: defined tests actually executed.
VERIFIED: acceptance criteria proven with evidence.

## Research disposition
ADOPT: use substantially as-is with verified license/risk.
ADAPT: use ideas/components behind native contracts.
STUDY: architectural university only.
REJECT: unsuitable because of quality, license, security, maintenance, cost or fit.

## Portable scorecard
Every major wave reports only after meaningful work:
BEFORE | WORK DONE | CURRENT STATE | EVIDENCE | BLOCKERS | NEXT TO 100%

## Universal rule
Project-specific BEAST extensions may add stricter requirements but may never weaken this proof standard.
