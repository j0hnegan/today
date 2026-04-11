import { requireAuth } from "@/lib/api-auth";
import { validateBody } from "@/lib/validation/helpers";
import { reorderTasksSchema } from "@/lib/validation/task";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  const parsed = await validateBody(request, reorderTasksSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { task_ids } = parsed;

  try {
    // Update sort_order for each task
    const updates = task_ids.map((taskId, i) =>
      supabase.from("tasks").update({ sort_order: i }).eq("id", taskId)
    );

    await Promise.all(updates);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/tasks/reorder error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
