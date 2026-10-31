# MGR REA X-Ray — Private plugin

REA official source: https://github.com/morluto/rea ; pinned npm 6.8.0.
This plugin is an original MGR local, static-inspection wrapper and workflow skill; it does NOT include or redistribute REA itself. Install REA separately in `~/.mgr-tools/rea/runtime`, with compatible Node executable in `~/.mgr-tools/rea/node`. The packaged MCP server exposes only bounded artifact inspection, and does not run executable targets.

To inspect a file, put a user-authorized COPY in `~/.mgr-tools/rea/workspace`, then invoke `mgr_rea_inspect_artifact` with the relative file path. Files outside that directory are rejected, even when a caller knows their absolute path. Plugin server tool availability requires a local MCP-capable host; saving the plugin in ChatGPT alone does not launch a Windows process or expose local files to iOS.

Refer to `skills/mgr-rea-xray/SKILL.md` for evidence, reverse-engineering and rights rules. The Forge code and handoff remain in `MGR-3D-FORGE`. MGR API/MCP retains shared authentication; Creation OS remains optional.
