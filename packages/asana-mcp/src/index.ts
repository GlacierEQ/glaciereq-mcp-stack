import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE  = "https://app.asana.com/api/1.0";
const TOKEN = process.env.ASANA_API_TOKEN!;

if (!TOKEN) throw new Error("ASANA_API_TOKEN is required");

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
  Accept: "application/json",
};

async function asana(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Asana ${method} ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

const server = new McpServer({ name: "asana-mcp", version: "1.0.0" });

// ── WORKSPACES ──────────────────────────────────────────────
server.tool("list_workspaces", "List all Asana workspaces", {}, async () => {
  const d = await asana("/workspaces");
  return { content: [{ type: "text", text: JSON.stringify(d.data, null, 2) }] };
});

// ── PROJECTS ────────────────────────────────────────────────
server.tool("search_projects", "Search projects in a workspace",
  { workspace_gid: z.string(), name_filter: z.string().optional() },
  async ({ workspace_gid, name_filter }) => {
    const d = await asana(`/projects?workspace=${workspace_gid}&opt_fields=gid,name,status,owner,due_date,notes`);
    const results = name_filter
      ? d.data.filter((p: any) => p.name.toLowerCase().includes(name_filter!.toLowerCase()))
      : d.data;
    return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
  }
);

server.tool("get_project", "Get full project details",
  { project_gid: z.string() },
  async ({ project_gid }) => {
    const d = await asana(`/projects/${project_gid}?opt_fields=gid,name,notes,status,owner,due_date,team,members,custom_fields`);
    return { content: [{ type: "text", text: JSON.stringify(d.data, null, 2) }] };
  }
);

server.tool("create_project", "Create a new Asana project",
  { workspace_gid: z.string(), name: z.string(), notes: z.string().optional(), due_date: z.string().optional(), team_gid: z.string().optional() },
  async ({ workspace_gid, name, notes, due_date, team_gid }) => {
    const d = await asana("/projects", "POST", { data: { workspace: workspace_gid, name, notes, due_date, team: team_gid } });
    return { content: [{ type: "text", text: JSON.stringify(d.data, null, 2) }] };
  }
);

server.tool("update_project", "Update project fields",
  { project_gid: z.string(), name: z.string().optional(), notes: z.string().optional(), due_date: z.string().optional() },
  async ({ project_gid, ...fields }) => {
    const d = await asana(`/projects/${project_gid}`, "PUT", { data: fields });
    return { content: [{ type: "text", text: JSON.stringify(d.data, null, 2) }] };
  }
);

// ── TASKS ────────────────────────────────────────────────────
server.tool("list_tasks", "List tasks in a project",
  { project_gid: z.string(), completed: z.boolean().optional(), assignee: z.string().optional() },
  async ({ project_gid, completed, assignee }) => {
    let url = `/tasks?project=${project_gid}&opt_fields=gid,name,completed,assignee,due_date,notes,tags,custom_fields`;
    if (completed !== undefined) url += `&completed=${completed}`;
    if (assignee) url += `&assignee=${assignee}`;
    const d = await asana(url);
    return { content: [{ type: "text", text: JSON.stringify(d.data, null, 2) }] };
  }
);

server.tool("get_task", "Get full task details including subtasks",
  { task_gid: z.string() },
  async ({ task_gid }) => {
    const [task, subtasks] = await Promise.all([
      asana(`/tasks/${task_gid}?opt_fields=gid,name,completed,assignee,due_date,notes,tags,custom_fields,dependencies,dependents`),
      asana(`/tasks/${task_gid}/subtasks?opt_fields=gid,name,completed,assignee,due_date`),
    ]);
    return { content: [{ type: "text", text: JSON.stringify({ ...task.data, subtasks: subtasks.data }, null, 2) }] };
  }
);

server.tool("create_task", "Create a new task",
  {
    project_gid: z.string(), name: z.string(),
    notes: z.string().optional(), assignee: z.string().optional(),
    due_date: z.string().optional(), parent_gid: z.string().optional(),
    tags: z.array(z.string()).optional(),
  },
  async ({ project_gid, name, notes, assignee, due_date, parent_gid, tags }) => {
    const d = await asana("/tasks", "POST", {
      data: { projects: [project_gid], name, notes, assignee, due_on: due_date, parent: parent_gid, tags }
    });
    return { content: [{ type: "text", text: JSON.stringify(d.data, null, 2) }] };
  }
);

server.tool("update_task", "Update task fields",
  {
    task_gid: z.string(), name: z.string().optional(), notes: z.string().optional(),
    completed: z.boolean().optional(), assignee: z.string().optional(), due_date: z.string().optional(),
  },
  async ({ task_gid, ...fields }) => {
    const body: Record<string, unknown> = {};
    if (fields.name !== undefined)      body.name      = fields.name;
    if (fields.notes !== undefined)     body.notes     = fields.notes;
    if (fields.completed !== undefined) body.completed = fields.completed;
    if (fields.assignee !== undefined)  body.assignee  = fields.assignee;
    if (fields.due_date !== undefined)  body.due_on    = fields.due_date;
    const d = await asana(`/tasks/${task_gid}`, "PUT", { data: body });
    return { content: [{ type: "text", text: JSON.stringify(d.data, null, 2) }] };
  }
);

server.tool("delete_task", "Delete a task permanently",
  { task_gid: z.string() },
  async ({ task_gid }) => {
    await asana(`/tasks/${task_gid}`, "DELETE");
    return { content: [{ type: "text", text: `Task ${task_gid} deleted.` }] };
  }
);

server.tool("add_comment", "Add a comment to a task",
  { task_gid: z.string(), text: z.string() },
  async ({ task_gid, text }) => {
    const d = await asana(`/tasks/${task_gid}/stories`, "POST", { data: { text } });
    return { content: [{ type: "text", text: JSON.stringify(d.data, null, 2) }] };
  }
);

server.tool("list_task_comments", "Get all comments on a task",
  { task_gid: z.string() },
  async ({ task_gid }) => {
    const d = await asana(`/tasks/${task_gid}/stories?opt_fields=gid,text,created_at,created_by`);
    return { content: [{ type: "text", text: JSON.stringify(d.data, null, 2) }] };
  }
);

server.tool("add_task_dependency", "Set a task dependency",
  { task_gid: z.string(), depends_on_gid: z.string() },
  async ({ task_gid, depends_on_gid }) => {
    const d = await asana(`/tasks/${task_gid}/addDependencies`, "POST", { data: { dependencies: [depends_on_gid] } });
    return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
  }
);

server.tool("list_sections", "List sections in a project",
  { project_gid: z.string() },
  async ({ project_gid }) => {
    const d = await asana(`/projects/${project_gid}/sections?opt_fields=gid,name`);
    return { content: [{ type: "text", text: JSON.stringify(d.data, null, 2) }] };
  }
);

server.tool("move_task_to_section", "Move task to a section",
  { section_gid: z.string(), task_gid: z.string() },
  async ({ section_gid, task_gid }) => {
    await asana(`/sections/${section_gid}/addTask`, "POST", { data: { task: task_gid } });
    return { content: [{ type: "text", text: `Task ${task_gid} moved to section ${section_gid}.` }] };
  }
);

server.tool("search_tasks", "Full-text search across workspace tasks",
  { workspace_gid: z.string(), text: z.string(), completed: z.boolean().optional() },
  async ({ workspace_gid, text, completed }) => {
    let url = `/workspaces/${workspace_gid}/tasks/search?text=${encodeURIComponent(text)}&opt_fields=gid,name,completed,assignee,due_date,projects`;
    if (completed !== undefined) url += `&completed=${completed}`;
    const d = await asana(url);
    return { content: [{ type: "text", text: JSON.stringify(d.data, null, 2) }] };
  }
);

server.tool("list_users", "List users in a workspace",
  { workspace_gid: z.string() },
  async ({ workspace_gid }) => {
    const d = await asana(`/workspaces/${workspace_gid}/users?opt_fields=gid,name,email`);
    return { content: [{ type: "text", text: JSON.stringify(d.data, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
