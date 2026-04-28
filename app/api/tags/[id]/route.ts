import { requireAuth } from "@/lib/api-auth";
import { parseIdParam, validateBody } from "@/lib/validation/helpers";
import { updateTagSchema } from "@/lib/validation/tag";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  const id = parseIdParam(params.id);
  if (id instanceof NextResponse) return id;

  const parsed = await validateBody(request, updateTagSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    const { data: existing } = await supabase.from("categories").select("id").eq("id", id).single();
    if (!existing) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    const { error } = await supabase.from("categories").update(parsed).eq("id", id);
    if (error) throw error;

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

  const id = parseIdParam(params.id);
  if (id instanceof NextResponse) return id;

  try {
    // CASCADE handles task_categories cleanup
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/tags/[id] error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
