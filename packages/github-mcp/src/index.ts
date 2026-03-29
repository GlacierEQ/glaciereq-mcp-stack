import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE  = "https://api.github.com";
const TOKEN = process.env.GITHUB_TOKEN!;
const USER  = process.env.GITHUB_USER ?? "GlacierEQ";

if (!TOKEN) throw new Error("GITHUB_TOKEN is required");

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

async function gh(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 204)
    throw new Error(`GH ${method} ${path} → ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

const server = new McpServer({ name: "github-mcp", version: "1.0.0" });

server.tool("list_repos", "List all repos for the configured user",
  { type: z.enum(["all","public","private","forks","sources"]).optional(), sort: z.enum(["created","updated","pushed","full_name"]).optional() },
  async ({ type = "all", sort = "updated" }) => {
    const d = await gh(`/users/${USER}/repos?type=${type}&sort=${sort}&per_page=100`);
    const slim = d.map((r: any) => ({ name: r.name, private: r.private, archived: r.archived, updated: r.updated_at, description: r.description, language: r.language }));
    return { content: [{ type: "text", text: JSON.stringify(slim, null, 2) }] };
  }
);

server.tool("get_repo", "Get full repository details",
  { repo: z.string() },
  async ({ repo }) => {
    const d = await gh(`/repos/${USER}/${repo}`);
    return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
  }
);

server.tool("get_file", "Get file contents from a repo",
  { repo: z.string(), path: z.string(), ref: z.string().optional() },
  async ({ repo, path, ref }) => {
    const q = ref ? `?ref=${ref}` : "";
    const d = await gh(`/repos/${USER}/${repo}/contents/${path}${q}`);
    const content = Buffer.from(d.content, "base64").toString("utf-8");
    return { content: [{ type: "text", text: content }] };
  }
);

server.tool("create_or_update_file", "Create or update a file in a repo",
  { repo: z.string(), path: z.string(), content: z.string(), message: z.string(), branch: z.string().optional(), sha: z.string().optional() },
  async ({ repo, path, content, message, branch, sha }) => {
    const encoded = Buffer.from(content).toString("base64");
    const body: any = { message, content: encoded };
    if (branch) body.branch = branch;
    if (sha)    body.sha    = sha;
    const d = await gh(`/repos/${USER}/${repo}/contents/${path}`, "PUT", body);
    return { content: [{ type: "text", text: JSON.stringify(d?.content?.name ?? "updated", null, 2) }] };
  }
);

server.tool("list_issues", "List issues in a repo",
  { repo: z.string(), state: z.enum(["open","closed","all"]).optional(), labels: z.string().optional() },
  async ({ repo, state = "open", labels }) => {
    let url = `/repos/${USER}/${repo}/issues?state=${state}&per_page=50`;
    if (labels) url += `&labels=${encodeURIComponent(labels)}`;
    const d = await gh(url);
    return { content: [{ type: "text", text: JSON.stringify(d.map((i: any) => ({ number: i.number, title: i.title, state: i.state, labels: i.labels.map((l: any) => l.name), created: i.created_at })), null, 2) }] };
  }
);

server.tool("create_issue", "Create a GitHub issue",
  { repo: z.string(), title: z.string(), body: z.string().optional(), labels: z.array(z.string()).optional(), assignees: z.array(z.string()).optional() },
  async ({ repo, title, body, labels, assignees }) => {
    const d = await gh(`/repos/${USER}/${repo}/issues`, "POST", { title, body, labels, assignees });
    return { content: [{ type: "text", text: JSON.stringify({ number: d.number, url: d.html_url, title: d.title }, null, 2) }] };
  }
);

server.tool("list_pull_requests", "List PRs in a repo",
  { repo: z.string(), state: z.enum(["open","closed","all"]).optional(), base: z.string().optional() },
  async ({ repo, state = "open", base }) => {
    let url = `/repos/${USER}/${repo}/pulls?state=${state}&per_page=50`;
    if (base) url += `&base=${base}`;
    const d = await gh(url);
    return { content: [{ type: "text", text: JSON.stringify(d.map((p: any) => ({ number: p.number, title: p.title, state: p.state, head: p.head.ref, base: p.base.ref, created: p.created_at })), null, 2) }] };
  }
);

server.tool("create_pull_request", "Create a pull request",
  { repo: z.string(), title: z.string(), head: z.string(), base: z.string(), body: z.string().optional(), draft: z.boolean().optional() },
  async ({ repo, title, head, base, body, draft }) => {
    const d = await gh(`/repos/${USER}/${repo}/pulls`, "POST", { title, head, base, body, draft });
    return { content: [{ type: "text", text: JSON.stringify({ number: d.number, url: d.html_url, title: d.title }, null, 2) }] };
  }
);

server.tool("list_branches", "List branches in a repo",
  { repo: z.string() },
  async ({ repo }) => {
    const d = await gh(`/repos/${USER}/${repo}/branches?per_page=100`);
    return { content: [{ type: "text", text: JSON.stringify(d.map((b: any) => ({ name: b.name, sha: b.commit.sha, protected: b.protected })), null, 2) }] };
  }
);

server.tool("create_branch", "Create a new branch from a ref",
  { repo: z.string(), branch: z.string(), from_sha: z.string() },
  async ({ repo, branch, from_sha }) => {
    const d = await gh(`/repos/${USER}/${repo}/git/refs`, "POST", { ref: `refs/heads/${branch}`, sha: from_sha });
    return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
  }
);

server.tool("search_code", "Search code across GlacierEQ repos",
  { query: z.string(), repo: z.string().optional() },
  async ({ query, repo }) => {
    const q = repo ? `${query}+repo:${USER}/${repo}` : `${query}+user:${USER}`;
    const d = await gh(`/search/code?q=${encodeURIComponent(q)}&per_page=20`);
    return { content: [{ type: "text", text: JSON.stringify(d.items.map((i: any) => ({ repo: i.repository.name, path: i.path, url: i.html_url })), null, 2) }] };
  }
);

server.tool("list_commits", "List commits on a branch",
  { repo: z.string(), branch: z.string().optional(), per_page: z.number().optional() },
  async ({ repo, branch = "main", per_page = 20 }) => {
    const d = await gh(`/repos/${USER}/${repo}/commits?sha=${branch}&per_page=${per_page}`);
    return { content: [{ type: "text", text: JSON.stringify(d.map((c: any) => ({ sha: c.sha.slice(0,7), message: c.commit.message.split("\n")[0], author: c.commit.author.name, date: c.commit.author.date })), null, 2) }] };
  }
);

server.tool("get_latest_release", "Get latest release for a repo",
  { repo: z.string() },
  async ({ repo }) => {
    const d = await gh(`/repos/${USER}/${repo}/releases/latest`);
    return { content: [{ type: "text", text: JSON.stringify({ tag: d.tag_name, name: d.name, published: d.published_at, url: d.html_url }, null, 2) }] };
  }
);

server.tool("list_workflow_runs", "List GitHub Actions workflow runs",
  { repo: z.string(), workflow_id: z.string().optional(), status: z.enum(["completed","in_progress","queued","failure","success"]).optional() },
  async ({ repo, workflow_id, status }) => {
    const base = workflow_id
      ? `/repos/${USER}/${repo}/actions/workflows/${workflow_id}/runs`
      : `/repos/${USER}/${repo}/actions/runs`;
    const q = status ? `?status=${status}&per_page=20` : "?per_page=20";
    const d = await gh(`${base}${q}`);
    return { content: [{ type: "text", text: JSON.stringify(d.workflow_runs?.map((r: any) => ({ id: r.id, name: r.name, status: r.status, conclusion: r.conclusion, created: r.created_at, url: r.html_url })), null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
