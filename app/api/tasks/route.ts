import { requireAuth } from "@/lib/api-auth";
import { isDueToday } from "@/lib/triage";
import { fetchTasks } from "@/lib/server-fetchers";
import { validateBody, validateSearchParams } from "@/lib/validation/helpers";
import { createTaskSchema, taskListQuerySchema } from "@/lib/validation/task";
import { SWR_HEADERS } from "@/lib/api-cache";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  const { searchParams } = new URL(request.url);
  const params = validateSearchParams(searchParams, taskListQuerySchema);
  if (params instanceof NextResponse) return params;

  try {
    const tasks = await fetchTasks(supabase, params);
    return NextResponse.json(tasks, { headers: SWR_HEADERS });
  } catch (e) {
    console.error("GET /api/tasks error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  const parsed = await validateBody(request, createTaskSchema);
  if (parsed instanceof NextResponse) return parsed;
  const {
    title,
    description,
    consequence,
    size,
    due_date = null,
    tag_ids,
    destination: reqDestination,
  } = parsed;

  try {
    let destination: string;
    if (due_date && isDueToday(due_date)) {
      destination = "on_deck";
    } else if (due_date) {
      destination = reqDestination === "upcoming" ? "upcoming" : "someday";
    } else {
      destination =
        reqDestination === "on_deck" ? "on_deck" :
        reqDestination === "upcoming" ? "upcoming" :
        "someday";
    }

    // Run tag lookup and task insert in parallel
    const [tagResult, taskResult] = await Promise.all([
      tag_ids.length > 0
        ? supabase.from("categories").select("id, name, color").in("id", tag_ids)
        : Promise.resolve({ data: [] as { id: number; name: string; color: string }[], error: null }),
      supabase
        .from("tasks")
        .insert({ title, description, destination, consequence, size, due_date })
        .select()
        .single(),
    ]);
    if (taskResult.error) throw taskResult.error;
    if (tagResult.error) throw tagResult.error;
    const task = taskResult.data;

    // Insert tag associations (needs task.id, so must be sequential)
    if (tag_ids.length > 0) {
      const tagRows = tag_ids.map((tagId: number) => ({
        task_id: task.id,
        category_id: tagId,
      }));
      const { error: tagError } = await supabase.from("task_categories").insert(tagRows);
      if (tagError) throw tagError;
    }

    return NextResponse.json({ ...task, tags: tagResult.data ?? [] }, { status: 201 });
  } catch (e) {
    console.error("POST /api/tasks error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
