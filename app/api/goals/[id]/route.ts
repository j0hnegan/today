import { requireAuth } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

function rowToGoal(row: Record<string, unknown>) {
  const { categories, ...goal } = row;
  const cat = categories as { id: number; name: string; color: string } | null;
  return {
    ...goal,
    category: cat ?? null,
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  try {
    const body = await request.json();
    const { title, description, category_id, status, sort_order } = body;
    const id = parseInt(params.id, 10);

    const { data: existing } = await supabase.from("goals").select("id").eq("id", id).single();
    if (!existing) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description;
    if (category_id !== undefined) updates.category_id = category_id;
    if (status !== undefined) updates.status = status;
    if (sort_order !== undefined) updates.sort_order = sort_order;

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      const { error } = await supabase.from("goals").update(updates).eq("id", id);
      if (error) throw error;
    }

    const { data: row } = await supabase
      .from("goals")
      .select("*, categories(id, name, color)")
      .eq("id", id)
      .single();

    return NextResponse.json(rowToGoal(row as Record<string, unknown>));
  } catch (e) {
    console.error("PATCH /api/goals/[id] error:", e);
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

    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("DELETE /api/goals/[id] error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
