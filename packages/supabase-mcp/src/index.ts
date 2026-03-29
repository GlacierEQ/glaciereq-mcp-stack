import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const URL_  = process.env.SUPABASE_URL!;
const KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!URL_ || !KEY) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");

const REST = `${URL_}/rest/v1`;
const RPC  = `${URL_}/rest/v1/rpc`;
const AUTH_EP = `${URL_}/auth/v1`;
const STORAGE = `${URL_}/storage/v1`;

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function sb(url: string, method = "GET", body?: unknown, extraHeaders?: Record<string, string>) {
  const res = await fetch(url, {
    method,
    headers: { ...headers, ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Supabase ${method} ${url} → ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const server = new McpServer({ name: "supabase-mcp", version: "1.0.0" });

server.tool("list_tables", "List all tables in the public schema",
  {},
  async () => {
    const d = await sb(`${REST}/pg_catalog.pg_tables?select=tablename,schemaname&schemaname=eq.public`);
    return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
  }
);

server.tool("select", "Query rows from a table",
  { table: z.string(), select: z.string().optional(), filter: z.string().optional(), limit: z.number().optional(), order: z.string().optional() },
  async ({ table, select = "*", filter, limit = 100, order }) => {
    let url = `${REST}/${table}?select=${select}&limit=${limit}`;
    if (filter) url += `&${filter}`;
    if (order)  url += `&order=${order}`;
    const d = await sb(url);
    return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
  }
);

server.tool("insert", "Insert one or more rows into a table",
  { table: z.string(), rows: z.array(z.record(z.unknown())) },
  async ({ table, rows }) => {
    const d = await sb(`${REST}/${table}`, "POST", rows);
    return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
  }
);

server.tool("update", "Update rows matching a filter",
  { table: z.string(), filter: z.string(), data: z.record(z.unknown()) },
  async ({ table, filter, data }) => {
    const d = await sb(`${REST}/${table}?${filter}`, "PATCH", data);
    return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
  }
);

server.tool("upsert", "Upsert rows (insert or update on conflict)",
  { table: z.string(), rows: z.array(z.record(z.unknown())), on_conflict: z.string().optional() },
  async ({ table, rows, on_conflict }) => {
    const xH: Record<string, string> = { Prefer: "resolution=merge-duplicates,return=representation" };
    if (on_conflict) xH["Prefer"] += `,on_conflict=${on_conflict}`;
    const d = await sb(`${REST}/${table}`, "POST", rows, xH);
    return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
  }
);

server.tool("delete_rows", "Delete rows matching a filter",
  { table: z.string(), filter: z.string() },
  async ({ table, filter }) => {
    await sb(`${REST}/${table}?${filter}`, "DELETE");
    return { content: [{ type: "text", text: `Deleted from ${table} where ${filter}.` }] };
  }
);

server.tool("call_rpc", "Call a Supabase RPC / stored function",
  { function_name: z.string(), params: z.record(z.unknown()).optional() },
  async ({ function_name, params }) => {
    const d = await sb(`${RPC}/${function_name}`, "POST", params ?? {});
    return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
  }
);

server.tool("exec_sql", "Execute raw SQL via the pg extension (requires pg_net or edge function)",
  { sql: z.string() },
  async ({ sql }) => {
    const d = await sb(`${RPC}/exec_sql`, "POST", { sql });
    return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
  }
);

server.tool("list_storage_buckets", "List Supabase storage buckets",
  {},
  async () => {
    const d = await sb(`${STORAGE}/bucket`);
    return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
  }
);

server.tool("list_storage_objects", "List objects in a storage bucket",
  { bucket: z.string(), prefix: z.string().optional() },
  async ({ bucket, prefix = "" }) => {
    const d = await sb(`${STORAGE}/object/list/${bucket}`, "POST", { prefix, limit: 100 });
    return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
  }
);

server.tool("list_auth_users", "List all auth users (admin only)",
  { page: z.number().optional(), per_page: z.number().optional() },
  async ({ page = 1, per_page = 50 }) => {
    const d = await sb(`${AUTH_EP}/admin/users?page=${page}&per_page=${per_page}`);
    return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
  }
);

server.tool("get_auth_user", "Get a specific auth user by ID",
  { user_id: z.string() },
  async ({ user_id }) => {
    const d = await sb(`${AUTH_EP}/admin/users/${user_id}`);
    return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
  }
);

server.tool("list_edge_functions", "List deployed Edge Functions",
  {},
  async () => {
    const d = await sb(`${URL_}/functions/v1`);
    return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
