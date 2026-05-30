import type { SupabaseClient } from "@supabase/supabase-js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runAutomation } from "@/lib/automation";

export function registerReadTools(server: McpServer, supabase: SupabaseClient) {
  server.registerTool(
    "list_categories",
    {
      description: "List all categories/tags available for tasks, goals, and documents.",
      inputSchema: {},
    },
    async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, color")
        .order("name", { ascending: true });
      if (error) throw new Error(`DB error: ${error.message}`);
      return {
        content: [
          { type: "text", text: (data ?? []).map((c) => `- ${c.name}`).join("\n") || "(no categories)" },
        ],
        structuredContent: { categories: data ?? [] },
      };
    }
  );

  server.registerTool(
    "list_goals",
    {
      description: "List goals with their category info.",
      inputSchema: {
        status: z.enum(["active", "done"]).optional(),
      },
    },
    async ({ status }) => {
      let q = supabase
        .from("goals")
        .select("id, title, description, status, sort_order, categories(id, name, color)")
        .order("sort_order", { ascending: true });
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw new Error(`DB error: ${error.message}`);
      return {
        content: [
          {
            type: "text",
            text:
              (data ?? []).length === 0
                ? "(no goals)"
                : data!.map((g) => `- [${g.id}] ${g.title} (${g.status})`).join("\n"),
          },
        ],
        structuredContent: { goals: data ?? [] },
      };
    }
  );

  server.registerTool(
    "get_note",
    {
      description: "Fetch the daily note for a date (YYYY-MM-DD). Returns null if no note exists.",
      inputSchema: { date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) },
    },
    async ({ date }) => {
      const { data, error } = await supabase
        .from("notes")
        .select("id, date, content, blocks, created_at, updated_at")
        .eq("date", date)
        .maybeSingle();
      if (error) throw new Error(`DB error: ${error.message}`);
      return {
        content: [
          {
            type: "text",
            text: data ? `Note for ${date}:\n${data.content ?? ""}` : `No note for ${date}.`,
          },
        ],
        structuredContent: { note: data },
      };
    }
  );

  server.registerTool(
    "list_dates_with_content",
    {
      description: "List dates within a range that have a note or active tasks due.",
      inputSchema: {
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      },
    },
    async ({ from, to }) => {
      const [{ data: notes }, { data: tasks }] = await Promise.all([
        supabase.from("notes").select("date").gte("date", from).lte("date", to),
        supabase
          .from("tasks")
          .select("due_date")
          .eq("status", "active")
          .gte("due_date", from)
          .lte("due_date", to),
      ]);
      const dates = new Set<string>();
      for (const n of notes ?? []) if (n.date) dates.add(n.date);
      for (const t of tasks ?? []) if (t.due_date) dates.add(t.due_date);
      const sorted = Array.from(dates).sort();
      return {
        content: [
          {
            type: "text",
            text: sorted.length === 0 ? "(no dates with content)" : sorted.join(", "),
          },
        ],
        structuredContent: { dates: sorted },
      };
    }
  );

  server.registerTool(
    "run_automation",
    {
      description:
        "Run the daily triage pass: promote due-today tasks to on_deck, escalate due-soon items, expire snoozes, etc. Returns counts.",
      inputSchema: {},
    },
    async () => {
      const result = await runAutomation(supabase);
      return {
        content: [
          { type: "text", text: `Automation ran. Result: ${JSON.stringify(result)}` },
        ],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    }
  );
}
