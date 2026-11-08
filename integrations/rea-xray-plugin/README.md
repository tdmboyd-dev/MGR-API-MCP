# MGR REA Engine — the ONE Reverse Engineer Anything plugin for ChatGPT + Codex

Release `0.2.0`; retains account identity `mgr-rea-xray`, user-visible name **MGR REA Engine**.

* `mgr-rea-engine` — official `rea-agents@6.8.0` native MCP with its complete tool catalog. The bundled `server/rea-engine-launcher.mjs` verifies the pinned separate local package and launches the original REA server; REA itself is not vendored into this plugin.
* `mgr-rea-static` — original bounded local `mgr_rea_inspect_artifact` file-only tool, retained for sensitive/asset-only inspections.

**Verified Windows runtime, November 8, 2026:** `rea mcp doctor --json` returned healthy; full native catalog **229/229 tools**, **6/6 prompts**, `binary_session` request PASS, engine/catalog identity matched `rea-agents@6.8.0`.

The installed Windows runtime lives under `%USERPROFILE%\.mgr-tools\rea\runtime`, portable Node under `%USERPROFILE%\.mgr-tools\rea\node`, and the approved analysis workspace under `%USERPROFILE%\.mgr-tools\rea\workspace`.

**Shared means same engine and evidence, not magically identical host permissions.** Codex or a local-MCP host may run the full native MCP. ChatGPT with an authenticated connected Windows device may run the installed CLI through its Desktop Commander connector while native MCP is unavailable. The phone/cloud plugin by itself cannot start a process on Windows. Complete always-on direct mobile access requires a scoped, authenticated remote bridge and Windows worker via the existing MGR-API-MCP. Until deployed and tested, mark direct ChatGPT REA MCP execution **UNVERIFIED**.

The original `skills/mgr-rea-xray/SKILL.md` contains authorization, provenance, test and existing-handoff rules for both hosts. `rea-dependency-pin.json` tracks official upstream package integrity. REA works on *legally accessible copies*, not secret repositories it cannot authenticate to; analysis is not licensing clearance or a production acceptance receipt.
