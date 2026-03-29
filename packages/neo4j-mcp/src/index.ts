import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import neo4j, { Driver, Session } from "neo4j-driver";

const URI  = process.env.NEO4J_URI!;
const USER = process.env.NEO4J_USERNAME ?? "neo4j";
const PASS = process.env.NEO4J_PASSWORD!;
const DB   = process.env.NEO4J_DATABASE ?? "neo4j";

if (!URI || !PASS) throw new Error("NEO4J_URI and NEO4J_PASSWORD required");

const driver: Driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASS));

async function run(cypher: string, params: Record<string, unknown> = {}) {
  const session: Session = driver.session({ database: DB });
  try {
    const result = await session.run(cypher, params);
    return result.records.map(r => {
      const obj: Record<string, unknown> = {};
      r.keys.forEach(k => {
        const v = r.get(k);
        obj[k as string] = v?.properties ?? v;
      });
      return obj;
    });
  } finally {
    await session.close();
  }
}

const server = new McpServer({ name: "neo4j-mcp", version: "1.0.0" });

server.tool("cypher_query", "Execute any read Cypher query",
  { cypher: z.string(), params: z.record(z.unknown()).optional() },
  async ({ cypher, params }) => {
    const d = await run(cypher, params);
    return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
  }
);

server.tool("cypher_write", "Execute a write Cypher query (CREATE/MERGE/SET/DELETE)",
  { cypher: z.string(), params: z.record(z.unknown()).optional() },
  async ({ cypher, params }) => {
    const session = driver.session({ database: DB });
    try {
      const result = await session.writeTransaction(tx => tx.run(cypher, params ?? {}));
      return { content: [{ type: "text", text: JSON.stringify({ records: result.records.length, summary: result.summary.counters.updates() }, null, 2) }] };
    } finally { await session.close(); }
  }
);

server.tool("get_schema", "Get node labels, relationship types, and property keys",
  {},
  async () => {
    const [labels, relTypes, propKeys] = await Promise.all([
      run("CALL db.labels()"),
      run("CALL db.relationshipTypes()"),
      run("CALL db.propertyKeys()"),
    ]);
    return { content: [{ type: "text", text: JSON.stringify({ labels, relTypes, propKeys }, null, 2) }] };
  }
);

server.tool("create_node", "Create a node with labels and properties",
  { labels: z.array(z.string()), properties: z.record(z.unknown()) },
  async ({ labels, properties }) => {
    const labelStr = labels.map(l => `:${l}`).join("");
    const d = await run(`CREATE (n${labelStr} $props) RETURN n`, { props: properties });
    return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
  }
);

server.tool("find_nodes", "Find nodes by label and optional property filter",
  { label: z.string(), filter: z.record(z.unknown()).optional(), limit: z.number().optional() },
  async ({ label, filter, limit = 50 }) => {
    const where = filter ? "WHERE " + Object.keys(filter).map(k => `n.${k} = $${k}`).join(" AND ") : "";
    const d = await run(`MATCH (n:${label}) ${where} RETURN n LIMIT $limit`, { ...(filter ?? {}), limit });
    return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
  }
);

server.tool("create_relationship", "Create a relationship between two nodes",
  { from_id: z.string(), from_label: z.string(), to_id: z.string(), to_label: z.string(), rel_type: z.string(), properties: z.record(z.unknown()).optional() },
  async ({ from_id, from_label, to_id, to_label, rel_type, properties }) => {
    const d = await run(
      `MATCH (a:${from_label} {id: $from_id}), (b:${to_label} {id: $to_id})
       CREATE (a)-[r:${rel_type} $props]->(b) RETURN r`,
      { from_id, to_id, props: properties ?? {} }
    );
    return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
  }
);

server.tool("get_case_graph", "Get the full case graph for 1FDV-23-0001009",
  { depth: z.number().optional() },
  async ({ depth = 3 }) => {
    const d = await run(
      `MATCH path = (c:Case {id: '1FDV-23-0001009'})-[*1..${depth}]-(n)
       RETURN c, relationships(path) as rels, collect(n) as nodes`,
      {}
    );
    return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
  }
);

server.tool("find_path", "Find shortest path between two nodes",
  { from_label: z.string(), from_id: z.string(), to_label: z.string(), to_id: z.string() },
  async ({ from_label, from_id, to_label, to_id }) => {
    const d = await run(
      `MATCH p = shortestPath((a:${from_label} {id: $from_id})-[*]-(b:${to_label} {id: $to_id}))
       RETURN p, length(p) as hops`,
      { from_id, to_id }
    );
    return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
  }
);

server.tool("delete_node", "Delete a node and all its relationships",
  { label: z.string(), id: z.string() },
  async ({ label, id }) => {
    await run(`MATCH (n:${label} {id: $id}) DETACH DELETE n`, { id });
    return { content: [{ type: "text", text: `Node ${label}:${id} deleted.` }] };
  }
);

server.tool("bulk_import", "Batch MERGE nodes from an array of records",
  { label: z.string(), records: z.array(z.record(z.unknown())), id_field: z.string() },
  async ({ label, records, id_field }) => {
    const session = driver.session({ database: DB });
    try {
      let count = 0;
      const tx = session.beginTransaction();
      for (const rec of records) {
        await tx.run(`MERGE (n:${label} {${id_field}: $id}) SET n += $props`, { id: rec[id_field], props: rec });
        count++;
      }
      await tx.commit();
      return { content: [{ type: "text", text: `Merged ${count} ${label} nodes.` }] };
    } finally { await session.close(); }
  }
);

server.tool("get_node_stats", "Get count of nodes per label",
  {},
  async () => {
    const labels = await run("CALL db.labels() YIELD label RETURN label");
    const counts = await Promise.all(
      labels.map(async (row: any) => {
        const c = await run(`MATCH (n:${row.label}) RETURN count(n) as count`);
        return { label: row.label, count: (c[0] as any)?.count ?? 0 };
      })
    );
    return { content: [{ type: "text", text: JSON.stringify(counts, null, 2) }] };
  }
);

server.tool("merge_node", "MERGE a node (create if not exists, update if exists)",
  { label: z.string(), match_props: z.record(z.unknown()), set_props: z.record(z.unknown()).optional() },
  async ({ label, match_props, set_props }) => {
    const matchStr = Object.keys(match_props).map(k => `${k}: $match_${k}`).join(", ");
    const params: Record<string, unknown> = {};
    Object.entries(match_props).forEach(([k, v]) => { params[`match_${k}`] = v; });
    if (set_props) Object.entries(set_props).forEach(([k, v]) => { params[`set_${k}`] = v; });
    const setStr = set_props ? "ON CREATE SET n += $setProps ON MATCH SET n += $setProps" : "";
    if (set_props) params.setProps = set_props;
    const d = await run(`MERGE (n:${label} {${matchStr}}) ${setStr} RETURN n`, params);
    return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
  }
);

process.on("exit", () => driver.close());

const transport = new StdioServerTransport();
await server.connect(transport);
