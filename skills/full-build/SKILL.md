---
name: full-build
description: Carry substantive build, repair, implementation and audit-to-fix requests through related authorized priorities, with end-to-end verification and a persistent evidence-based scorecard. Use for full-build mode or continuing unfinished project work; do not expand quick questions or explicitly narrow tasks.
---

# Full Build

Work through the requested priority and then the next related priorities already within the user's authorized scope. Completing item one is not the stopping point when related requested work remains. Preserve approved product decisions, designs, names and existing working features.

## Recover and define the work

- Verify the active repository, branch, working changes, applicable AGENTS.md, current decisions and handoff before edits. Preserve other work.
- Map the complete relevant scope: interfaces, implementation, consumers, APIs, permissions, persistence, assets, tests, operational dependencies and existing evidence. Read that scope in full, including requested source documents. Search locates files; snippets do not replace reading. Track what was read, unread or inaccessible. Do not claim a whole-repo audit from a partial scan.
- Create an ordered execution batch targeting 10–20 meaningful tasks when the work supports it. A task is a useful outcome, not a tool call or cosmetic edit. Do not pad the count, invent unrelated work or weaken verification to reach the target. Fewer substantial tasks are appropriate when complexity or scope requires them.
- Define observable acceptance checks before implementation. Preserve the user's priority when new discoveries arrive; track extra ideas without letting them displace the active objective.

## Execute the complete cycle

Build, repair, test, inspect, document and verify in the same work cycle. Move to the next authorized related item after each success. Do not end merely to report a small milestone or offer to continue work already requested.

For functional journeys, trace the action through UI, validation, loading/error/cancellation states, authorization, API/provider, saved result and reopening or second-account visibility where applicable. Check regressions that matter. Fix failures and rerun affected checks; avoid repetitive tests without new evidence to justify them.

For visual work, open the actual rendered result and compare it with the approved reference at matching sizes. Inspect desktop and relevant mobile orientations. Passing code tests does not prove visual fidelity. Generated concepts and installed artwork do not prove the page uses them correctly. Use the approved composition and assets rather than substituting an easier design.

Use relevant specialized skills and tools when they improve the outcome. This skill does not itself request subagents, model switches, new threads, deployments or new paid services.

## Continue or pause

Do not repeatedly request permission for ordinary reversible work already authorized. Continue independent work when one dependency is blocked. Pause dependent work for genuine authentication/access blocks, protected approvals, spending, contracts, destructive ambiguity, or a decision materially changing the product. State the exact blocker and the smallest concrete user action needed. Never bypass an access or approval block.

Do not stretch scope to avoid stopping after the requested work is actually done. Respect user stop/narrowing instructions and runtime/tool limits. If execution is interrupted, leave a precise resumable checkpoint; never imply work continues after the turn ends without an actual running mechanism.

## Persistent scorecard and handoff

Reuse the repository's scorecard if present. Otherwise create `docs/full-build/SCORECARD.md` and link it from the existing handoff or relevant project instructions. For work without a repository, use the task's persistent output folder. Start from [the scorecard template](assets/SCORECARD.template.md). Update the same file during the cycle and at handoff; retain dated before/after snapshots instead of resetting progress each session.

Record each meaningful outcome, before and after state, verified completion percentage, remaining percentage, evidence, blockers and next action. Track coded, integrated, runtime/CI verified, real provider/device verified and production verified separately. These states are not five equal percentage slices.

Percentages must have an explicit denominator: passed applicable acceptance checks divided by total applicable checks in that defined scope. Unknown checks remain unverified; unknown scope means `Unassessed`, not a made-up percentage. Record scope additions so progress changes are explainable. Do not call a whole page 100% because one repair is 100%. Any required failed/unverified check prevents completion; user-required visual acceptance stays open until obtained. These percentages describe acceptance coverage, not time remaining or profit/production readiness.

Close each cycle with concrete completed results, actual verification, remaining work, blockers and the next execution batch. Keep commentary concise while working. Show screenshots/artifacts when they are the evidence the user needs. Update handoff paths, current branch, ongoing services/test fixtures and cleanup status so the next session can continue without repeating discovery. Never save credentials in scorecards or handoffs.
