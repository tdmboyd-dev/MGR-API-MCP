# Community resource review — 2026-09-23

Membership in AI Workshop Lite is verified in the Codex built-in browser. The earlier login and membership blockers are resolved. This review is a source assessment, not an implemented assistant.

## Acquired and read

Twelve original community PDFs were downloaded, parsed successfully, and their complete extracted text read across all 115 pages. Text companions are beside the PDFs. Videos have not been watched/transcribed, and a text extraction is not a visual audit of every page. Two n8n workflow JSON files were downloaded and read in full. Originals are preserved; none was installed or activated.

| Material | Pages | Useful contribution | Integration decision |
|---|---:|---|---|
| Jarvis-Jev-Prompt-Pack | 19 | Typed prepass, streaming speech timing, retrieval relevance, claim checks, triage, shadow governor, diagnostics | Adapt. Keep deterministic authorization, validation, deadlines, privacy controls, and receipt checking outside Jev. |
| Jev-A-New-Kind-of-AI | 10 | Decision primitives, limitations, client/guard examples | Reference. Verify model/pricing claims against official docs; confidence is not permission. |
| Jarvis-Fable-5.1-Prompt-Pack | 12 | Note graph, chat, speech, immediate note capture, screen question, model switching, preflight | Foundation requirements. Provider-independent implementation rather than fixed Anthropic wiring. |
| Jarvis-GPT-6-Astra-Prompt-Pack | 22 | Same foundation plus focus sessions, deferred target selection, camera signals, screen watch, diagnostics | Superset comparison. Windows adapters required; privacy and device behavior need real verification. |
| JARVIS-Prompt-Pack | 6 | Earlier baseline and feature history | Deduplicate against the newer packs; retain provenance. |
| Build-CASE-Free-Prompt-Pack | 6 | Background missions, task status, result report, adjustable persona | Adapt task lifecycle. Reject its permission-bypass command. This is CASE, not the complete paid TARS source. |
| SPARK-Starter-Pack | 8 | Persistent brand voice, drafting desk, revisions, approval, weekly planning | Merge the content workflow into shared tasks and approvals. Starter approval copies to clipboard; it is not proof of publishing. |
| Jarvis-Phone-Starter-Pack | 9 | Booking/inquiry/reception scripts, isolated call context, invoice/quote/proposal creation | Optional provider adapter. Use code-enforced scope, durable document IDs, decimal arithmetic, and delivery receipts. |
| Jarvis-screen-share-prompt-pack | 7 | Screenshot pointer, controlled computer actions, narration, stop behavior | Adapt behind a Windows-capable tool interface. Mac helper commands are not portable implementation. |
| HOLO-Prompt-Pack | 8 | Gestures, local landmarks, note interaction, 3D props, simulation/probes | Optional UI module. Public HOLO source already collected; this PDF does not prove runtime integration. |
| Social-Autopilot-Prompt-Pack | 5 | Brand-driven drafting, research, repurposing, approval queue | Consolidate with SPARK; one content queue and one publishing authorization path. |
| Brand-Voice-Template | 3 | Voice, audience, true stories, offer and platform preferences | Store as versioned user profile with provenance. Fictional template examples must not become user facts. |

## Workflow internals examined

**Pinecone-agent.json — 12 nodes.** The manual import chain downloads a configured Google Drive PDF, chunks it at 3,000 characters with 200 overlap, embeds via OpenAI, and inserts into Pinecone. A separate chat trigger uses a retrieval QA chain and the same vector store. Reusable concept: separate ingestion from query execution. Missing from this sample: incremental update/delete reconciliation, stable document revision IDs, tenant isolation, explicit citation receipts, and configured failure recovery. Embedded credential IDs and a demo Drive file are template references, not working user connections. Do not fetch the sample Drive document simply because its ID appears in the template.

**gmail-labeling-agent.json — 8 nodes.** Polls Gmail every minute, sends message text through a model classifier, and applies one of four hardcoded Gmail labels. Reusable concept: narrow inbox triage with a small allowed output set. Adaptations required: replace account/label references, validate classifier output, handle ambiguous results, add idempotency/error recovery, minimize content disclosure, and verify least-privilege account access. It is inactive; no email was read or changed by this task.

These findings come from full JSON inspection, not execution in n8n. A valid workflow JSON is not a verified provider integration.

## Corrections required before merging

1. **Jev cannot authorize tools.** A probability, even a high one, cannot replace user authorization, deterministic tool capabilities, schema validation, and account scope. The guide's thresholds are examples, not calibrated guarantees for this user's workload.
2. **Fix the judge's failure behavior.** The pack passes answers through on judge timeout and excludes answers with any receipts from checking. Unrelated, partial, or failed receipts must not justify an unrelated success claim. Render action status from matching validated executor receipts; hold unverifiable claims.
3. **Do not label retrieval as verified truth.** A relevance score can select evidence; it cannot establish factual support by itself. Keep source spans, revisions, and uncertainty. A related note is not necessarily an answer.
4. **Remove CASE's permission bypass.** An allowlist, bounded workspace, isolated process, cancellation, timeout, and task-specific capabilities are needed. Blocking four tool names is not a universal sandbox.
5. **Replace sample secret handling.** SPARK asks for a key in conversation. Use a secure configuration flow; never paste keys into agent chat or expose them in served files, diagnostics, or logs.
6. **Make provider failures explicit.** Add response validation, bounded retry budgets, cancellation, idempotency, and reconciliation. The TypeSafe SDK observations already demonstrate missing runtime response validation.
7. **Upgrade memory persistence.** Array-index node IDs and 700-character excerpts are useful demos but unsuitable as the durable identity and full retrieval layer. Use stable document IDs, complete chunk indexing, revision history, and consistent write/index transactions.
8. **Protect logs and sensors.** Full utterance logs can contain private data. Minimize/redact by default, define retention, and make camera/mic/screen activation explicit. Whole-screen sending and local posture processing are distinct permissions.
9. **Make documents and delivery transactional.** Recompute money using decimal arithmetic; generate IDs atomically under concurrency. Distinguish a generated PDF, queued delivery, provider acceptance, and verified delivery.
10. **Keep publishing approvals tied to exact content.** Editing a post, recipient, time, account, or attachment invalidates its prior approval. Add duplicate prevention and provider reconciliation. No publishing or auto-DMs were authorized or executed in this research.
11. **Verify current models and costs.** Pack claims about model quality, availability, latency, prices, and subscriptions are the author's claims. Do not hardcode them as current facts or promise a paid subscription/API is free.
12. **Check reuse rights per artifact.** The public HOLO repository has an MIT license; that does not automatically license every community PDF, workflow, media asset, or paid package for redistribution in a product. Keep private research originals separate from any released implementation.

## Proposed shared architecture

One task engine should serve chat, voice, content work, coding, and optional phone/computer tools. A task records its request, allowed scope, input sources, selected provider, proposed actions, approvals, execution attempts, receipts, artifacts, and final verification. Cancellation and restart recovery are task behavior, not special cases bolted onto each UI.

Provider adapters cover the chosen reasoning model, optional local models, and optional Jev classification. The classification layer may advise on routing and relevance; deterministic policies decide execution. Tool adapters declare inputs, outputs, read/write behavior, account scope, approval requirements, and idempotency. A tool cannot report success without an executor receipt.

Memory uses portable source files plus a durable local catalog and retrieval index. Graph/HOLO views consume that catalog rather than becoming the database. Brand voice is one typed profile in the same system. Content drafting, research, document creation, and coding become workflows using the same task, artifact, and approval records.

This is a proposed design derived from inspected sources, not a claim that the implementation exists. ChatGPT-facing MCP integration and direct provider access remain separate integration paths, each requiring its own host/account verification.

## Discovered but still outstanding

The expanded YouTube Resources catalog exposes 70 lesson links across coding, n8n, voice AI, app building, and prompts. Only the recorded relevant lesson pages and the acquired artifacts have been read. This is not a full-community audit of 4,489 discussion posts or all videos.

- Additional n8n sources: SerpAPI, nested workflow tools, Calendar Automation under the generic API lesson, Perplexity, sales RAG, YouTube repurposing, and a linked n8n JSON library.
- Social carousel SKILL.md, editable brand-voice Markdown, and community HOLO ZIP. The public HOLO repository snapshot is already saved, but equivalence to the community ZIP is unverified.
- Voice sources: multilingual, ElevenLabs consultation, Telnyx, realtime voice, and voice-enabled sites. These remain candidates until collected and inspected.
- Low-priority domain examples such as wellness, recruiting, finance and legal workflows require domain-specific assessment; no automatic consolidation into a general assistant.
- AI 2nd Brain is visibly locked at Level 2; cold-call/upsell material at Level 3 and baby-podcast material at Level 4. No engagement farming or lock bypass was attempted.
- Finished JARVIS, TARS, and SPARK packages are still advertised as paid-community material. Free prompt packs are not those packages.

Some non-PDF download controls did not yield a new URL or verified local file after activation. Pinecone and Gmail downloads did succeed; Calendar, Perplexity and the carousel skill remain uncollected. No authentication problem is being inferred from those download failures.

## Evidence boundaries

No purchased membership, software installation, camera/microphone activation, phone call, email modification, social post, or provider connection was performed. The 19 public Zubair repository archives and the official TypeSafe SDK snapshot remain in the existing collection. Most repository internals and 105 of the 111 TypeSafe documents still need complete reading. The unified assistant remains unbuilt.
