import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY)
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const server = new McpServer({ name: "supabase-mcp", version: "1.0.0" });

// ── DATA OPERATIONS ─────────────────────────────────────────────────────────
server.tool(
  "query_table",
  "Query rows from a Supabase table with optional filters",
  {
    table: z.string(),
    select: z.string().optional(),
    filter_column: z.string().optional(),
    filter_value: z.string().optional(),
    limit: z.number().optional(),
    order_by: z.string().optional(),
    ascending: z.boolean().optional(),
  },
  async ({ table, select = "*", filter_column, filter_value, limit = 100, order_by, ascending = false }) => {
    let q = adminClient.from(table).select(select).limit(limit);
    if (filter_column && filter_value) q = q.eq(filter_column, filter_value);
    if (order_by) q = q.order(order_by, { ascending });
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "insert_row",
  "Insert a row into a Supabase table",
  { table: z.string(), row: z.record(z.unknown()) },
  async ({ table, row }) => {
    const { data, error } = await adminClient.from(table).insert(row).select();
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "update_rows",
  "Update rows in a Supabase table",
  {
    table: z.string(),
    updates: z.record(z.unknown()),
    filter_column: z.string(),
    filter_value: z.string(),
  },
  async ({ table, updates, filter_column, filter_value }) => {
    const { data, error } = await adminClient
      .from(table)
      .update(updates)
      .eq(filter_column, filter_value)
      .select();
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "delete_rows",
  "Delete rows from a Supabase table",
  { table: z.string(), filter_column: z.string(), filter_value: z.string() },
  async ({ table, filter_column, filter_value }) => {
    const { error } = await adminClient.from(table).delete().eq(filter_column, filter_value);
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: `Rows deleted from ${table} where ${filter_column}=${filter_value}` }] };
  }
);

server.tool(
  "rpc_call",
  "Call a Supabase RPC (stored procedure/function)",
  { fn_name: z.string(), params: z.record(z.unknown()).optional() },
  async ({ fn_name, params = {} }) => {
    const { data, error } = await adminClient.rpc(fn_name, params);
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "upsert_row",
  "Upsert (insert or update) a row in a Supabase table",
  { table: z.string(), row: z.record(z.unknown()), on_conflict: z.string().optional() },
  async ({ table, row, on_conflict }) => {
    let q = adminClient.from(table).upsert(row);
    if (on_conflict) q = adminClient.from(table).upsert(row, { onConflict: on_conflict });
    const { data, error } = await q.select();
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── STORAGE ──────────────────────────────────────────────────────────────────
server.tool(
  "list_storage_buckets",
  "List all Supabase Storage buckets",
  {},
  async () => {
    const { data, error } = await adminClient.storage.listBuckets();
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "list_storage_files",
  "List files in a storage bucket/path",
  { bucket: z.string(), path: z.string().optional() },
  async ({ bucket, path = "" }) => {
    const { data, error } = await adminClient.storage.from(bucket).list(path);
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_public_url",
  "Get public URL for a storage file",
  { bucket: z.string(), path: z.string() },
  async ({ bucket, path }) => {
    const { data } = adminClient.storage.from(bucket).getPublicUrl(path);
    return { content: [{ type: "text", text: data.publicUrl }] };
  }
);

// ── AUTH ─────────────────────────────────────────────────────────────────────
server.tool(
  "list_users",
  "List all Supabase Auth users (admin)",
  { page: z.number().optional(), per_page: z.number().optional() },
  async ({ page = 1, per_page = 50 }) => {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: per_page });
    if (error) throw new Error(error.message);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            data.users.map((u) => ({ id: u.id, email: u.email, created_at: u.created_at, last_sign_in: u.last_sign_in_at })),
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "full_text_search",
  "Full-text search on a Supabase table column",
  { table: z.string(), column: z.string(), query: z.string(), limit: z.number().optional() },
  async ({ table, column, query, limit = 20 }) => {
    const { data, error } = await adminClient
      .from(table)
      .select("*")
      .textSearch(column, query)
      .limit(limit);
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
