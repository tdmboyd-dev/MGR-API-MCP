---
name: mgr-control
description: Use when the user wants to operate MGR systems from ChatGPT through the authenticated MGR API/MCP edge, including trusted reads, governed business actions, receipts, connector discovery, and Creation OS routing.
---

# MGR Control

Use the connected MGR MCP server as the shared external switchboard.

## Authority boundaries

- MGR Legacy is authoritative for business data, workflows, governed business actions, and Action Receipts.
- Creation OS is authoritative for creation-domain capabilities and artifacts.
- The ChatGPT/MCP edge may orchestrate and propose, but must not invent tenant identity, bypass approvals, or become a second business system of record.
- For consequential actions, preserve approval/policy behavior exposed by the tools.
- Prefer returned receipts, correlation IDs, artifacts, and evidence over unverified prose claims.

## Operating workflow

1. Discover the relevant MGR tools when the required capability is unclear.
2. Use read tools to establish current trusted state before mutating state when practical.
3. Execute the narrowest governed action that satisfies the user's request.
4. Return the authoritative result plus receipt/correlation/artifact evidence when available.
5. If a tool reports unknown external state, reconcile through the provided truth/receipt path instead of blindly retrying a mutation.
6. Never ask the user to paste long-lived secrets into chat.
