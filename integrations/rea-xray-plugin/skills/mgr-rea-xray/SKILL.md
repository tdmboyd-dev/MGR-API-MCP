---
name: mgr-rea-xray
description: Use for authorized REA-powered inspection of packages, applications, binaries or asset packs and translation of observed evidence into independently implemented MGR 3D Forge capabilities; not for license circumvention.
---

# MGR REA X-Ray — evidence to original implementation

REA is the specialist inspector, not the builder, permission authority, or a second agent brain. Its canonical upstream is `morluto/rea`, npm `rea-agents@6.8.0`, MIT for REA-authored code; preserve third-party terms. The plugin has a strict *local file-only* MCP inspector whose only REA command is `inspect-artifact --detail summary --json`. It runs the version-pinned package in `~/.mgr-tools/rea/runtime`, using `~/.mgr-tools/rea/node/node.exe` on Windows. Do not claim this package hosts REA remotely or works on iOS without an available remote execution connection. It never downloads tools during inspection or runs software being inspected.

## Before inspection

1. Establish exact target owner, authorized artifact, local scope, allowed review method and whether rights allow copying, reproducing, distributing or training. A public URL is not automatic redistribution permission.
2. Work with a copy in the approved directory `~/.mgr-tools/rea/workspace` (or an explicitly configured `MGR_REA_ALLOWED_ROOT`). Do not point the tool at private home directories, browser profiles, secrets, production databases, unknown local executables or arbitrary sites. Inspect packages statically before any runtime execution.
3. Use `mgr_rea_inspect_artifact` when its local MCP tool is available. Its returned REA Evidence is not a legal determination. If the tool is unavailable in chat/mobile, use a connected, authorized desktop execution tool for the same pinned REA CLI only after checking the environment; otherwise mark execution UNAVAILABLE, do not simulate it.

## Evidence truth

Return a finding with target path/sha256, upstream REA version, command, evidence ID/content hash, actual inventory/coverage, limitations and errors. Keep OBSERVED, INFERRED, UNKNOWN and NOT_EXECUTED distinct. Full REA JSON is retained in `workspace/.rea-evidence` locally when execution succeeds. Do not equate one matching file name or file count with an implemented feature, working 3D rig, or proven original design.

## MGR-native workflow

**Observe → rights review → capability decomposition → original specification → Forge-native implementation → unit/security test → Blender/Godot roundtrip → owner acceptance → canonical handoff.** Reuse `MGR-3D-FORGE/docs/HANDOFF.md`, `docs/BUILD-REGISTER.md`, Forge Vault and existing MGR API/MCP authorization; Creation OS is optional for multi-factory projects. Never add a duplicate queue, router, vault or brain. For a source package, distinguish (a) source/license-scoped preservation, (b) an imported candidate, and (c) approved production asset.

Do NOT reverse engineer proprietary 3D pack content in order to remove attribution, payment, noncommercial, redistributable, or other rights restrictions. You may study lawful, observable functionality and design independent original systems using generic principles, documented standards, permissive algorithms and legally acquired source assets. A different implementation does not automatically avoid patents, trade secrets, trademarks or contract terms; flag legal review when necessary.

When user requests an MGR-native version, produce the new functionality and regression/visual proof in its owner repo, not a pixel-perfect copy or renamed third-party file. Include exact changed files, runnable tests, outputs, source/license limits and open gates in the **single existing handoff**. Human permission applies separately to spend, execution of untrusted binaries, production deployment, broad filesystem access and sharing protected content.
