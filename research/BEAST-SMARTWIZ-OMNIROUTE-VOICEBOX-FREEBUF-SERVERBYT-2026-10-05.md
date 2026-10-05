# BEAST Research — SmartWiz, OmniRoute, Voicebox, FreeBuf, ServerByt

Date: 2026-10-05

## Executive dispositions

- SmartWiz — STUDY + MGR-NATIVE: tax workflow patterns for Elite Hub; do not copy proprietary implementation.
- OmniRoute — ADAPT: model routing, provider failover, cost/latency/health scoring, compatible API surfaces, observability and compression ideas.
- Voicebox (jamiepine/voicebox) — ADAPT: local/private voice I/O, cloning, dictation, MCP speech tools and multi-engine voice architecture.
- Voicebox (agjs/voicebox) — STUDY: small OpenAI-compatible STT/TTS server architecture.
- FreeBuf — STUDY: secondary AI/security intelligence source; verify important claims against primary sources.
- ServerByt shared/cloud — ADOPT only for low-risk websites, WordPress, email and simple web properties.
- ServerByt VPS — STUDY: possible backend host only after VPS resource, root/Docker and operational details are verified.

## SmartWiz

SmartWiz is a proprietary tax-automation platform for professional tax offices. Its public workflow is highly relevant to MGR Elite Hub:

1. collect intake + PDFs/images/scans;
2. classify and extract tax facts;
3. normalize information into a client profile;
4. map facts into professional tax software;
5. enter through browser or desktop execution adapters;
6. flag uncertainty instead of guessing;
7. show the source document next to the entered return;
8. require the preparer to review, approve and file.

Public coverage includes TaxSlayer Pro Web, Drake Online, Drake Desktop and OLT Pro, plus intake connections such as JotForm, Cognito Forms, GoHighLevel, SuiteDash, TaxDome and TaxesToGo.

Security patterns worth matching or exceeding include SOC 2 Type I, TLS 1.2+, encryption at rest, field-level encryption for sensitive data, AWS KMS/HSM-backed key handling, managed secrets, vulnerability scanning and penetration testing. SmartWiz publicly says client data is not used to train AI models.

Current public pricing confirms a strong per-return business model. Annual volume tiers are advertised around $20, $18, $16 and $14 per return depending on volume, with custom pricing above 2,500 returns. A separate pay-per-return offer is advertised at $9/return.

MGR action: independently build a Tax Fact Graph, source-to-field evidence lineage, confidence/exception queue, preparer review workstation, browser/desktop tax adapters, intake normalization, due-diligence evidence bundles and an explicit preparer filing gate. SmartWiz terms prohibit reverse engineering, so use the public workflow as product research only.

## OmniRoute

Canonical repository researched: diegosouzapw/OmniRoute. It is TypeScript, MIT licensed and actively developed.

The strongest MGR lesson is its score-driven routing. Public docs and code show routing signals around latency, cost, success rate, context fit, task/model fitness, recent failures, quota and circuit-breaker state. It exposes routing modes such as balanced, coding, cheap, fast, quality-first/smart, local/offline and last-known-good.

Its gateway surfaces include OpenAI chat, OpenAI Responses, Anthropic messages, embeddings, images/edits, video, music, STT, TTS, rerank, moderation and models. It also has MCP/A2A, auth/authz, cost tracking, caches, access tokens, routing explainability, OTel GenAI work and operational-quality tracking.

MGR action: keep Brain/Jev/Decision/Action-Sentinel as MGR-owned authority, but extend our router with task-fit, real provider price data, latency EWMA, success/failure EWMA, provider health/circuit breakers, quota headroom, context-window fit, tool support, semantic eval history, tenant budgets, fallback chains, last-known-good stickiness and route receipts. Model routing must never authorize business actions.

## Voicebox

Primary project: jamiepine/voicebox, MIT, actively developed. It is a local-first voice studio with a TypeScript app layer and Python backend. Public code/docs expose MCP tools for speaking, transcribing, recent captures and voice profiles. It supports dictation, cloned voices, voice personalities and HTTP MCP.

Secondary project: agjs/voicebox, MIT, FastAPI, faster-whisper STT plus Kokoro/Piper TTS behind OpenAI-compatible audio endpoints, with Docker/CUDA support.

MGR action: create an MGR Voice Fabric contract with replaceable STT, TTS, voice-clone, streaming, local/cloud providers, voice profiles, language/capability metadata, cost/latency/quality telemetry, consent/rights provenance and an audio artifact ledger. Voicebox can be an optional local provider. Note: the smaller agjs project documents GPL obligations when packaging Piper; a Kokoro-only path is cleaner for permissive redistribution.

## FreeBuf

FreeBuf is a large Chinese-language cybersecurity portal covering AI security, vulnerabilities, Web/data/system security, tools, attack/defense exercises, enterprise security and industry reports.

Recent useful topics include AI-agent IAM, jailbreak/guardrail analysis, exposed local LLM services, agent-security governance, threat intelligence and vulnerability research.

MGR action: use FreeBuf as a secondary discovery/research feed for MGR Beast, Compliance Buddy and API/MCP security. Do not treat it as primary truth because it mixes original work, reposts, vendor material and community content. Important claims must be verified against standards, source code, vendor advisories, CVE/NVD/CISA or other primary evidence.

## ServerByt

The cheap plans are primarily shared/cloud website hosting with StackCP, SSL, CDN/edge caching, DDoS/malware features, MySQL, email, one-click applications and WordPress emphasis. ServerByt also documents SSH access to hosting packages. Its legal/refund page explicitly mentions VPS plans.

What is not publicly proven for the cheap shared plans: Docker daemon access, root access, arbitrary always-on Node services, worker processes, Redis/Postgres service provisioning, private networking, health/restart policies, Git-based deployment, multi-service stacks or guaranteed CPU/RAM for agent workloads. SSH access alone does not prove general-purpose VPS/PaaS behavior.

Hosting decision:
- Shared ServerByt: good candidate for cheap marketing sites, WordPress, simple PHP/static properties, domains/email and low-risk microsites.
- Do not use the shared plan as the default home for MGR API/MCP, Legacy, Agents, Creation OS, queues or workers.
- ServerByt VPS may be useful, but verify price, vCPU, RAM, disk, bandwidth, region, root access, Docker, IPs, firewall, snapshots, backups, resize path, monitoring, network restrictions, AI-workload AUP and long-running-process support first.
- Keep Render as the current MCP deployment candidate until a ServerByt VPS is proven operationally equivalent or better.

## Build queue created from this research

API/MCP:
- extend CostAwareModelRouter with provider health, latency, quota, context fit and semantic-quality signals;
- add routing receipts/explainability;
- add provider fallback/circuit-breaker integration;
- keep MCP universal/client-neutral.

Elite Hub / Legacy:
- canonical Tax Fact Graph;
- source-document to extracted-fact to tax-field lineage;
- uncertainty/exception review queue;
- preparer approval/file gate;
- browser and desktop tax-software adapter contracts;
- intake normalization interface;
- due-diligence evidence bundle;
- prohibit autonomous filing.

Voice:
- MGR Voice Fabric contract;
- optional Voicebox local adapter;
- voice consent/rights provenance;
- STT/TTS/clone provider registry and routing.

Security:
- FreeBuf secondary-source catalog;
- primary-source verification rule;
- recurring AI-agent/MCP security research queue.

Hosting:
- continue Render for current MCP proof;
- verify ServerByt VPS before backend adoption;
- use ServerByt shared hosting only for workloads it actually proves it supports.

## Sources inspected

SmartWiz public site, pricing, pay-per-return, security, workflow guides, help center and terms.
OmniRoute canonical GitHub repository, routing docs/code, API reference and MCP code.
Voicebox jamiepine/voicebox and agjs/voicebox repositories, MCP/API/backend/license material.
FreeBuf AI-security, enterprise-security, tools and reports.
ServerByt public plans, policies, help center and SSH documentation.
