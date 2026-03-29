# glaciereq-mcp-stack

Production-grade TypeScript monorepo — 5 MCP servers running in parallel.

## Packages

| Package | Tools | Description |
|---|---|---|
| `asana-mcp` | 16 | Workspaces, Projects, Tasks, Sections, Search, Users |
| `github-mcp` | 14 | Repos, Branches, Issues, PRs, Files, Commits, Actions |
| `confluence-mcp` | 11 | Spaces, Pages, Labels, Comments, Attachments |
| `supabase-mcp` | 11 | CRUD, RPC, Storage, Auth, Full-text Search |
| `neo4j-mcp` | 10 | Nodes, Relationships, Cypher, Schema, Shortest Path |

**Total: 62 tools**

## Setup

```bash
cp .env.example .env
# Fill in your credentials
npm install
npm run build
```

## Run individual servers

```bash
npm run start:asana
npm run start:github
npm run start:confluence
npm run start:supabase
npm run start:neo4j
```

## Run all servers

```bash
npm run start:all
```

## mcp.json

The `mcp.json` at repo root is pre-configured for Claude Desktop / Cursor / Windsurf.
Copy it to your MCP client's config directory and ensure `.env` is loaded.

## Architecture

```
glaciereq-mcp-stack/
├── package.json           # Workspace root
├── tsconfig.base.json     # Shared TS config (ES2022, Node16)
├── .env.example           # All env vars
├── mcp.json               # MCP client config
└── packages/
    ├── asana-mcp/         # Asana REST API
    ├── github-mcp/        # GitHub REST API
    ├── confluence-mcp/    # Confluence REST API
    ├── supabase-mcp/      # Supabase JS client
    └── neo4j-mcp/         # Neo4j Bolt driver
```
