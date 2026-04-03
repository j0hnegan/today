import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const GOAL_WITH_CATEGORY_QUERY = `
  SELECT
    g.*,
    c.id   AS cat_id,
    c.name AS cat_name,
    c.color AS cat_color
  FROM goals g
  LEFT JOIN categories c ON g.category_id = c.id
`;

function rowToGoal(row: Record<string, unknown>) {
  const { cat_id, cat_name, cat_color, ...goal } = row;
  return {
    ...goal,
    category: cat_id ? { id: cat_id, name: cat_name, color: cat_color } : null,
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { title, description, category_id, status, sort_order } = body;
    const id = parseInt(params.id, 10);

    const existing = db.prepare("SELECT * FROM goals WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (title !== undefined) {
      updates.push("title = ?");
      values.push(title.trim());
    }
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description);
    }
    if (category_id !== undefined) {
      updates.push("category_id = ?");
      values.push(category_id);
    }
    if (status !== undefined) {
      updates.push("status = ?");
      values.push(status);
    }
    if (sort_order !== undefined) {
      updates.push("sort_order = ?");
      values.push(sort_order);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(id);
      db.prepare(
        `UPDATE goals SET ${updates.join(", ")} WHERE id = ?`
      ).run(...values);
    }

    const row = db
      .prepare(`${GOAL_WITH_CATEGORY_QUERY} WHERE g.id = ?`)
      .get(id) as Record<string, unknown>;

    return NextResponse.json(rowToGoal(row));
  } catch (e) {
    console.error("PATCH /api/goals/[id] error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);

    db.prepare("DELETE FROM goals WHERE id = ?").run(id);

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("DELETE /api/goals/[id] error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
