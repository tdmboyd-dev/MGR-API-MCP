---
name: mgr-forge-create
description: Use for original MGR Forge 3D assets, characters, morphs, rigging, landscapes, source-intake, model previews and artifact acceptance through existing authorized MGR systems.
---

# MGR Forge Creator — single execution service, many front ends

This plugin supplies the **creation workflow and routing rules only**. Its v0.1.0 archive contains NO remote MCP service or generator. Do not tell anyone it can produce artifacts directly on mobile until the authenticated MGR API/MCP Forge tools, private artifact storage, and remote access have been independently connected and tested.

## Source-of-truth and route

1. Inspect current **MGR-3D-FORGE/docs/HANDOFF.md**, **docs/BUILD-REGISTER.md**, and **docs/MASTER-FORGE-PROGRAM-2026-10-31.md** before claiming a capability built.
2. Use the SAME Forge creation job controller used by standalone Forge Studio, Tevin/MGR-ONE, and the shared **MGR-API-MCP**. No second generator, REA brain, provider router, asset vault or approval authority inside this plugin.
3. For an existing authenticated connector supporting **mgr_forge_creature_create**, **mgr_forge_creature_status**, **mgr_forge_world_create**, **mgr_forge_world_status**, or **mgr_forge_asset_discover**, require correct tenant and audience, `tools:read` for status and `tools:execute` for creation, stable unique request ID and validated params. If those tools are not available in the current session, **do not invent a tool call**.
4. A separately authorized local desktop workflow may run the genuine Forge Python CLI with a bounded workspace, but it must preserve source files and return independently hashed receipts. Local completion does NOT equal hosted iOS or Tevin acceptance.

## Actual types and quality honesty

- **Original creature**: CPU procedural prompt/seed/1–12 DNA variants, optional bounded morph, real GLB with SHA-256 and restart-safe request. Prototype art and weights; not photorealistic neural output or owner-accepted rig.
- **Native world**: actual source-fingerprinted geometry edits and GLB receipt, local viewer and optional Blender/Godot workflows; not a whole neural world-building AI.
- **Licensed assets**: Source Atlas and REA X-Ray evidence are NOT commercial rights approval. Record exact publisher, nested license scope, model/data/weight rights, saved file digest, actual Blender/engine import and owner acceptance.
- **Rig and materials**: create a real Blender file, deformation/animation evidence and preview where supported. Do not claim full facial animation, fur, hair or motion capture from a static mesh.
- **GPU/cloud**: dry-run price planner and rights-gated candidate backends; no spending, provider activation or upload without explicit permission.
- **Rambler**: MGR release integrity detects tampering; it cannot make shipped software impossible to inspect and unsigned manifests are not proof of publisher identity.

## Result and recovery

Give exact job ID, source repo/path, requested specs, artifact hash and bytes, source/license state, engine/runtime check, file delivery location, what is verified and what remains open. Link only to files actually created and accessible in this session; never invent public download URLs or sandbox paths. Record new capabilities/fixes in the existing per-repo handoff and feature register, with current GitHub commit, negative tests and verified remote readback.

**Stand-alone app vs ChatGPT**: a user-friendly Forge Creator plugin belongs in ChatGPT, but a working hosted remote MCP service with OAuth, persistent private Forge jobs, signed/expiring artifact downloads and a real preview is still necessary for mobile use. Until then, this plugin helps route and specify work using already-connected authorized tools only.
