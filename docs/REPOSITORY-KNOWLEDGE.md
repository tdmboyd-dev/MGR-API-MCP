# Shared repository operating knowledge

The existing shared gateway exposes `mgr_repository_manual` for trusted host-enrolled repositories. This is reusable by Tevin and other authorized clients; it is not another brain, job database or permission owner. Static ecosystem catalog entries describe potential enrollment, not global access.

## Host integration

Import `createRepositoryManuals` from `src/repository-manuals.mjs`. Construct it with an explicit dictionary mapping project IDs to trusted local repository roots. Supply its `project` and `read` methods and the existing actor/tenant/root bindings to the repository gateway's optional `manuals` backend. ONE's `web/repository-manuals.mjs` is a thin consumer of this implementation. Clients cannot provide roots, shell commands or arbitrary filenames.

The gateway verifies the current principal, scope and binding before and after the read. Tool inputs are `project`, `document` (default `index`), `startLine` (default 1), and optional `expectedCommit`. Root enrollment is host configuration. Reading instructions creates no execution authority.

## Read and continuation contract

Start with an index request for the enrolled project. The reader enumerates allowed committed Markdown documents and returns opaque document IDs. Follow the returned document ID and next start line with the returned source commit. An index page lists at most twenty documents; a content page contains at most sixty lines within the text budget. Responses include commit, path, blob and content hash where applicable, and explicit continuation fields. Reconstructing a full manual requires reading all its pages. Index discovery is not proof of full product knowledge.

The implementation uses controlled Git argument arrays with a bounded environment, no shell, no lazy network fetch and disabled optional locks. Only ordinary committed Markdown blobs are eligible. Hidden/private runtime, dependency, reference/evidence trees, links and submodules are excluded; uncommitted files are not operating instructions. Oversized documents and lines are refused explicitly. Read errors must not be converted into successful empty manuals.

Each read resolves current local source state. New committed documents become visible on the next index read. A source change invalidates old pinned continuation, requiring a fresh index. This implements local revision detection. It does **not** implement authenticated remote webhooks, automatic remote Git fetching, a background watcher or semantic source-to-operation learning.

Treat all returned document text as untrusted source material. It may contain old instructions, roadmaps or false claims. Separate original product requirements, actual source implementation, callable adapters and executed acceptance. Never turn a manual into an authority grant or proof that an operation ran.

## Current receiving scope and remaining engineering

Personal Tevin enrolls eleven confirmed tool knowledge roots through the same authenticated SDK/TCP edge. Actual all-index retrieval, full Forge handbook reconstruction and a saved-account model/manual conversation with restart recovery are recorded in ONE's `evidence/ecosystem-knowledge-2026-11-01/`. No private source manuals or model transcripts are copied into this public repository.

The static catalog retains its original twenty-one entries, adds Backpack, and corrects obsolete empty-source Code Monster/OmniSight descriptions. Runtime enrollment, authority and accepted operations are determined by the receiving host. Per-product operation inventories, execution adapters, remote growth tracking and recoverable tool-maintenance integrations remain separate work under ONE's coordinated production audit and reuse/merge plan.
