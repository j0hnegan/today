import { requireAuth } from "@/lib/api-auth";
import { parseIdParam, validateBody } from "@/lib/validation/helpers";
import { updateDocSchema } from "@/lib/validation/doc";
import { SWR_HEADERS } from "@/lib/api-cache";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  const id = parseIdParam(params.id);
  if (id instanceof NextResponse) return id;

  try {
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

    return NextResponse.json(
      {
        ...doc,
        categories: (categories || []).map((r) => r.categories),
        goals: (goals || []).map((r) => r.goals),
      },
      { headers: SWR_HEADERS }
    );
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

  const id = parseIdParam(params.id);
  if (id instanceof NextResponse) return id;

  const parsed = await validateBody(request, updateDocSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { category_ids, goal_ids, ...fields } = parsed;

  try {
    const { data: existing } = await supabase.from("documents").select("id").eq("id", id).single();
    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (Object.keys(fields).length > 0) {
      const { error } = await supabase
        .from("documents")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    }

    if (category_ids) {
      await supabase.from("document_categories").delete().eq("document_id", id);
      if (category_ids.length > 0) {
        await supabase.from("document_categories").insert(
          category_ids.map((catId) => ({ document_id: id, category_id: catId }))
        );
      }
    }

    if (goal_ids) {
      await supabase.from("document_goals").delete().eq("document_id", id);
      if (goal_ids.length > 0) {
        await supabase.from("document_goals").insert(
          goal_ids.map((goalId) => ({ document_id: id, goal_id: goalId }))
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

  const id = parseIdParam(params.id);
  if (id instanceof NextResponse) return id;

  try {
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
