import { requireAuth } from "@/lib/api-auth";
import { parseIdParam, validateBody } from "@/lib/validation/helpers";
import { updateGoalSchema } from "@/lib/validation/goal";
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

  const id = parseIdParam(params.id);
  if (id instanceof NextResponse) return id;

  const parsed = await validateBody(request, updateGoalSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    const { data: existing } = await supabase.from("goals").select("id").eq("id", id).single();
    if (!existing) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = { ...parsed, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("goals").update(updates).eq("id", id);
    if (error) throw error;

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

  const id = parseIdParam(params.id);
  if (id instanceof NextResponse) return id;

  try {
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("DELETE /api/goals/[id] error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
