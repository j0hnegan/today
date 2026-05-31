import type { SupabaseClient } from "@supabase/supabase-js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { isDueToday } from "@/lib/triage";

type TagRow = { id: number; name: string; color: string };

async function fetchTagsForTasks(
  supabase: SupabaseClient,
  ids: number[]
): Promise<Map<number, TagRow[]>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase
    .from("task_categories")
    .select("task_id, categories(id, name, color)")
    .in("task_id", ids);
  const out = new Map<number, TagRow[]>();
  for (const row of data ?? []) {
    const cat = row.categories as unknown as TagRow;
    if (!cat) continue;
    const list = out.get(row.task_id) ?? [];
    list.push(cat);
    out.set(row.task_id, list);
  }
  return out;
}

function summaryLine(t: { title: string; consequence?: string; due_date?: string | null }): string {
  const flags: string[] = [];
  if (t.consequence === "hard") flags.push("time-sensitive");
  if (t.due_date) flags.push(`due ${t.due_date}`);
  return flags.length > 0 ? `${t.title} (${flags.join(", ")})` : t.title;
}

export function registerTaskTools(server: McpServer, supabase: SupabaseClient) {
  server.registerTool(
    "list_today",
    {
      description:
        "List all tasks scheduled for today (destination=on_deck, status=active). Time-sensitive tasks are flagged.",
      inputSchema: {},
    },
    async () => {
      const { data: tasks, error } = await supabase
        .from("tasks")
        .select("id, title, description, destination, consequence, size, due_date, sort_order")
        .eq("destination", "on_deck")
        .eq("status", "active")
        .order("sort_order", { ascending: true });
      if (error) throw new Error(`DB error: ${error.message}`);

      const tagsByTask = await fetchTagsForTasks(supabase, (tasks ?? []).map((t) => t.id));
      const enriched = (tasks ?? []).map((t) => ({ ...t, tags: tagsByTask.get(t.id) ?? [] }));

      const text = enriched.length === 0
        ? "Nothing on the list for today."
        : enriched.map((t, i) => `${i + 1}. ${summaryLine(t)}`).join("\n");

      return {
        content: [{ type: "text", text }],
        structuredContent: { tasks: enriched },
      };
    }
  );

  server.registerTool(
    "list_tasks",
    {
      description:
        "List tasks with optional filters. Use this for 'someday', 'in progress', overdue, or date-range queries.",
      inputSchema: {
        destination: z.enum(["on_deck", "someday", "in_progress"]).optional(),
        status: z.enum(["active", "done"]).optional(),
        consequence: z.enum(["none", "soft", "hard"]).optional(),
        due_after: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        due_before: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        limit: z.number().int().positive().max(200).optional(),
      },
    },
    async (args) => {
      let q = supabase
        .from("tasks")
        .select("id, title, description, destination, consequence, size, status, due_date, done_at, sort_order");
      if (args.destination) q = q.eq("destination", args.destination);
      if (args.status) q = q.eq("status", args.status);
      if (args.consequence) q = q.eq("consequence", args.consequence);
      if (args.due_after) q = q.gte("due_date", args.due_after);
      if (args.due_before) q = q.lte("due_date", args.due_before);
      q = q.order("sort_order", { ascending: true }).limit(args.limit ?? 100);

      const { data: tasks, error } = await q;
      if (error) throw new Error(`DB error: ${error.message}`);

      const tagsByTask = await fetchTagsForTasks(supabase, (tasks ?? []).map((t) => t.id));
      const enriched = (tasks ?? []).map((t) => ({ ...t, tags: tagsByTask.get(t.id) ?? [] }));

      return {
        content: [
          {
            type: "text",
            text: `${enriched.length} task(s):\n` + enriched.map((t) => `- [${t.id}] ${summaryLine(t)}`).join("\n"),
          },
        ],
        structuredContent: { tasks: enriched },
      };
    }
  );

  server.registerTool(
    "search_tasks",
    {
      description: "Substring search active tasks by title (case-insensitive).",
      inputSchema: {
        query: z.string().min(1),
      },
    },
    async ({ query }) => {
      const { data: tasks, error } = await supabase
        .from("tasks")
        .select("id, title, destination, consequence, due_date")
        .eq("status", "active")
        .ilike("title", `%${query}%`)
        .limit(50);
      if (error) throw new Error(`DB error: ${error.message}`);

      return {
        content: [
          {
            type: "text",
            text:
              (tasks ?? []).length === 0
                ? `No active tasks match "${query}".`
                : `${tasks!.length} match(es):\n` +
                  tasks!.map((t) => `- [${t.id}] ${summaryLine(t)}`).join("\n"),
          },
        ],
        structuredContent: { tasks: tasks ?? [] },
      };
    }
  );

  server.registerTool(
    "create_task",
    {
      description:
        "Create a new task. If due_date is today or past, the task lands in Today; otherwise Someday. Pass tag_names to attach existing categories (unknown names are ignored).",
      inputSchema: {
        title: z.string().min(1).max(200),
        description: z.string().max(10_000).optional(),
        due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        consequence: z.enum(["none", "soft", "hard"]).optional(),
        size: z.enum(["xs", "small", "medium", "large"]).optional(),
        destination: z.enum(["on_deck", "someday", "in_progress"]).optional(),
        tag_names: z.array(z.string()).optional(),
      },
    },
    async (args) => {
      const dueDate = args.due_date ?? null;
      let destination: string;
      if (dueDate && isDueToday(dueDate)) destination = "on_deck";
      else if (dueDate) destination = "someday";
      else destination = args.destination ?? "someday";

      const { data: task, error } = await supabase
        .from("tasks")
        .insert({
          title: args.title,
          description: args.description ?? "",
          destination,
          consequence: args.consequence ?? "none",
          size: args.size ?? "small",
          due_date: dueDate,
        })
        .select()
        .single();
      if (error) throw new Error(`DB error: ${error.message}`);

      if (args.tag_names && args.tag_names.length > 0) {
        const { data: cats } = await supabase
          .from("categories")
          .select("id, name")
          .in("name", args.tag_names);
        if (cats && cats.length > 0) {
          await supabase
            .from("task_categories")
            .insert(cats.map((c) => ({ task_id: task.id, category_id: c.id })));
        }
      }

      return {
        content: [{ type: "text", text: `Created task #${task.id}: "${task.title}"` }],
        structuredContent: { task },
      };
    }
  );

  server.registerTool(
    "complete_task",
    {
      description: "Mark a single task done by id.",
      inputSchema: { id: z.number().int().positive() },
    },
    async ({ id }) => {
      const now = new Date().toISOString();
      const { data: task, error } = await supabase
        .from("tasks")
        .update({ status: "done", done_at: now, updated_at: now })
        .eq("id", id)
        .select("id, title")
        .single();
      if (error || !task) throw new Error(error?.message ?? `Task #${id} not found`);
      return {
        content: [{ type: "text", text: `Marked "${task.title}" done.` }],
        structuredContent: { task },
      };
    }
  );

  server.registerTool(
    "bulk_complete_tasks",
    {
      description:
        "Mark multiple tasks done in one call. Use this when the user mentions completing multiple things at once.",
      inputSchema: { ids: z.array(z.number().int().positive()).min(1).max(50) },
    },
    async ({ ids }) => {
      const now = new Date().toISOString();
      const { data: tasks, error } = await supabase
        .from("tasks")
        .update({ status: "done", done_at: now, updated_at: now })
        .in("id", ids)
        .select("id, title");
      if (error) throw new Error(`DB error: ${error.message}`);
      const titles = (tasks ?? []).map((t) => `"${t.title}"`).join(", ");
      return {
        content: [
          { type: "text", text: `Marked ${tasks?.length ?? 0} task(s) done: ${titles}` },
        ],
        structuredContent: { tasks: tasks ?? [] },
      };
    }
  );

  server.registerTool(
    "update_task",
    {
      description:
        "Update fields on a task. Only the fields you pass are changed. Changing due_date re-triages destination automatically.",
      inputSchema: {
        id: z.number().int().positive(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(10_000).optional(),
        due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        consequence: z.enum(["none", "soft", "hard"]).optional(),
        size: z.enum(["xs", "small", "medium", "large"]).optional(),
        destination: z.enum(["on_deck", "someday", "in_progress"]).optional(),
        status: z.enum(["active", "done"]).optional(),
      },
    },
    async (args) => {
      const { id, ...rest } = args;
      const updates: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() };
      if (rest.status === "done") updates.done_at = new Date().toISOString();

      const { error } = await supabase.from("tasks").update(updates).eq("id", id);
      if (error) throw new Error(`DB error: ${error.message}`);

      if ("due_date" in rest) {
        const { data: current } = await supabase
          .from("tasks")
          .select("destination, due_date, status")
          .eq("id", id)
          .single();
        if (current && current.status !== "done" && current.due_date) {
          const correct = isDueToday(current.due_date) ? "on_deck" : "someday";
          if (current.destination !== correct) {
            await supabase.from("tasks").update({ destination: correct }).eq("id", id);
          }
        }
      }

      const { data: task } = await supabase.from("tasks").select("*").eq("id", id).single();
      return {
        content: [{ type: "text", text: `Updated task #${id}.` }],
        structuredContent: { task },
      };
    }
  );

  server.registerTool(
    "delete_task",
    {
      description: "Permanently delete a task. Prefer complete_task for normal completion.",
      inputSchema: { id: z.number().int().positive() },
    },
    async ({ id }) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw new Error(`DB error: ${error.message}`);
      return {
        content: [{ type: "text", text: `Deleted task #${id}.` }],
        structuredContent: { id },
      };
    }
  );
}
