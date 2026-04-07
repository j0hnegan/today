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

  try {
    const body = await request.json();
    const { title, description, category_id, status } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const { data: row, error } = await supabase
      .from("goals")
      .insert({
        title: title.trim(),
        description: description ?? null,
        category_id: category_id ?? null,
        status: status ?? "active",
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
