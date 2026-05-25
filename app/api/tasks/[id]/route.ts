import { requireAuth } from "@/lib/api-auth";
import { isDueToday } from "@/lib/triage";
import { parseIdParam, validateBody } from "@/lib/validation/helpers";
import { updateTaskSchema } from "@/lib/validation/task";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  const id = parseIdParam(params.id);
  if (id instanceof NextResponse) return id;

  const parsed = await validateBody(request, updateTaskSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { tag_ids: parsedTagIds, category_ids, ...fields } = parsed;
  const tagIds = parsedTagIds ?? category_ids;

  try {
    const updates: Record<string, unknown> = { ...fields };

    // Auto-set done_at when marking as done
    if (fields.status === "done") {
      updates.done_at = new Date().toISOString();
    }

    // Update task and get the result in one call (replaces separate SELECT + UPDATE)
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
    }
    const { data: task, error: updateError } = Object.keys(updates).length > 0
      ? await supabase.from("tasks").update(updates).eq("id", id).select().single()
      : await supabase.from("tasks").select("*").eq("id", id).single();
    if (updateError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Re-link categories if provided, and fetch tag details in parallel
    const [, tagResult] = await Promise.all([
      tagIds
        ? (async () => {
            await supabase.from("task_categories").delete().eq("task_id", id);
            if (tagIds.length > 0) {
              const rows = tagIds.map((catId: number) => ({ task_id: id, category_id: catId }));
              const { error } = await supabase.from("task_categories").insert(rows);
              if (error) throw error;
            }
          })()
        : Promise.resolve(),
      tagIds
        ? tagIds.length > 0
          ? supabase.from("categories").select("id, name, color").in("id", tagIds)
          : Promise.resolve({ data: [] as { id: number; name: string; color: string }[], error: null })
        : supabase
            .from("task_categories")
            .select("categories(id, name, color)")
            .eq("task_id", id),
    ]);

    // Auto-triage: compute in-memory from the updated row instead of re-fetching
    let finalTask = task;
    if ("due_date" in fields && task.status !== "done" && task.due_date) {
      const shouldBeToday = isDueToday(task.due_date);
      if (shouldBeToday && task.destination !== "on_deck") {
        const { data: triaged } = await supabase
          .from("tasks").update({ destination: "on_deck" }).eq("id", id).select().single();
        if (triaged) finalTask = triaged;
      } else if (!shouldBeToday && task.destination === "on_deck") {
        const { data: triaged } = await supabase
          .from("tasks").update({ destination: "someday" }).eq("id", id).select().single();
        if (triaged) finalTask = triaged;
      }
    }

    // Build tags from the result — different shape depending on whether tagIds was provided
    const formattedTags = tagIds
      ? (tagResult?.data ?? []) as { id: number; name: string; color: string }[]
      : ((tagResult?.data ?? []) as { categories: unknown }[]).map(
          (t) => t.categories as { id: number; name: string; color: string }
        );

    return NextResponse.json({ ...finalTask, tags: formattedTags });
  } catch (e) {
    console.error("PATCH /api/tasks/[id] error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  const id = parseIdParam(params.id);
  if (id instanceof NextResponse) return id;

  try {
    const { data, error } = await supabase
      .from("tasks").delete().eq("id", id).select("id").single();
    if (error || !data) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("DELETE /api/tasks/[id] error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
