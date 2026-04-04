import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task_ids } = body;

    if (!Array.isArray(task_ids) || task_ids.length === 0) {
      return NextResponse.json(
        { error: "task_ids must be a non-empty array" },
        { status: 400 }
      );
    }

    // Update sort_order for each task
    const updates = task_ids.map((taskId: number, i: number) =>
      supabase.from("tasks").update({ sort_order: i }).eq("id", taskId)
    );

    await Promise.all(updates);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/tasks/reorder error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
