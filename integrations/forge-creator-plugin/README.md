# MGR Forge Creator — private workflow plugin v0.1.0

**Status:** SKILLS-ONLY MVP. The private plugin gives ChatGPT a safe MGR Forge creation workflow and truthful capability boundaries. It does **not** host Forge, expose an HTTP/MCP endpoint, supply credentials, or magically connect ChatGPT Mobile to the Windows workstation.

**Single execution architecture:** ChatGPT / Tevin / standalone Forge Studio -> the same authenticated MGR API/MCP -> MGR 3D Forge local or hosted worker -> Forge Vault, real GLB/BLEND, SHA receipts -> user. Optional Creation OS coordinates multi-factory projects; optional Beast X-Ray REA analyzes sources. Neither is a mandatory creation step.

**Actual new code used by future connector:** MGR-3D-FORGE/forge/creature_jobs.py; MGR-3D-FORGE/forge/studio_server.py /api/creature-create and /api/creature-status; MGR-API-MCP/src/forge-catalog-client.ts and src/forge-mcp-tools.ts; F133 in Forge BUILD-REGISTER.md. Real local Node→Python Forge HTTP test passed with a 114,192-byte source-native GLB + matched hash and denied wrong tenant/tokenless reads. This is local, not a public hosted ChatGPT tool.

**Open:** secure actual hosted MCP URL (not invented), proper OAuth/tenant scopes, resilient job storage, preview and signed artifact URLs, interactive Forge Creator UI, owner artifact acceptance and mobile usage. Do not add a fake mcp.json or hardcoded localhost endpoint to the account plugin. Once the actual remote endpoint is independently deployed, extend this plugin by attaching the SAME MGR-API-MCP streamable-HTTP service, not creating a duplicate.
