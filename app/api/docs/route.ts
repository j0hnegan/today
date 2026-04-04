import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const { data: docs, error } = await supabase
      .from("documents")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;

    if (!docs || docs.length === 0) return NextResponse.json([]);

    const docIds = docs.map((d) => d.id);

    const [{ data: docCats }, { data: docGoals }] = await Promise.all([
      supabase
        .from("document_categories")
        .select("document_id, categories(id, name, color)")
        .in("document_id", docIds),
      supabase
        .from("document_goals")
        .select("document_id, goals(id, title, description, category_id, status)")
        .in("document_id", docIds),
    ]);

    const catsByDoc = new Map<number, unknown[]>();
    for (const row of docCats || []) {
      if (!catsByDoc.has(row.document_id)) catsByDoc.set(row.document_id, []);
      catsByDoc.get(row.document_id)!.push(row.categories);
    }

    const goalsByDoc = new Map<number, unknown[]>();
    for (const row of docGoals || []) {
      if (!goalsByDoc.has(row.document_id)) goalsByDoc.set(row.document_id, []);
      goalsByDoc.get(row.document_id)!.push(row.goals);
    }

    const docsWithRelations = docs.map((doc) => ({
      ...doc,
      categories: catsByDoc.get(doc.id) ?? [],
      goals: goalsByDoc.get(doc.id) ?? [],
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

    const { data: doc, error } = await supabase
      .from("documents")
      .insert({ title: title.trim() || "Untitled", content })
      .select()
      .single();
    if (error) throw error;

    const inserts = [];
    if (category_ids.length > 0) {
      inserts.push(
        supabase.from("document_categories").insert(
          category_ids.map((catId: number) => ({ document_id: doc.id, category_id: catId }))
        )
      );
    }
    if (goal_ids.length > 0) {
      inserts.push(
        supabase.from("document_goals").insert(
          goal_ids.map((goalId: number) => ({ document_id: doc.id, goal_id: goalId }))
        )
      );
    }
    await Promise.all(inserts);

    return NextResponse.json(doc, { status: 201 });
  } catch (e) {
    console.error("POST /api/docs error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
