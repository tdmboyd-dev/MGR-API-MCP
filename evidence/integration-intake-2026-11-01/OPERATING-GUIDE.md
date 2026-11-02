# Native integration intake: how to use it

This ability is part of Code Monster's source/evidence intelligence and is consumed by Tevin through the existing repository connection. It helps review integration source before deciding what to build, repair or run. ONE retains decisions and permissions, OmniDev retains operator jobs/workers, OmniSight retains presentation, and Backpack supplies supporting context/procedures/evidence.

Place an authorized, committed workflow in an enrolled repository under either:

```text
n8n/workflows/example.json
integrations/n8n/example.json
```

Nested directories with supported names are allowed. Arbitrary JSON elsewhere is not silently treated as executable workflow source. If you preserve a third-party template, retain its applicable notice, attribution and change history. This wave's native source packet contains independently authored MGR code and evidence, not copies of the upstream workflow engine or template collection.

For a curated provider directory using the public-apis five-column table format, use:

```text
integrations/public-apis.md
```

The existing source MCP request is unchanged:

```json
{"name":"code_monster_automation","arguments":{"project":"YOUR_ENROLLED_PROJECT","offset":0,"limit":20}}
```

The existing Tevin repository operation is also unchanged:

```json
{"operation":"automation","project":"YOUR_ENROLLED_PROJECT","symbol":""}
```

Project IDs must already be enrolled and authorized. A caller cannot add a root or grant execution through these arguments. These examples are request shapes, not a claim that a particular user's project is already connected.

Workflow results show bounded node/type/connection counts, structural edges, duplicate or unknown references, declared credentials and possible effect categories such as HTTP/code/commands. Node names, parameters, executable code, credentials, URLs and stored/pinned data are withheld. A cycle can be intentional or involve disabled nodes; it is not automatically a runtime defect. `activeDeclared=true` reports source data and performs no activation. `executionReady` stays false.

Provider-directory results show bounded labels, source line numbers, link digests and declared auth/HTTPS/CORS fields. Descriptions and URLs are withheld. `providerVerified`, `authenticationVerified`, `termsVerified` and `quotaVerified` stay false. “No” in an auth column is a directory claim. A documentation URL's scheme can differ from the API's actual transport, so the local scheme comparison is review context, not a provider verdict.

Always consume continuation. The requested item count is an upper bound; larger results may return fewer items to stay within the byte budget. Direct source callers follow `nextOffset`; Tevin's owner connection supplies the existing source-bound `nextRequest`. Stop only when continuation is null. Keep the returned commit/digest consistent across pages. A source change refuses mixed-commit continuation.

The item projection limit is 6,144 bytes and the page's item-array limit is 8,192 bytes. Oversized projections remain explicit unavailable metadata rather than an empty paging loop. The existing owner connection's 12,000-byte ceiling remains unchanged. Input limits remain explicit too: 512 KiB per selected integration file, the existing 1 MiB map read budget, bounded node/edge counts and the existing file-count limit. Unsupported, malformed, invalid-UTF8, oversized, symlinked and out-of-scope inputs do not become successful empty integrations.

Executed evidence includes an actual original corpus of 88-node and 10-node workflows plus the pinned provider directory. The original combined 13,706-byte response was refused by the owner connection. After byte-aware paging, actual owner responses were 6,515 and 10,100 bytes, with saved read receipts and unchanged source. These are local source-integration checks; no live provider account or workflow activation was performed. See the adjacent current-work report and final qualification receipts for the latest canonical delivery state.

Future activation, repair candidates or service calls must go through the existing owning runtime and its real authorization, credentials, tests and recovery flow. This intake does not register providers, create jobs, send messages, publish content or replace the native MGR campaign engine.
