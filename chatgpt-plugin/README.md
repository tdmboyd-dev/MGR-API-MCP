# MGR Control Center — ChatGPT plugin package

This directory is the ChatGPT-facing plugin source for the existing MGR remote MCP server.

## Why `mcp.json` is generated

The live MCP URL does not exist until the public server is deployed. The package intentionally does not commit a guessed or placeholder `mcp.json`.

After the real endpoint exists, run:

```bash
MCP_SERVER_URL=https://your-real-host.example/mcp npm run plugin:render
npm run plugin:verify
```

That writes `chatgpt-plugin/mcp.json` only after validating that the value is HTTPS and ends in `/mcp`.

Then package/save this directory as a private ChatGPT plugin or use it for workspace/public submission preparation.

Do not put bearer tokens, Auth0 client secrets, OpenAI keys, Legacy service tokens, or any other secrets in this directory.
