import { requireAuth } from "@/lib/api-auth";
import { validateBody } from "@/lib/validation/helpers";
import { createGoalSchema } from "@/lib/validation/goal";
import { NextRequest, NextResponse } from "next/server";

function rowToGoal(row: Record<string, unknown>) {
  const { categories, ...goal } = row;
  const cat = categories as { id: number; name: string; color: string } | null;
  return {
    ...goal,
    category: cat ?? null,
  };
}

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  try {
    const { data: rows, error } = await supabase
      .from("goals")
      .select("*, categories(id, name, color)")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json((rows || []).map(rowToGoal));
  } catch (e) {
    console.error("GET /api/goals error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  const parsed = await validateBody(request, createGoalSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { title, description, category_id, status } = parsed;

  try {
    const { data: row, error } = await supabase
      .from("goals")
      .insert({
        title,
        description: description ?? null,
        category_id: category_id ?? null,
        status,
      })
      .select("*, categories(id, name, color)")
      .single();
    if (error) throw error;

    return NextResponse.json(rowToGoal(row), { status: 201 });
  } catch (e) {
    console.error("POST /api/goals error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
