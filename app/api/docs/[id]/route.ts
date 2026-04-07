import { requireAuth } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  try {
    const id = parseInt(params.id, 10);
    const { data: doc } = await supabase.from("documents").select("*").eq("id", id).single();
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const [{ data: categories }, { data: goals }] = await Promise.all([
      supabase
        .from("document_categories")
        .select("categories(id, name, color)")
        .eq("document_id", id),
      supabase
        .from("document_goals")
        .select("goals(id, title, description, category_id, status)")
        .eq("document_id", id),
    ]);

    return NextResponse.json({
      ...doc,
      categories: (categories || []).map((r) => r.categories),
      goals: (goals || []).map((r) => r.goals),
    });
  } catch (e) {
    console.error("GET /api/docs/[id] error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  try {
    const id = parseInt(params.id, 10);
    const body = await request.json();

    const { data: existing } = await supabase.from("documents").select("id").eq("id", id).single();
    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const allowedFields = ["title", "content", "sort_order"];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      const { error } = await supabase.from("documents").update(updates).eq("id", id);
      if (error) throw error;
    }

    if (body.category_ids) {
      await supabase.from("document_categories").delete().eq("document_id", id);
      if (body.category_ids.length > 0) {
        await supabase.from("document_categories").insert(
          body.category_ids.map((catId: number) => ({ document_id: id, category_id: catId }))
        );
      }
    }

    if (body.goal_ids) {
      await supabase.from("document_goals").delete().eq("document_id", id);
      if (body.goal_ids.length > 0) {
        await supabase.from("document_goals").insert(
          body.goal_ids.map((goalId: number) => ({ document_id: id, goal_id: goalId }))
        );
      }
    }

    const { data: doc } = await supabase.from("documents").select("*").eq("id", id).single();

    const [{ data: categories }, { data: goals }] = await Promise.all([
      supabase
        .from("document_categories")
        .select("categories(id, name, color)")
        .eq("document_id", id),
      supabase
        .from("document_goals")
        .select("goals(id, title, description, category_id, status)")
        .eq("document_id", id),
    ]);

    return NextResponse.json({
      ...doc,
      categories: (categories || []).map((r) => r.categories),
      goals: (goals || []).map((r) => r.goals),
    });
  } catch (e) {
    console.error("PATCH /api/docs/[id] error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  try {
    const id = parseInt(params.id, 10);
    const { data: existing } = await supabase.from("documents").select("id").eq("id", id).single();
    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("DELETE /api/docs/[id] error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
