# Backpack through the existing authenticated MCP edge

Backpack is a plugin with an embedded skill, operating directions and a callable
runtime. Local desktop stdio and a remote authenticated service are distinct
connection paths. A local package cannot make a browser execute a Windows process.
This integration exposes nine bounded Backpack reads through API-MCP's normal
`npm run start:http` entrypoint. API-MCP remains the shared edge; MGR-ONE retains
brain/permission ownership. No second scheduler, task store or grant engine is added.

## Configure the trusted host

Use Node 24.15 or later within the Node 24 line and install the pinned dependencies
in both repositories with `npm ci --ignore-scripts`. Deploy the reviewed Backpack
source and API-MCP source to the same trusted service host or private mounted volume.
Keep config, bindings and SQLite outside Git and outside the public web root.

Set `MCP_PUBLIC_BASE_URL` to the actual HTTPS service origin, `MCP_AUTH_ISSUER` to
the authorization server's exact advertised issuer, and `MCP_JWKS_URL` to its
actual signing-key endpoint. Issuer matching is exact, including trailing slashes.
Configure tenant/scope claims to match that provider. Advertise `backpack:read` in
`MCP_ADVERTISED_SCOPES`. Tokens need both `tools:read` and `backpack:read` for reads.
OAuth client registration, authorization/token endpoints and account connection
still come from the existing authorization provider; this code does not invent one.

Set all three Backpack startup variables, or leave all three absent to disable it:

| Variable | Host-owned value |
| --- | --- |
| `MGR_BACKPACK_TOOLKIT_ROOT` | Absolute reviewed `@mgr/backpack` source root |
| `BACKPACK_CONFIG` | Absolute private Backpack configuration file |
| `MGR_BACKPACK_BINDINGS_FILE` | Absolute private JSON binding file |

Backpack configuration uses absolute `dataDir` and `roots`, and optional owner
`actor` and approved profiles as documented by Backpack. Explicitly register each
project through the owner CLI before serving it. Do not accept project enrollment
or filesystem paths from a remote caller. Binding file shape:

```json
[{"tenantId":"existing-tenant","actorId":"existing-actor","project":"registered-project"}]
```

The binding file is a bounded regular file with no symlink/hardlink, at most
64 KiB and 256 unique exact bindings. It is reread during every guarded tool call.
Removing a binding refuses subsequent reads without restart. Root authority is
also reread by Backpack; its store does not grant tenant permission.

Legacy is optional for a Backpack-only deployment. Omit `LEGACY_BASE_URL` and keep
departments disabled when those transports are not configured. Enabled departments
still require their real Legacy and departmental configuration. No placeholder
Legacy URL is needed. Shutdown drains MCP ownership before closing Backpack.

## Discover and use the tools

Connect to the actual HTTPS `/mcp` endpoint using the host's supported authenticated
remote MCP configuration. Read protected-resource metadata at
`/.well-known/oauth-protected-resource`. Validate the account/tenant's real connection
before claiming browser/mobile availability. A local TCP qualification is not deployment.

The nine reads are `mgr_backpack_context`, `mgr_backpack_brief`,
`mgr_backpack_audit`, `mgr_backpack_report`, `mgr_backpack_tasks`,
`mgr_backpack_memory`, `mgr_backpack_capability_card`,
`mgr_backpack_capability_map` and `mgr_backpack_capability_draft`.
Single-project calls use `project`; report additionally requires `task`. Map requires
an explicit list of 1–10 authorized project IDs. Draft requires owner descriptions
and 1–8 source evidence paths. It proposes a card and never writes or certifies it.
Use Backpack's embedded manual for exact schemas. No remote execution/write tool
is registered by this adapter. Descriptions and current hashes do not grant authority.

The edge rechecks the original credential, actor, tenant, audience, scope, expiry,
project binding and root before/after reads. Caller identity fields cannot replace
the verified principal. Responses are bounded; failures withhold project contents.

## Verify the real startup locally

Set `MGR_BACKPACK_TOOLKIT_ROOT` to the reviewed companion checkout, then run:

```powershell
node --import tsx scripts/verify-backpack-domain.ts
npm run verify
```

The first command starts the actual normal HTTP process with an owned SQLite
store, signed synthetic JWTs and local JWKS service. It checks nine tool registration,
context, wrong actor/tenant/scope, binding removal/restoration, token expiry and
unchanged source. It uses local TCP to emulate the HTTPS reverse proxy's public
Host and resource URL; no TLS, public OAuth account, provider or deployment is claimed.
It force-stops its owned child on Windows; lifecycle acknowledgment is separately
tested by the shutdown controller tests. Temporary cleanup is restricted to its
newly created directory. `MGR_ONE_TEST_ROOT` selects the exact compatible Tevin
source for the separate owner-startup tests; build that source first. Never point
this check at another agent's changing work and then call it an accepted release.


For packaged service builds and the separately gated real runtime check, read [BACKPACK-CONTAINER.md](BACKPACK-CONTAINER.md). Container source exists; no actual image/container is qualified on the current host yet.
