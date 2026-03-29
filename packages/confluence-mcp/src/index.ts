import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE  = process.env.CONFLUENCE_BASE_URL!;
const EMAIL = process.env.CONFLUENCE_EMAIL!;
const KEY   = process.env.CONFLUENCE_API_KEY!;

if (!BASE || !EMAIL || !KEY) throw new Error("CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, CONFLUENCE_API_KEY required");

const AUTH = Buffer.from(`${EMAIL}:${KEY}`).toString("base64");
const headers = {
  Authorization: `Basic ${AUTH}`,
  "Content-Type": "application/json",
  Accept: "application/json",
};

async function cf(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${BASE}/wiki/rest/api${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Confluence ${method} ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

const server = new McpServer({ name: "confluence-mcp", version: "1.0.0" });

server.tool("list_spaces", "List all Confluence spaces",
  { type: z.enum(["global","personal"]).optional(), limit: z.number().optional() },
  async ({ type, limit = 50 }) => {
    const q = type ? `?type=${type}&limit=${limit}` : `?limit=${limit}`;
    const d = await cf(`/space${q}`);
    return { content: [{ type: "text", text: JSON.stringify(d.results.map((s: any) => ({ key: s.key, name: s.name, type: s.type })), null, 2) }] };
  }
);

server.tool("search_pages", "Search Confluence pages with CQL",
  { query: z.string(), space_key: z.string().optional(), limit: z.number().optional() },
  async ({ query, space_key, limit = 25 }) => {
    const cql = space_key ? `space=${space_key} AND text~"${query}"` : `text~"${query}"`;
    const d = await cf(`/content/search?cql=${encodeURIComponent(cql)}&limit=${limit}&expand=space,version`);
    return { content: [{ type: "text", text: JSON.stringify(d.results.map((p: any) => ({ id: p.id, title: p.title, space: p.space?.key, url: p._links?.webui })), null, 2) }] };
  }
);

server.tool("get_page", "Get Confluence page content",
  { page_id: z.string(), expand_body: z.boolean().optional() },
  async ({ page_id, expand_body = true }) => {
    const expand = expand_body ? "body.storage,version,space,ancestors" : "version,space";
    const d = await cf(`/content/${page_id}?expand=${expand}`);
    return { content: [{ type: "text", text: JSON.stringify({ id: d.id, title: d.title, space: d.space?.key, version: d.version?.number, body: d.body?.storage?.value }, null, 2) }] };
  }
);

server.tool("create_page", "Create a new Confluence page",
  { space_key: z.string(), title: z.string(), body_html: z.string(), parent_id: z.string().optional() },
  async ({ space_key, title, body_html, parent_id }) => {
    const body: any = {
      type: "page",
      title,
      space: { key: space_key },
      body: { storage: { value: body_html, representation: "storage" } },
    };
    if (parent_id) body.ancestors = [{ id: parent_id }];
    const d = await cf("/content", "POST", body);
    return { content: [{ type: "text", text: JSON.stringify({ id: d.id, title: d.title, url: d._links?.webui }, null, 2) }] };
  }
);

server.tool("update_page", "Update an existing page (requires current version)",
  { page_id: z.string(), title: z.string(), body_html: z.string(), version_number: z.number() },
  async ({ page_id, title, body_html, version_number }) => {
    const d = await cf(`/content/${page_id}`, "PUT", {
      version: { number: version_number + 1 },
      title, type: "page",
      body: { storage: { value: body_html, representation: "storage" } },
    });
    return { content: [{ type: "text", text: JSON.stringify({ id: d.id, title: d.title, version: d.version?.number }, null, 2) }] };
  }
);

server.tool("get_page_children", "Get child pages of a page",
  { page_id: z.string() },
  async ({ page_id }) => {
    const d = await cf(`/content/${page_id}/child/page?limit=50`);
    return { content: [{ type: "text", text: JSON.stringify(d.results.map((p: any) => ({ id: p.id, title: p.title })), null, 2) }] };
  }
);

server.tool("add_label", "Add a label to a page",
  { page_id: z.string(), label: z.string() },
  async ({ page_id, label }) => {
    const d = await cf(`/content/${page_id}/label`, "POST", [{ prefix: "global", name: label }]);
    return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
  }
);

server.tool("get_comments", "Get comments on a page",
  { page_id: z.string() },
  async ({ page_id }) => {
    const d = await cf(`/content/${page_id}/child/comment?expand=body.view,version&limit=50`);
    return { content: [{ type: "text", text: JSON.stringify(d.results.map((c: any) => ({ id: c.id, body: c.body?.view?.value, version: c.version?.number })), null, 2) }] };
  }
);

server.tool("add_comment", "Add a comment to a page",
  { page_id: z.string(), body_html: z.string() },
  async ({ page_id, body_html }) => {
    const d = await cf("/content", "POST", {
      type: "comment",
      container: { id: page_id, type: "page" },
      body: { storage: { value: body_html, representation: "storage" } },
    });
    return { content: [{ type: "text", text: JSON.stringify({ id: d.id }, null, 2) }] };
  }
);

server.tool("get_attachments", "Get attachments for a page",
  { page_id: z.string() },
  async ({ page_id }) => {
    const d = await cf(`/content/${page_id}/child/attachment?limit=50`);
    return { content: [{ type: "text", text: JSON.stringify(d.results.map((a: any) => ({ id: a.id, title: a.title, mediaType: a.metadata?.mediaType, size: a.extensions?.fileSize })), null, 2) }] };
  }
);

server.tool("list_templates", "List page templates in a space",
  { space_key: z.string() },
  async ({ space_key }) => {
    const d = await cf(`/template/page?spaceKey=${space_key}&limit=50`);
    return { content: [{ type: "text", text: JSON.stringify(d.results?.map((t: any) => ({ id: t.templateId, name: t.name, description: t.description })), null, 2) }] };
  }
);

server.tool("delete_page", "Delete a Confluence page",
  { page_id: z.string() },
  async ({ page_id }) => {
    await cf(`/content/${page_id}`, "DELETE");
    return { content: [{ type: "text", text: `Page ${page_id} deleted.` }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
