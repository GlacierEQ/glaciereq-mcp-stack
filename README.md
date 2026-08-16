# GlacierEQ MCP Stack

**Dual-plane MCP laboratory:** verified in-process allow-list router **plus** restored credential-gated stdio MCP server packages.

This repository is **not** a GlacierEQ-wide agent mesh and does **not** claim a production multi-tenant MCP cloud. Governance routes power; it does not amputate mechanisms.

## Planes

| Plane | Capability | Evidence token | How to prove |
|---|---|---|---|
| **VERIFIED** | `policy-gated-local-tool-dispatch` | `LOCAL_ALLOWLIST_ROUTER_NOT_EXTERNAL_MCP_DEPLOYMENT` | `bash scripts/ci/verify.sh` |
| **IMPLEMENTED** | `credentialed-stdio-mcp-server-packages` | `MCP_PACKAGES_RESTORED_CREDENTIAL_GATED_NOT_ESTATE_MESH` | packages present + `npm` build; servers start only with credentials |

### Verified plane — local router

Canonical module: [`src/mcp_router.py`](src/mcp_router.py)

- explicit registration without implicit execution authority
- separate execution allow-list
- mutation gate for write tools
- fail-closed dispatch without leaking exception text

```python
from src.mcp_router import Router, Tool
router = Router()
router.register(Tool("ping", lambda: "pong"), allowed=True)
assert router.call("ping")["result"] == "pong"
assert router.call("ping")["evidence"] == "LOCAL_ALLOWLIST_ROUTER_NOT_EXTERNAL_MCP_DEPLOYMENT"
```

### Implemented plane — restored MCP packages

Restored from pre-neutralization donor (`7ca6ef0^`) under counter-engineering recovery for incident `ESTATE_CAPABILITY_NEUTRALIZATION_2026-08-15`:

| Package | Role |
|---|---|
| `packages/github-mcp` | GitHub API tools over stdio MCP |
| `packages/asana-mcp` | Asana tools over stdio MCP |
| `packages/confluence-mcp` | Confluence tools over stdio MCP |
| `packages/supabase-mcp` | Supabase tools over stdio MCP |
| `packages/neo4j-mcp` | Neo4j tools over stdio MCP |
| `packages/shared` | shared env/logger/retry |

Root orchestration:

- `package.json` workspaces + start scripts
- `mcp.json` client wiring template
- `docker/*` Dockerfiles + compose
- `ecosystem.config.cjs` process manager template
- `scripts/health-check.ts` health probe

Servers require environment credentials and are **not** asserted as currently deployed.

```bash
npm install
npm run build
# only with credentials:
# npm run start:github
```

The TypeScript gateway is preserved as reference source (`src/mcp_gateway.ts`); it is not promoted as protocol-complete without a dedicated TS proof surface.

## Native proof

```bash
bash scripts/ci/verify.sh
```

Public Truth Gate verifies the **verified plane** and that the **implemented plane** source tree was not re-amputated.

## Nonclaims

- Not an estate-wide MCP mesh deployment
- Not proof that third-party APIs are connected without credentials
- Not a substitute for host-level allow-lists and secret management
- Not affiliated with any MCP vendor product beyond standard protocol use

## Counter-engineering note

April 2026 `APEX Upgrade: Automated Sync` deleted the package tree to satisfy a narrower truth surface. That pattern is prohibited. Recovery restores mechanisms and expands the truth model (dual-plane) instead of deleting product to match the smallest harness.
