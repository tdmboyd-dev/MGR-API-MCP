# Backpack container operations

A container packages the API service and Backpack runtime together with their
dependencies. Docker runs that package. It does not supply a model, a permission
grant, an OAuth provider or access to your computer's projects. The existing
API-MCP remains the shared service; Backpack keeps its existing context store.

## Current qualification

The Dockerfiles and bounded build/runtime qualification scripts are implemented
and syntax-checked. **No actual image build or container run is verified yet.**
On the current Windows host, the official Docker install omitted the launcher's
product-path registration; the latest administrator prompt for a bounded repair
was canceled. That repair was not executed. Do not retry it or use an alternate
registry/privilege route without renewed owner authorization. WSL/virtualization
also require restart and engine qualification. Never restart an active workstation
without its owner's chosen timing. Docker license terms require owner agreement;
this work has not accepted them or purchased a subscription.

The source HTTP integration is independently verified with real local TCP,
synthetic signed JWTs, JWKS and SQLite. This does not establish Docker, hosted
TLS/OAuth, ChatGPT browser connectivity, production readiness or Tevin acceptance.

## Build after the local engine is ready

Commit reviewed source in both checkouts first. No uncommitted or untracked files
are accepted by the build wrapper. Use a **local** Docker engine, not a remote
context: the named Backpack source context contains private source code.

```powershell
$env:MGR_BACKPACK_BUILD_ROOT = 'C:/absolute/reviewed/MGR-BACKPACK'
# Only if docker.exe is not on PATH:
$env:MGR_DOCKER_BIN = 'C:/Program Files/Docker/Docker/resources/bin/docker.exe'
node scripts/build-backpack-container.mjs C:/absolute/new/build-receipt.json
```

The script checks the engine/context and built-in local builder, records exact Git
commit/tree identities, builds unique local tags, and reads back the resulting
image ID. No image is uploaded, pushed or pruned. Initial builds download the Node
base image and pinned npm dependencies; no paid cloud service is invoked. Node's
base tag is resolved during the build; the receipt pins the resulting image ID.

The base API image uses locked installs, TypeScript checks, the local tests and
artifact/plugin checks, then runs as the non-root `node` user. Optional Tevin tests
need their separately pinned fixture and are not certified by the image build.
The Backpack layer uses a named source context and installs production dependencies.
Private stores/configuration, credentials and local development dependencies are
excluded by each context's `.dockerignore`. Source manuals and skill ship inside.

## Qualify the actual runtime

```powershell
node scripts/verify-backpack-container.mjs C:/absolute/new/build-receipt.json C:/absolute/new/runtime-receipt.json
```

This creates only owned temporary fixture folders and uniquely labeled containers.
It uses an invented fixture project and synthetic signing keys, never owner
repositories or production credentials. It checks non-root/read-only operation,
nine authenticated tools, actor/tenant/scope denial, binding revocation without
restart, token expiry, graceful stop, recreation against the same SQLite store,
unchanged ledger and unchanged source. Host HTTP emulates the public HTTPS proxy;
that remains a local transport test. It does not test hostile worker isolation.

The API container has a read-only root filesystem, no capabilities, no privilege
escalation, resource limits and only explicit fixture mounts. Its loopback port is
not exposed to the LAN. The Docker socket is never mounted. The script checks
ownership labels before removing its containers. If cleanup is unconfirmed it
preserves the fixture and records exact names for inspection. Do not remove
unrelated containers or run a system-wide cleanup to clear a failed test.

## Operate the reviewed service

Follow [BACKPACK-DOMAIN.md](BACKPACK-DOMAIN.md) for the actual authorization
provider, exact issuer, HTTPS origin, scopes and actor/tenant/project bindings.
Before serving a real project, explicitly register it through Backpack's owner CLI.
Mount its allowed root read-only, private config and binding directory read-only,
and the existing persistent store writable by the service's non-root user.
Use absolute paths **inside the container** in the mounted config, for example
`/data` and `/projects/reviewed-project`; Windows paths are not container paths.
Mount the binding directory so replacing a binding file remains visible.

Keep credentials out of image layers, build arguments, receipts, Git and chat.
Back up the persistent store through Backpack's supported procedure and verify
reopening before production use. Configure the real HTTPS proxy and existing OAuth
provider, connect the intended ChatGPT/Codex account, and exercise its authorized
reads and denials before claiming remote availability. No remote write/execute
tools are exposed by this adapter. The API container is separate from OmniDev's
existing worker fleet; it does not activate or certify those workers.
