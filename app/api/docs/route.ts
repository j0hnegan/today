import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const docs = db
      .prepare("SELECT * FROM documents ORDER BY updated_at DESC")
      .all() as Record<string, unknown>[];

    // Batch-fetch categories and goals for all docs
    const docIds = docs.map((d) => d.id as number);
    if (docIds.length === 0) return NextResponse.json([]);

    const placeholders = docIds.map(() => "?").join(",");

    const docCats = db
      .prepare(
        `SELECT dc.document_id, c.id, c.name, c.color
         FROM categories c
         JOIN document_categories dc ON dc.category_id = c.id
         WHERE dc.document_id IN (${placeholders})`
      )
      .all(...docIds) as { document_id: number; id: number; name: string; color: string }[];

    const docGoals = db
      .prepare(
        `SELECT dg.document_id, g.id, g.title, g.description, g.category_id, g.status
         FROM goals g
         JOIN document_goals dg ON dg.goal_id = g.id
         WHERE dg.document_id IN (${placeholders})`
      )
      .all(...docIds) as { document_id: number; id: number; title: string; description: string; category_id: number | null; status: string }[];

    const catsByDoc = new Map<number, { id: number; name: string; color: string }[]>();
    for (const row of docCats) {
      if (!catsByDoc.has(row.document_id)) catsByDoc.set(row.document_id, []);
      catsByDoc.get(row.document_id)!.push({ id: row.id, name: row.name, color: row.color });
    }

    const goalsByDoc = new Map<number, { id: number; title: string; description: string; category_id: number | null; status: string }[]>();
    for (const row of docGoals) {
      if (!goalsByDoc.has(row.document_id)) goalsByDoc.set(row.document_id, []);
      goalsByDoc.get(row.document_id)!.push({ id: row.id, title: row.title, description: row.description, category_id: row.category_id, status: row.status });
    }

    const docsWithRelations = docs.map((doc) => ({
      ...doc,
      categories: catsByDoc.get(doc.id as number) ?? [],
      goals: goalsByDoc.get(doc.id as number) ?? [],
    }));

    return NextResponse.json(docsWithRelations);
  } catch (e) {
    console.error("GET /api/docs error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title = "Untitled", content = "", category_ids = [], goal_ids = [] } = body;

    const transaction = db.transaction(() => {
      const result = db
        .prepare("INSERT INTO documents (title, content) VALUES (?, ?)")
        .run(title.trim() || "Untitled", content);
      const docId = result.lastInsertRowid;

      const insertCat = db.prepare("INSERT INTO document_categories (document_id, category_id) VALUES (?, ?)");
      for (const catId of category_ids) {
        insertCat.run(docId, catId);
      }

      const insertGoal = db.prepare("INSERT INTO document_goals (document_id, goal_id) VALUES (?, ?)");
      for (const goalId of goal_ids) {
        insertGoal.run(docId, goalId);
      }

      return docId;
    });

    const docId = transaction();
    const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(docId);
    return NextResponse.json(doc, { status: 201 });
  } catch (e) {
    console.error("POST /api/docs error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
