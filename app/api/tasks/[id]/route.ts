import { requireAuth } from "@/lib/api-auth";
import { isDueToday } from "@/lib/triage";
import { parseIdParam, validateBody } from "@/lib/validation/helpers";
import { updateTaskSchema } from "@/lib/validation/task";
import { NextRequest, NextResponse } from "next/server";

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
    const { data: existing } = await supabase.from("tasks").select("*").eq("id", id).single();
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = { ...fields };

    // Auto-set done_at when marking as done
    if (fields.status === "done") {
      updates.done_at = new Date().toISOString();
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      const { error } = await supabase.from("tasks").update(updates).eq("id", id);
      if (error) throw error;
    }

    // Re-link categories if provided
    if (tagIds) {
      await supabase.from("task_categories").delete().eq("task_id", id);
      if (tagIds.length > 0) {
        const rows = tagIds.map((catId: number) => ({ task_id: id, category_id: catId }));
        const { error } = await supabase.from("task_categories").insert(rows);
        if (error) throw error;
      }
    }

    // Auto-triage: enforce due-today rule when due_date changes
    if ("due_date" in fields) {
      const { data: current } = await supabase.from("tasks").select("destination, due_date, status").eq("id", id).single();
      if (current && current.status !== "done" && current.due_date) {
        const shouldBeToday = isDueToday(current.due_date);
        const correctDest = shouldBeToday ? "on_deck" : "someday";
        if (current.destination !== correctDest) {
          await supabase.from("tasks").update({ destination: correctDest }).eq("id", id);
        }
      }
    }

    const { data: task } = await supabase.from("tasks").select("*").eq("id", id).single();
    const { data: tags } = await supabase
      .from("task_categories")
      .select("categories(id, name, color)")
      .eq("task_id", id);

    const formattedTags = (tags || []).map((t) => t.categories as unknown as { id: number; name: string; color: string });

    return NextResponse.json({ ...task, tags: formattedTags });
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
    const { data: existing } = await supabase.from("tasks").select("id").eq("id", id).single();
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("DELETE /api/tasks/[id] error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
