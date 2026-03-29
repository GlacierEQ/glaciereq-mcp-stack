import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = "https://api.github.com";
const TOKEN = process.env.GITHUB_TOKEN;
const USER = process.env.GITHUB_USER ?? "GlacierEQ";

if (!TOKEN) throw new Error("GITHUB_TOKEN is required");

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

async function gh(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 204)
    throw new Error(`GH ${method} ${path} → ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

const server = new McpServer({ name: "github-mcp", version: "1.0.0" });

server.tool(
  "list_repos",
  "List all repos for GlacierEQ",
  {
    type: z.enum(["all", "public", "private", "forks", "sources"]).optional(),
    sort: z.enum(["created", "updated", "pushed", "full_name"]).optional(),
  },
  async ({ type = "all", sort = "updated" }) => {
    const data = await gh(`/users/${USER}/repos?type=${type}&sort=${sort}&per_page=100`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            data.map((r: any) => ({
              name: r.name,
              private: r.private,
              archived: r.archived,
              updated: r.updated_at,
              description: r.description,
            })),
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "get_repo",
  "Get full repo details",
  { repo: z.string() },
  async ({ repo }) => {
    const data = await gh(`/repos/${USER}/${repo}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "create_repo",
  "Create a new GitHub repository",
  {
    name: z.string(),
    description: z.string().optional(),
    private: z.boolean().optional(),
    auto_init: z.boolean().optional(),
  },
  async ({ name, description, private: isPrivate = true, auto_init = true }) => {
    const data = await gh("/user/repos", "POST", { name, description, private: isPrivate, auto_init });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "list_branches",
  "List branches in a repo",
  { repo: z.string() },
  async ({ repo }) => {
    const data = await gh(`/repos/${USER}/${repo}/branches`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "create_branch",
  "Create a new branch from a base ref",
  { repo: z.string(), branch: z.string(), from_branch: z.string().optional() },
  async ({ repo, branch, from_branch = "main" }) => {
    const base = await gh(`/repos/${USER}/${repo}/git/ref/heads/${from_branch}`);
    const sha = base.object.sha;
    const data = await gh(`/repos/${USER}/${repo}/git/refs`, "POST", {
      ref: `refs/heads/${branch}`,
      sha,
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "list_issues",
  "List issues in a repo",
  {
    repo: z.string(),
    state: z.enum(["open", "closed", "all"]).optional(),
    labels: z.string().optional(),
  },
  async ({ repo, state = "open", labels }) => {
    let url = `/repos/${USER}/${repo}/issues?state=${state}&per_page=50`;
    if (labels) url += `&labels=${encodeURIComponent(labels)}`;
    const data = await gh(url);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "create_issue",
  "Create a GitHub issue",
  {
    repo: z.string(),
    title: z.string(),
    body: z.string().optional(),
    labels: z.array(z.string()).optional(),
    assignees: z.array(z.string()).optional(),
  },
  async ({ repo, title, body, labels, assignees }) => {
    const data = await gh(`/repos/${USER}/${repo}/issues`, "POST", { title, body, labels, assignees });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "list_pull_requests",
  "List pull requests in a repo",
  {
    repo: z.string(),
    state: z.enum(["open", "closed", "all"]).optional(),
    base: z.string().optional(),
  },
  async ({ repo, state = "open", base }) => {
    let url = `/repos/${USER}/${repo}/pulls?state=${state}&per_page=50`;
    if (base) url += `&base=${base}`;
    const data = await gh(url);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "create_pull_request",
  "Create a pull request",
  {
    repo: z.string(),
    title: z.string(),
    head: z.string(),
    base: z.string(),
    body: z.string().optional(),
    draft: z.boolean().optional(),
  },
  async ({ repo, title, head, base, body, draft = false }) => {
    const data = await gh(`/repos/${USER}/${repo}/pulls`, "POST", { title, head, base, body, draft });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_file_contents",
  "Get file contents from a repo",
  { repo: z.string(), path: z.string(), ref: z.string().optional() },
  async ({ repo, path, ref }) => {
    let url = `/repos/${USER}/${repo}/contents/${path}`;
    if (ref) url += `?ref=${ref}`;
    const data = await gh(url);
    const content = Buffer.from(data.content, "base64").toString("utf-8");
    return { content: [{ type: "text", text: content }] };
  }
);

server.tool(
  "list_commits",
  "List recent commits on a branch",
  { repo: z.string(), branch: z.string().optional(), per_page: z.number().optional() },
  async ({ repo, branch = "main", per_page = 20 }) => {
    const data = await gh(`/repos/${USER}/${repo}/commits?sha=${branch}&per_page=${per_page}`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            data.map((c: any) => ({
              sha: c.sha.slice(0, 7),
              message: c.commit.message,
              author: c.commit.author.name,
              date: c.commit.author.date,
            })),
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "search_code",
  "Search code across GlacierEQ repos",
  { query: z.string(), repo: z.string().optional() },
  async ({ query, repo }) => {
    const q = repo ? `${query}+repo:${USER}/${repo}` : `${query}+user:${USER}`;
    const data = await gh(`/search/code?q=${encodeURIComponent(q)}&per_page=20`);
    return { content: [{ type: "text", text: JSON.stringify(data.items, null, 2) }] };
  }
);

server.tool(
  "create_release",
  "Create a GitHub release/tag",
  {
    repo: z.string(),
    tag_name: z.string(),
    name: z.string(),
    body: z.string().optional(),
    draft: z.boolean().optional(),
    prerelease: z.boolean().optional(),
  },
  async ({ repo, tag_name, name, body, draft = false, prerelease = false }) => {
    const data = await gh(`/repos/${USER}/${repo}/releases`, "POST", {
      tag_name, name, body, draft, prerelease,
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_workflow_runs",
  "Get recent GitHub Actions workflow runs",
  { repo: z.string(), workflow_id: z.string().optional(), status: z.enum(["completed", "in_progress", "queued", "all"]).optional() },
  async ({ repo, workflow_id, status }) => {
    let url = workflow_id
      ? `/repos/${USER}/${repo}/actions/workflows/${workflow_id}/runs?per_page=10`
      : `/repos/${USER}/${repo}/actions/runs?per_page=10`;
    if (status && status !== "all") url += `&status=${status}`;
    const data = await gh(url);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
