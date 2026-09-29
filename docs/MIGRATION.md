# September 28 repository migration

The owner designated tdmboyd-dev/MGR-API-MCP as the project home. GitHub metadata and clone confirmed an empty public repository. No existing source or history was replaced.

Every file from the previous outputs checkpoint was copied byte-for-byte into ignored .local/checkpoint. research/manifests/checkpoint-inventory.json records path, bytes and SHA-256 for each original. The prior workspace remains intact. Public research and operating documents were copied selectively; current documents supersede dated history without changing archived bytes.

A clone of the public remote contains findings and manifests, not the private source archive. For complete local recovery, restore the owner's JARVIS-JEV-BEAST-Research-Collection.zip into .local/checkpoint and verify its recorded hash before extraction. That earlier bundle predates its own receipt; the full local inventory also includes the ZIP and receipt. Prefer copying the intact .local/checkpoint directory from the original workstation. Run python scripts/verify_repository.py --local to detect missing or changed checkpoint files.

Public repository source snapshots can be reacquired with scripts/restore_sources.py. It checks out the pinned commit, never runs installers and refuses to overwrite existing mismatched checkouts. Current provider documentation may differ from saved hashes; retain both versions instead of claiming the older reading covers the newer one.

The original work/vendor clones remain intact in the prior workspace. This repository's .local/vendor checkouts are disposable research inputs; they are not installed dependencies or integrations.

Original top-level collection scripts and discovery files from work/ are also retained in .local/legacy-tools, with hashes in research/manifests/legacy-tools.json. They are historical tools; do not run the stale finalize_collection.py against current manifests.
