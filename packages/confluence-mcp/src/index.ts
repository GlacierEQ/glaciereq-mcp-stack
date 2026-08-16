import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE_URL = process.env.CONFLUENCE_BASE_URL;
const EMAIL = process.env.CONFLUENCE_EMAIL;
const API_KEY = process.env.CONFLUENCE_API_KEY;

if (!BASE_URL || !EMAIL || !API_KEY)
  throw new Error("CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, and CONFLUENCE_API_KEY are required");

const BASE = `${BASE_URL}/wiki/rest/api`;
const authHeader = "Basic " + Buffer.from(`${EMAIL}:${API_KEY}`).toString("base64");

const headers = {
  Authorization: authHeader,
  "Content-Type": "application/json",
  Accept: "application/json",
};

async function cfx(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Confluence ${method} ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

const server = new McpServer({ name: "confluence-mcp", version: "1.0.0" });

server.tool(
  "list_spaces",
  "List all Confluence spaces",
  { limit: z.number().optional(), type: z.enum(["global", "personal"]).optional() },
  async ({ limit = 50, type }) => {
    let url = `/space?limit=${limit}&expand=description.plain,homepage`;
    if (type) url += `&type=${type}`;
    const data = await cfx(url);
    return { content: [{ type: "text", text: JSON.stringify(data.results, null, 2) }] };
  }
);

server.tool(
  "get_space",
  "Get space details by key",
  { space_key: z.string() },
  async ({ space_key }) => {
    const data = await cfx(`/space/${space_key}?expand=description.plain,homepage,metadata.labels`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "search_pages",
  "Search Confluence pages with CQL",
  { cql: z.string(), limit: z.number().optional() },
  async ({ cql, limit = 25 }) => {
    const data = await cfx(`/content/search?cql=${encodeURIComponent(cql)}&limit=${limit}&expand=space,version,body.storage`);
    return { content: [{ type: "text", text: JSON.stringify(data.results, null, 2) }] };
  }
);

server.tool(
  "get_page",
  "Get a Confluence page by ID",
  { page_id: z.string(), include_body: z.boolean().optional() },
  async ({ page_id, include_body = true }) => {
    const expand = include_body
      ? "body.storage,version,space,ancestors,children.page"
      : "version,space,ancestors";
    const data = await cfx(`/content/${page_id}?expand=${expand}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "create_page",
  "Create a new Confluence page",
  {
    space_key: z.string(),
    title: z.string(),
    body_html: z.string(),
    parent_id: z.string().optional(),
  },
  async ({ space_key, title, body_html, parent_id }) => {
    const payload: any = {
      type: "page",
      title,
      space: { key: space_key },
      body: { storage: { value: body_html, representation: "storage" } },
    };
    if (parent_id) payload.ancestors = [{ id: parent_id }];
    const data = await cfx("/content", "POST", payload);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "update_page",
  "Update an existing Confluence page",
  {
    page_id: z.string(),
    title: z.string(),
    body_html: z.string(),
    version_number: z.number(),
  },
  async ({ page_id, title, body_html, version_number }) => {
    const data = await cfx(`/content/${page_id}`, "PUT", {
      version: { number: version_number },
      title,
      type: "page",
      body: { storage: { value: body_html, representation: "storage" } },
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "delete_page",
  "Delete a Confluence page",
  { page_id: z.string() },
  async ({ page_id }) => {
    await cfx(`/content/${page_id}`, "DELETE");
    return { content: [{ type: "text", text: `Page ${page_id} deleted.` }] };
  }
);

server.tool(
  "add_label_to_page",
  "Add labels to a Confluence page",
  { page_id: z.string(), labels: z.array(z.string()) },
  async ({ page_id, labels }) => {
    const payload = labels.map((name) => ({ prefix: "global", name }));
    const data = await cfx(`/content/${page_id}/label`, "POST", payload);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_page_children",
  "Get child pages of a Confluence page",
  { page_id: z.string() },
  async ({ page_id }) => {
    const data = await cfx(`/content/${page_id}/child/page?expand=version,space`);
    return { content: [{ type: "text", text: JSON.stringify(data.results, null, 2) }] };
  }
);

server.tool(
  "add_comment_to_page",
  "Add a comment to a Confluence page",
  { page_id: z.string(), comment_html: z.string() },
  async ({ page_id, comment_html }) => {
    const data = await cfx("/content", "POST", {
      type: "comment",
      container: { id: page_id, type: "page" },
      body: { storage: { value: comment_html, representation: "storage" } },
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_attachments",
  "Get attachments for a Confluence page",
  { page_id: z.string() },
  async ({ page_id }) => {
    const data = await cfx(`/content/${page_id}/child/attachment`);
    return { content: [{ type: "text", text: JSON.stringify(data.results, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
