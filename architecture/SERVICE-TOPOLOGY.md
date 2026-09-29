# MGR Service / Repo / Domain Topology

A Git repository is not automatically a public product or a domain.

## Recommended logical topology
- user-facing products: iKickItz, MGR Elite, TIME/MGR Agents, Create Loco where marketed
- shared external edge: MGR-API-MCP
- shared internal creation/control plane: MGR Creation OS
- shared controller: Brain/CoI inside API-MCP initially
- project-specific UI/workflows stay in their product repo

## Domain pattern
One platform can expose multiple services:
- app/product domain for user-facing UI
- api.<domain> for the public/private API edge
- api.<domain>/mcp or mcp.<domain> for MCP
- create.<domain> only if Create Loco is marketed as a distinct product
- Creation OS and Brain do not require public websites; they may remain private services

Exact domains are a deployment/brand decision, not a repo requirement.

## Repo strategy
Keep current product repos separate. Do not merge the entire ecosystem into one mega-repo merely to make it feel unified.

Unify through versioned contracts/packages, API/SDK/MCP, shared schemas, provider/capability registry, auth/tenant identity, event/trace IDs and compatibility tests.

## Plain-English map
MGR-API-MCP = front door / switchboard.
Brain = dispatcher / manager.
Creation OS = factory engine / backstage production system.
Create Loco = visual/web reconstruction shop using the factory.
MGR Agents = business workforce using the dispatcher and factory.
Product apps = storefronts/consumers of the shared systems.
