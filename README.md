# GlacierEQ MCP Stack

**Repository-local allow-list tool-routing exhibit with explicit mutation policy and fail-closed dispatch.**

This repository does **not** establish a deployed Model Context Protocol server, live provider connections, PostgreSQL persistence, production tool execution, or a GlacierEQ-wide agent mesh. The canonical verified capability is the in-process Python router in [`src/mcp_router.py`](src/mcp_router.py).

## Verified capability

The Python router provides:

- explicit tool registration without implicit execution authority;
- a separate execution allow-list;
- a second authorization gate for mutating tools;
- duplicate/invalid registration rejection;
- bounded handler failure responses that do not echo exception text;
- deterministic local demo tools for regression testing.

Every dispatch result emits:

`LOCAL_ALLOWLIST_ROUTER_NOT_EXTERNAL_MCP_DEPLOYMENT`

Example:

```python
from mcp_router import Router, Tool

router = Router()
router.register(Tool("ping", lambda: "pong"), allowed=True)
assert router.call("ping")["result"] == "pong"
```

Registration alone does not authorize execution:

```python
router = Router()
router.register(Tool("registered", lambda: "value"))
assert router.call("registered")["error"] == "denied_or_missing"
```

## Other preserved surfaces

| Path | Current role | Evidence boundary |
|---|---|---|
| `src/mcp_router.py` | canonical verified local router | in-process routing only |
| `src/mcp_gateway.ts` | TypeScript gateway reference source | not promoted as protocol-complete or production MCP proof |
| `src/vector_search.sql` | SQL/reference artifact | no live PostgreSQL or vector backend is inferred |
| `configs/mcp.servers.template.json` | configuration template | does not prove listed servers exist or are connected |
| `.env.example` | empty credential-name template | contains no public credential proof or provider connectivity |

The TypeScript gateway is preserved as reference source. Its current implementation contains a small `initialize` handler and method-not-found branch; it is **not promoted as protocol-complete** until a repository-native TypeScript protocol test/build surface proves that behavior.

## Native proof

```bash
python -m pytest -q tests
```

The Public Truth Gate runs Python 3.11 and 3.13 on the exact pull-request head or push SHA and verifies the allow-list/mutation policy plus the public evidence boundary.

## Nonclaims

A green repository workflow does **not** establish:

- MCP specification compliance beyond the behavior directly exercised by repository tests;
- stdio/network server deployment;
- live Asana, GitHub, Confluence, Supabase, Neo4j, PostgreSQL, or other provider access;
- persistent registry/session storage;
- child-process crash isolation;
- autonomous external actions;
- live Mastermind/APEX/AKOS runtime connectivity;
- credentials, proprietary access, production authority, or third-party affiliation.

## Portfolio role

The transferable capability is **policy-gated local tool dispatch**. Architecture references to AKOS or other GlacierEQ repositories are topology/context only and do not inherit their runtime or proof state.
