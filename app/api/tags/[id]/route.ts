import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, color } = body;
    const id = parseInt(params.id, 10);

    const existing = db.prepare("SELECT * FROM categories WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name.trim());
    }
    if (color !== undefined) {
      updates.push("color = ?");
      values.push(color);
    }

    if (updates.length > 0) {
      values.push(id);
      db.prepare(`UPDATE categories SET ${updates.join(", ")} WHERE id = ?`).run(
        ...values
      );
    }

    const tag = db.prepare("SELECT * FROM categories WHERE id = ?").get(id);
    return NextResponse.json(tag);
  } catch (e) {
    console.error("PATCH /api/tags/[id] error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);

    // Remove tag associations first
    db.prepare("DELETE FROM task_categories WHERE category_id = ?").run(id);
    // Delete the tag
    db.prepare("DELETE FROM categories WHERE id = ?").run(id);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/tags/[id] error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
