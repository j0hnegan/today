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

export async function GET() {
  try {
    const rows = db
      .prepare(`${GOAL_WITH_CATEGORY_QUERY} ORDER BY g.sort_order ASC, g.created_at DESC`)
      .all() as Record<string, unknown>[];
    return NextResponse.json(rows.map(rowToGoal));
  } catch (e) {
    console.error("GET /api/goals error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, category_id, status } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const result = db
      .prepare(
        "INSERT INTO goals (title, description, category_id, status) VALUES (?, ?, ?, ?)"
      )
      .run(
        title.trim(),
        description ?? null,
        category_id ?? null,
        status ?? "active"
      );

    const row = db
      .prepare(`${GOAL_WITH_CATEGORY_QUERY} WHERE g.id = ?`)
      .get(result.lastInsertRowid) as Record<string, unknown>;

    return NextResponse.json(rowToGoal(row), { status: 201 });
  } catch (e) {
    console.error("POST /api/goals error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
