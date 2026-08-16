import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import neo4j, { Driver, Session } from "neo4j-driver";
import { z } from "zod";

const URI = process.env.NEO4J_URI;
const USERNAME = process.env.NEO4J_USERNAME ?? "neo4j";
const PASSWORD = process.env.NEO4J_PASSWORD;
const DATABASE = process.env.NEO4J_DATABASE ?? "neo4j";

if (!URI || !PASSWORD) throw new Error("NEO4J_URI and NEO4J_PASSWORD are required");

const driver: Driver = neo4j.driver(URI, neo4j.auth.basic(USERNAME, PASSWORD));

async function runCypher(cypher: string, params: Record<string, unknown> = {}) {
  const session: Session = driver.session({ database: DATABASE });
  try {
    const result = await session.run(cypher, params);
    return result.records.map((r) =>
      Object.fromEntries(r.keys.map((k) => [k, r.get(k)]))
    );
  } finally {
    await session.close();
  }
}

const server = new McpServer({ name: "neo4j-mcp", version: "1.0.0" });

server.tool(
  "run_cypher",
  "Execute a raw Cypher query on Neo4j",
  { cypher: z.string(), params: z.record(z.unknown()).optional() },
  async ({ cypher, params = {} }) => {
    const records = await runCypher(cypher, params);
    return { content: [{ type: "text", text: JSON.stringify(records, null, 2) }] };
  }
);

server.tool(
  "create_node",
  "Create a node with a label and properties",
  { label: z.string(), properties: z.record(z.unknown()) },
  async ({ label, properties }) => {
    const records = await runCypher(
      `CREATE (n:${label} $props) RETURN n`,
      { props: properties }
    );
    return { content: [{ type: "text", text: JSON.stringify(records, null, 2) }] };
  }
);

server.tool(
  "find_nodes",
  "Find nodes by label and optional property filter",
  {
    label: z.string(),
    filter_key: z.string().optional(),
    filter_value: z.unknown().optional(),
    limit: z.number().optional(),
  },
  async ({ label, filter_key, filter_value, limit = 25 }) => {
    let cypher = `MATCH (n:${label})`;
    const params: Record<string, unknown> = {};
    if (filter_key && filter_value !== undefined) {
      cypher += ` WHERE n.${filter_key} = $val`;
      params.val = filter_value;
    }
    cypher += ` RETURN n LIMIT ${limit}`;
    const records = await runCypher(cypher, params);
    return { content: [{ type: "text", text: JSON.stringify(records, null, 2) }] };
  }
);

server.tool(
  "update_node",
  "Update properties on a node by label and match key",
  {
    label: z.string(),
    match_key: z.string(),
    match_value: z.string(),
    updates: z.record(z.unknown()),
  },
  async ({ label, match_key, match_value, updates }) => {
    const records = await runCypher(
      `MATCH (n:${label} {${match_key}: $matchVal}) SET n += $updates RETURN n`,
      { matchVal: match_value, updates }
    );
    return { content: [{ type: "text", text: JSON.stringify(records, null, 2) }] };
  }
);

server.tool(
  "delete_node",
  "Delete a node and its relationships by label and match key",
  { label: z.string(), match_key: z.string(), match_value: z.string() },
  async ({ label, match_key, match_value }) => {
    await runCypher(
      `MATCH (n:${label} {${match_key}: $val}) DETACH DELETE n`,
      { val: match_value }
    );
    return { content: [{ type: "text", text: `Node :${label} {${match_key}: ${match_value}} deleted.` }] };
  }
);

server.tool(
  "create_relationship",
  "Create a relationship between two nodes",
  {
    from_label: z.string(),
    from_key: z.string(),
    from_value: z.string(),
    rel_type: z.string(),
    to_label: z.string(),
    to_key: z.string(),
    to_value: z.string(),
    properties: z.record(z.unknown()).optional(),
  },
  async ({ from_label, from_key, from_value, rel_type, to_label, to_key, to_value, properties = {} }) => {
    const records = await runCypher(
      `MATCH (a:${from_label} {${from_key}: $fromVal}), (b:${to_label} {${to_key}: $toVal})
       CREATE (a)-[r:${rel_type} $props]->(b) RETURN r`,
      { fromVal: from_value, toVal: to_value, props: properties }
    );
    return { content: [{ type: "text", text: JSON.stringify(records, null, 2) }] };
  }
);

server.tool(
  "find_relationships",
  "Find relationships from a node by type",
  {
    label: z.string(),
    match_key: z.string(),
    match_value: z.string(),
    rel_type: z.string().optional(),
    direction: z.enum(["out", "in", "both"]).optional(),
  },
  async ({ label, match_key, match_value, rel_type, direction = "out" }) => {
    const relPart = rel_type ? `[r:${rel_type}]` : "[r]";
    const pattern =
      direction === "out" ? `(n)-${relPart}->(m)` :
      direction === "in" ? `(n)<-${relPart}-(m)` :
      `(n)-${relPart}-(m)`;
    const records = await runCypher(
      `MATCH (n:${label} {${match_key}: $val}) MATCH ${pattern} RETURN r, m LIMIT 50`,
      { val: match_value }
    );
    return { content: [{ type: "text", text: JSON.stringify(records, null, 2) }] };
  }
);

server.tool(
  "get_schema",
  "Get all labels, relationship types, and property keys in the graph",
  {},
  async () => {
    const [labels, relTypes, propKeys] = await Promise.all([
      runCypher("CALL db.labels() YIELD label RETURN collect(label) AS labels"),
      runCypher("CALL db.relationshipTypes() YIELD relationshipType RETURN collect(relationshipType) AS relTypes"),
      runCypher("CALL db.propertyKeys() YIELD propertyKey RETURN collect(propertyKey) AS propKeys"),
    ]);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ labels: labels[0], relTypes: relTypes[0], propKeys: propKeys[0] }, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "shortest_path",
  "Find shortest path between two nodes",
  {
    from_label: z.string(),
    from_key: z.string(),
    from_value: z.string(),
    to_label: z.string(),
    to_key: z.string(),
    to_value: z.string(),
    max_depth: z.number().optional(),
  },
  async ({ from_label, from_key, from_value, to_label, to_key, to_value, max_depth = 6 }) => {
    const records = await runCypher(
      `MATCH (a:${from_label} {${from_key}: $fromVal}), (b:${to_label} {${to_key}: $toVal})
       MATCH p = shortestPath((a)-[*1..${max_depth}]-(b)) RETURN p`,
      { fromVal: from_value, toVal: to_value }
    );
    return { content: [{ type: "text", text: JSON.stringify(records, null, 2) }] };
  }
);

server.tool(
  "merge_node",
  "MERGE a node (create if not exists, update if exists)",
  {
    label: z.string(),
    merge_key: z.string(),
    merge_value: z.string(),
    on_create_props: z.record(z.unknown()).optional(),
    on_match_props: z.record(z.unknown()).optional(),
  },
  async ({ label, merge_key, merge_value, on_create_props = {}, on_match_props = {} }) => {
    const records = await runCypher(
      `MERGE (n:${label} {${merge_key}: $val})
       ON CREATE SET n += $createProps
       ON MATCH SET n += $matchProps
       RETURN n`,
      { val: merge_value, createProps: on_create_props, matchProps: on_match_props }
    );
    return { content: [{ type: "text", text: JSON.stringify(records, null, 2) }] };
  }
);

process.on("exit", async () => { await driver.close(); });

const transport = new StdioServerTransport();
await server.connect(transport);
