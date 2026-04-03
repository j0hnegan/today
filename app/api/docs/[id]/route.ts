import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const categories = db
      .prepare(
        `SELECT c.id, c.name, c.color FROM categories c
         JOIN document_categories dc ON dc.category_id = c.id
         WHERE dc.document_id = ?`
      )
      .all(id);

    const goals = db
      .prepare(
        `SELECT g.id, g.title, g.description, g.category_id, g.status FROM goals g
         JOIN document_goals dg ON dg.goal_id = g.id
         WHERE dg.document_id = ?`
      )
      .all(id);

    return NextResponse.json({ ...doc, categories, goals });
  } catch (e) {
    console.error("GET /api/docs/[id] error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    const body = await request.json();

    const existing = db.prepare("SELECT * FROM documents WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const allowedFields = ["title", "content", "sort_order"];
    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of allowedFields) {
      if (field in body) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    const transaction = db.transaction(() => {
      if (updates.length > 0) {
        updates.push("updated_at = datetime('now')");
        values.push(id);
        db.prepare(`UPDATE documents SET ${updates.join(", ")} WHERE id = ?`).run(...values);
      }

      if (body.category_ids) {
        db.prepare("DELETE FROM document_categories WHERE document_id = ?").run(id);
        const insertCat = db.prepare("INSERT INTO document_categories (document_id, category_id) VALUES (?, ?)");
        for (const catId of body.category_ids) {
          insertCat.run(id, catId);
        }
      }

      if (body.goal_ids) {
        db.prepare("DELETE FROM document_goals WHERE document_id = ?").run(id);
        const insertGoal = db.prepare("INSERT INTO document_goals (document_id, goal_id) VALUES (?, ?)");
        for (const goalId of body.goal_ids) {
          insertGoal.run(id, goalId);
        }
      }
    });

    transaction();

    const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as Record<string, unknown>;
    const categories = db
      .prepare(
        `SELECT c.id, c.name, c.color FROM categories c
         JOIN document_categories dc ON dc.category_id = c.id
         WHERE dc.document_id = ?`
      )
      .all(id);
    const goals = db
      .prepare(
        `SELECT g.id, g.title, g.description, g.category_id, g.status FROM goals g
         JOIN document_goals dg ON dg.goal_id = g.id
         WHERE dg.document_id = ?`
      )
      .all(id);

    return NextResponse.json({ ...doc, categories, goals });
  } catch (e) {
    console.error("PATCH /api/docs/[id] error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    const existing = db.prepare("SELECT * FROM documents WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    db.prepare("DELETE FROM documents WHERE id = ?").run(id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("DELETE /api/docs/[id] error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
