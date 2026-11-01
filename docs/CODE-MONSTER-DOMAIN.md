# Code Monster source tools through the existing API edge

The normal HTTP service can now register Code Monster's existing six read-only
source tools alongside Backpack's nine guarded context tools. This connects
source intelligence to the shared edge. MGR-ONE/Tevin still owns reasoning and
permission decisions; Code Monster owns its source observations and candidate
evidence. No new brain, scheduler, token issuer or canonical job database exists.

## What callers gain

| Tool | Purpose | Actual limit |
|---|---|---|
| `code_monster_self` | Inspect the source service's actual version and capabilities | Component metadata, not permission or intelligence certification |
| `code_monster_help` | Read bounded hashed handbook/readme pages | Reference text, never an execution grant |
| `code_monster_profile` | Inspect a permitted committed repository's source structure and coverage | Bounded JavaScript/TypeScript compiler observations; unsupported coverage stays explicit |
| `code_monster_symbols` | Find exact declarations with commit, source hash and range citations | Bounded declaration query, not proof that a feature works |
| `code_monster_references` | Follow exact compiler-bound references; ambiguous names return candidates | No lexical name merge or behavior certification |
| `code_monster_impact` | List bounded potential affected files with actual bindings separate from conservative module dependents | Review/test planning only; unsupported/dynamic behavior remains unknown |

Profile/symbol inputs use a registered `project`, optional exact `revision` or
`HEAD`, and optional narrowing `prefixes`. Symbols additionally support `symbol`,
`path`, `offset` and `limit`. Callers cannot supply a repository root, actor or
tenant. Code Monster's strict schemas reject those extra fields. No candidate
write, recipe application, model call, test command or publication tool is exposed
by this source adapter.

## Configure the trusted service host

Install reviewed API-MCP and Code Monster dependencies using their locked installs.
The host needs supported Node and Git. Keep the private configuration and binding
file outside Git and public assets. Set all three variables, or leave all absent
to disable this component:

| Variable | Host-owned path |
|---|---|
| `MGR_CODE_MONSTER_TOOLKIT_ROOT` | Absolute reviewed `@mgr/code-monster` source checkout |
| `MGR_CODE_MONSTER_CONFIG` | Absolute private project configuration |
| `MGR_CODE_MONSTER_BINDINGS_FILE` | Absolute private actor/tenant/project bindings |

Example shapes only; replace these placeholders through the owner's existing
configuration process. A file does not itself establish an authenticated account.

```json
{"projects":[{"id":"reviewed-project","root":"C:/approved/repositories/reviewed-project"}]}
```

```json
[{"tenantId":"existing-tenant","actorId":"existing-actor","project":"reviewed-project"}]
```

The configuration uses Code Monster's existing local project resolver. Roots are
bound at startup; removal takes effect during subsequent reads, while new or
rebound roots require a reviewed service restart. The binding file uses the same
bounded regular-file validation as Backpack, but is explicitly selected for this
component. Duplicate identities, extra keys, hardlinks and symlinks refuse. Each
grant is for that exact actor, tenant and registered project.

Use the existing OAuth/JWKS provider and HTTPS endpoint described in
[BACKPACK-DOMAIN.md](BACKPACK-DOMAIN.md). Add `code-monster:read` to the intended
advertised/issued scopes without discarding the host's existing scopes. Every tool
requires both `tools:read` and `code-monster:read`; project analysis also requires
its exact binding. A Backpack scope or binding never grants Code Monster access.

The original request credential is reverified before and after the read. Identity,
audience, scopes, expiry, binding and root checks remain current. A revoked or
changed principal withholds the result. There is one analysis admission across
the entire composed host, including separate HTTP handlers. That reservation
lasts through the existing owned analysis worker's completion/cleanup. Analysis
retains Code Monster's time, heap and response budgets and cancellation handling.
These are resource controls, not a hostile-code OS sandbox or global memory proof.

## Verify the actual service

```powershell
$env:MGR_BACKPACK_TOOLKIT_ROOT = 'C:/approved/MGR-BACKPACK'
$env:MGR_CODE_MONSTER_TEST_ROOT = 'C:/approved/MGR-CODE-MONSTER'
node --import tsx scripts/verify-four-repo-edge.ts
```

This starts the normal HTTP entrypoint against owned temporary SQLite and Git
fixtures, real signed synthetic JWTs and a local JWKS server. It checks both
toolkits, actual compiler/symbol output, independent scopes and bindings, wrong
actor/tenant, forbidden caller identity/root fields, revocation and unchanged Git.
It emulates the public HTTPS proxy over local TCP. It makes no provider/model or
real GitHub publication call and establishes no hosted TLS/OAuth account acceptance.

For API regression, set `MGR_CODE_MONSTER_TEST_ROOT` to the reviewed toolkit and
run `npm run verify`. The actual source-service test otherwise reports an explicit
skip. Existing ONE startup tests separately require `MGR_ONE_TEST_ROOT` and qualify
only that exact pinned source, not the newer changing Tevin implementation.

## Operation and recovery

On a busy, expired, revoked, canceled or over-budget read, the service returns a
fixed error and withholds source observations. Do not present it as a completed
analysis. Inspect the configured source, current authorization and resource state
before another read. This adapter creates no provider effect to replay or job to
close. Shutdown drains the existing MCP host before closing its domain adapters.

The default Backpack-only image does not ship Code Monster or Git. Enabling these
variables in that image alone is insufficient. A reviewed image containing Git,
the Code Monster toolkit/dependencies and explicit private root/config mounts
requires its own build/runtime qualification. The owner has deferred the Windows
restart; no actual combined container or worker-host qualification is claimed.
Deploy/connect the real HTTPS service and exercise the intended account before
claiming browser/mobile or current Tevin access.


Container packaging is implemented as the optional Dockerfile.code-monster layer selected by MGR_CODE_MONSTER_BUILD_ROOT in the existing local-only wrapper. See BACKPACK-CONTAINER.md. Its actual build/runtime remains unverified because the owner deferred restart. When MCP_ADVERTISED_SCOPES is absent, normal startup advertises enabled Backpack/Code Monster read scopes automatically; an explicit host list remains authoritative and should include the intended component scopes. Scope advertisement never issues a token or grants project access.
