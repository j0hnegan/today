import { requireAuth } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  try {
    const body = await request.json();
    const { name, color } = body;
    const id = parseInt(params.id, 10);

    const { data: existing } = await supabase.from("categories").select("id").eq("id", id).single();
    if (!existing) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (color !== undefined) updates.color = color;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from("categories").update(updates).eq("id", id);
      if (error) throw error;
    }

    const { data: tag } = await supabase.from("categories").select("*").eq("id", id).single();
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
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  try {
    const id = parseInt(params.id, 10);

    // CASCADE handles task_categories cleanup
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/tags/[id] error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
