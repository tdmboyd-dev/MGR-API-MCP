# Recursive BEAST Capability Research — Wave 2

Date: 2026-10-05

This file corrects the earlier platform-level pass. Each meaningful extracted feature is treated as its own research branch. Statuses are explicit: RESEARCHED means the branch has enough evidence to make an architecture decision; QUEUED means more end-to-end research is still required.

## A. Model routing / OmniRoute-derived branches

### A1. Cost-aware per-request model routing — RESEARCHED
Evidence compared: OmniRoute adaptive routing, LLMGateway routing, FLARE (ACL 2026), MTRouter (ACL 2026), ICLR routing/cascade work, production gateway practices.
Decision: BUILD MGR-NATIVE.
Requirements:
- route by task class, estimated input/output length, cost, latency, health, context fit and capability;
- preserve tenant budget ceilings;
- use cheapest adequate model, not cheapest absolute model;
- log an explainable routing receipt.

### A2. Resource-aware latency/cost estimation — RESEARCHED
FLARE reports meaningful cost/latency reductions from length/resource-aware routing.
Decision: BUILD MGR-NATIVE.
Add estimated prompt/output length and resource profile into scoring rather than static model tiers only.

### A3. Multi-turn routing — RESEARCHED
MTRouter shows multi-turn routing must consider conversation/task history, not classify each turn in isolation.
Decision: BUILD MGR-NATIVE.
Add task-history features, switching penalties and trajectory-level budget accounting.

### A4. Provider health / uptime / circuit breaker — RESEARCHED
OmniRoute and other gateways score recent failures/uptime and avoid unhealthy cheap providers.
Decision: BUILD MGR-NATIVE.
Use EWMA health, cooldown, circuit breaker and last-known-good state.

### A5. Quota-aware routing — RESEARCHED
OmniRoute uses provider quota/headroom as a routing signal.
Decision: BUILD MGR-NATIVE.
Normalize remaining quota and rate-limit headroom into provider metadata.

### A6. Cache-aware provider selection — RESEARCHED
Provider pricing can differ substantially once cached-input pricing is considered.
Decision: BUILD MGR-NATIVE.
Track cache-read/write prices and estimated hit rate; do not score only list input/output prices.

### A7. Prompt compression — RESEARCHED
2026 cache-aware prompt-compression research shows compression and caching interact; naive query-specific compression can destroy prefix cache value.
Decision: ADAPT as optional optimization, not mandatory preprocessing.
Build an evaluation-gated compression stage with cache-awareness and quality regression tests.

### A8. Semantic cache — RESEARCHED
Production gateways commonly use semantic caching to avoid duplicate calls.
Decision: BUILD MGR-NATIVE only for safe/repeatable classes.
Never cache tenant-sensitive or rapidly changing answers without strict scope/version keys.

### A9. Routing semantic quality feedback — RESEARCHED
Operational success is not semantic quality. A 200 response can still be poor.
Decision: BUILD MGR-NATIVE.
Separate provider health from quality eval history.

### A10. Universal OpenAI/Anthropic-compatible gateway — RESEARCHED
OmniRoute proves compatibility surfaces reduce adapter duplication.
Decision: ADAPT selectively.
MGR should own normalized provider contracts; compatibility endpoints are convenience surfaces, not the source of business authority.

## B. SmartWiz-derived tax branches

### B1. Tax document classification — RESEARCHED
Tax workflows require recognizing form type/year before extraction.
Decision: BUILD MGR-NATIVE.
Use form/year/version classifiers with schema-bound outputs.

### B2. Form-aware OCR / entity extraction — RESEARCHED
Google Document AI ships a pretrained W-2 processor; tax-document products distinguish generic OCR from form-aware extraction.
Decision: ADAPT providers behind MGR contract; do not build OCR foundation from scratch initially.
MGR owns canonical tax schema and provider-neutral extraction interface.

### B3. Tax Fact Graph / canonical normalized schema — RESEARCHED
Provider extraction outputs differ; downstream tax software fields also differ.
Decision: BUILD MGR-NATIVE.
Represent each tax fact with form, tax year, canonical field, value, source page/bbox, extraction provider/model/version, confidence and review status.

### B4. Field-level confidence / exception routing — RESEARCHED
Document-level confidence can hide one dangerous low-confidence field; field-level thresholds enable human exception review.
Decision: BUILD MGR-NATIVE.
No automatic promotion of low-confidence tax facts.

### B5. Evidence lineage — RESEARCHED
High-stakes AI review needs reconstructable provenance: input, system/version, settings, intermediate output and human changes.
Decision: BUILD MGR-NATIVE.
Every promoted tax field keeps source evidence and review history.

### B6. Human review / preparer approval — RESEARCHED
Human oversight reduces risk but can introduce rubber-stamping and alert fatigue.
Decision: BUILD MGR-NATIVE.
Review UI must prioritize risk/uncertainty and require explicit preparer approval before filing-sensitive transitions.

### B7. Browser tax-software execution adapter — QUEUED
Need dedicated research into Playwright/browser-extension/RPA patterns, anti-bot/session behavior, tax-software ToS, recovery, screenshots/evidence, focus safety and selector drift.
Current decision: likely MGR-NATIVE adapter contract, implementation provider-dependent.

### B8. Desktop tax-software execution adapter — QUEUED
Need dedicated research into Windows UI Automation, accessibility trees, OCR fallback, exact-target control, Citrix/remote desktop constraints and safe resume.
Current decision: MGR-NATIVE contract; implementation not yet selected.

### B9. Intake normalization — RESEARCHED
Intake sources vary but should map into one canonical client/tax profile.
Decision: BUILD MGR-NATIVE adapters around a canonical intake schema.

### B10. Autonomous filing — REJECT
Decision: do not authorize model-driven filing without explicit human/preparer approval and all IRS/MeF product gates.

## C. Voicebox-derived voice branches

### C1. STT provider layer — RESEARCHED
Local STT quality/latency vary materially by model/hardware.
Decision: BUILD MGR Voice Fabric contract; providers replaceable.

### C2. TTS provider layer — RESEARCHED
Qwen3-TTS supports streaming, voice design and cloning; Kokoro/Piper offer lighter alternatives.
Decision: BUILD provider-neutral TTS interface.

### C3. Voice cloning — RESEARCHED
FTC guidance shows no single technical mitigation is enough; authorization/provenance controls are required.
Decision: BUILD with strict consent/provenance gate; disabled unless rights evidence exists.

### C4. Synthetic-audio provenance — RESEARCHED
C2PA and current watermarking/content-credential approaches support provenance but watermarking is not sufficient alone.
Decision: BUILD signed provenance ledger and support Content Credentials/watermark metadata when provider supports it.

### C5. Streaming voice — RESEARCHED
Decision: BUILD capability/latency contract; do not assume every local model is production-grade for concurrency.

### C6. Local vs cloud voice routing — RESEARCHED
Decision: BUILD MGR-native routing using latency, cost, privacy, hardware availability, language and quality.

### C7. Voice personality / transformation — QUEUED
Need deeper research into identity rights, impersonation rules, style transfer, disclosure and brand-avatar use before generalized production deployment.

## D. Security / FreeBuf-derived branches

### D1. FreeBuf as research feed — RESEARCHED
Decision: STUDY only.
Use for discovery; important claims require primary-source verification.

### D2. MCP prompt injection / tool poisoning — RESEARCHED
Primary/current MCP security guidance supports least privilege, agent identity, tool separation and deterministic authorization.
Decision: BUILD/retain MGR controls: token-bound identity, tenant binding, Action Sentinel, approval gates, untrusted-content isolation and receipts.

### D3. Agent sandbox / containment — RESEARCHED
Current agent-security direction favors sandboxed execution plus external watchdog/policy.
Decision: BUILD adapters to sandbox runtimes; no unrestricted local/remote execution authority.

### D4. Security intelligence ingestion — QUEUED
Need source ranking, CVE/vendor advisory linking, deduplication and confidence model before automated ingestion.

## E. ServerByt / hosting branches

### E1. Shared hosting for websites — RESEARCHED
ServerByt publicly advertises shared/cloud hosting with MySQL, email, SSL, CDN, autoscale/no-LVE marketing and WordPress/app tooling.
Decision: ADOPT for low-risk websites where runtime requirements fit.

### E2. Shared hosting for MCP/agents/backends — REJECT pending new evidence
No public proof found for root Docker access, arbitrary always-on services, workers, Redis/Postgres service orchestration or container lifecycle controls.
Decision: do not host core MGR backend workloads on shared hosting.

### E3. ServerByt VPS — BLOCKED / QUEUED
Search did not surface public VPS specs sufficient to verify vCPU/RAM/root/Docker/backups/networking.
Decision: no adoption until direct specs are obtained.

### E4. VPS vs PaaS operating model — RESEARCHED
VPS can be cheaper but shifts patching, TLS, monitoring, backups, deploys, autoscaling and incident response onto MGR.
Decision: choose by workload class:
- PaaS for low-ops public APIs/MCP;
- VPS/container host for cost-sensitive stable services when MGR owns operations;
- shared hosting only for simple web workloads.

## Architecture decisions changed by this wave

1. Model routing becomes multi-objective and multi-turn, not a static cheap/expensive selector.
2. Price scoring becomes cache-aware.
3. Prompt compression must be evaluated jointly with provider caching.
4. Tax extraction should initially ADAPT proven document-AI engines behind an MGR-native Tax Fact Graph rather than building OCR from scratch.
5. Tax confidence is per-field, with evidence lineage and human exception routing.
6. Voice cloning requires consent/provenance as a first-class contract.
7. ServerByt shared hosting is not a candidate for the current MCP deployment.
8. ServerByt VPS remains unproven, not rejected.

## Remaining recursive branches before this research family is complete

- browser tax-software automation;
- Windows/desktop tax-software automation;
- voice personality/identity transformation;
- security-intelligence ingestion pipeline;
- direct ServerByt VPS specs and workload proof;
- detailed provider/model pricing + capability registry for the MGR router;
- semantic cache invalidation/privacy design;
- prompt-compression eval harness on MGR workloads.
