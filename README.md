# 🔌 glaciereq-mcp-stack

> Production-grade TypeScript MCP server monorepo — 5 servers, 67 total tools  
> **GlacierEQ | Casey Barton | APEX Mesh v2.1**

## Servers

| Package | Tools | Description |
|---------|-------|-------------|
| `asana-mcp` | 16 | Workspaces, Projects, Tasks, Subtasks, Comments, Dependencies, Sections, Search, Users |
| `github-mcp` | 14 | Repos, Files, Issues, PRs, Branches, Search, Commits, Releases, Actions |
| `confluence-mcp` | 12 | Spaces, Pages, Search, Create/Update, Labels, Comments, Attachments, Templates |
| `supabase-mcp` | 13 | Tables, CRUD, RPC, Storage, Auth users, Realtime schema, Edge functions, SQL exec |
| `neo4j-mcp` | 12 | Nodes, Relationships, Cypher exec, Schema, Case graph, Paths, Import, Bulk ops |

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# Fill in all API keys

# 3. Build all
npm run build

# 4. Wire into Claude Desktop (copy mcp.json to ~/.claude/mcp.json)
cp mcp.json ~/.claude/mcp.json

# 5. Start individual servers
npm run start:asana
npm run start:github
# etc.
```

## Dev (no build step)
```bash
npm run dev:asana
```

## Case 1FDV-23-0001009 Graph (Neo4j)
```cypher
MATCH (c:Case {id: '1FDV-23-0001009'})-[:HAS_EVENT]->(e:Event)
RETURN c, e ORDER BY e.date
```
