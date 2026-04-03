import { db } from "@/lib/db";
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

    const updateStmt = db.prepare(
      "UPDATE tasks SET sort_order = ? WHERE id = ?"
    );

    const transaction = db.transaction(() => {
      for (let i = 0; i < task_ids.length; i++) {
        updateStmt.run(i, task_ids[i]);
      }
    });

    transaction();

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/tasks/reorder error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
