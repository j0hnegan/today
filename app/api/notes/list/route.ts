import { requireAuth } from "@/lib/api-auth";
import { SWR_HEADERS } from "@/lib/api-cache";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  try {
    const { data: notes, error } = await supabase
      .from("notes")
      .select("id, date, content, updated_at")
      .not("content", "is", null)
      .neq("content", "")
      .order("date", { ascending: false });

    if (error) throw error;
    return NextResponse.json(notes ?? [], { headers: SWR_HEADERS });
  } catch (e) {
    console.error("GET /api/notes/list error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
