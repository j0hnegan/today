import { supabase } from "@/lib/supabase";
import { isDueToday } from "@/lib/triage";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();

    const { data: existing } = await supabase.from("tasks").select("*").eq("id", id).single();
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const allowedFields = [
      "title",
      "description",
      "destination",
      "consequence",
      "size",
      "status",
      "due_date",
      "snoozed_until",
      "snooze_reason",
      "sort_order",
    ];

    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    // Auto-set done_at when marking as done
    if (body.status === "done") {
      updates.done_at = new Date().toISOString();
    }

    const tagIds = body.tag_ids ?? body.category_ids;

    if (Object.keys(updates).length === 0 && !tagIds) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
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
    if ("due_date" in body) {
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
  try {
    const id = parseInt(params.id);

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
