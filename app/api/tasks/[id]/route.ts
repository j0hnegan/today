import { db } from "@/lib/db";
import { isDueToday } from "@/lib/triage";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();

    const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
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

    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of allowedFields) {
      if (field in body) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    // Auto-set done_at when marking as done
    if (body.status === "done") {
      updates.push("done_at = datetime('now')");
    }

    const tagIds = body.tag_ids ?? body.category_ids;

    if (updates.length === 0 && !tagIds) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const transaction = db.transaction(() => {
      if (updates.length > 0) {
        updates.push("updated_at = datetime('now')");
        const query = `UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`;
        values.push(id);
        db.prepare(query).run(...values);
      }

      // Re-link categories if provided
      if (tagIds) {
        db.prepare("DELETE FROM task_categories WHERE task_id = ?").run(id);
        const insertCat = db.prepare(
          "INSERT INTO task_categories (task_id, category_id) VALUES (?, ?)"
        );
        for (const catId of tagIds) {
          insertCat.run(id, catId);
        }
      }
    });

    transaction();

    // Auto-triage: enforce due-today rule when due_date changes
    if ("due_date" in body) {
      const current = db.prepare("SELECT destination, due_date, status FROM tasks WHERE id = ?").get(id) as Record<string, unknown>;
      if (current.status !== "done") {
        const dueDate = current.due_date as string | null;
        if (dueDate) {
          const shouldBeToday = isDueToday(dueDate);
          const correctDest = shouldBeToday ? "on_deck" : "someday";
          if (current.destination !== correctDest) {
            db.prepare("UPDATE tasks SET destination = ? WHERE id = ?").run(correctDest, id);
          }
        }
      }
    }

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Record<string, unknown>;
    const tags = db
      .prepare(
        `SELECT t.id, t.name, t.color FROM categories t JOIN task_categories tt ON tt.category_id = t.id WHERE tt.task_id = ?`
      )
      .all(id);

    return NextResponse.json({ ...task, tags });
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

    const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    db.prepare("DELETE FROM tasks WHERE id = ?").run(id);

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("DELETE /api/tasks/[id] error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
