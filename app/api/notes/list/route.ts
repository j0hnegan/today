import { requireAuth } from "@/lib/api-auth";
import { fetchNotesList } from "@/lib/server-fetchers";
import { SWR_HEADERS } from "@/lib/api-cache";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  try {
    const notes = await fetchNotesList(supabase);
    return NextResponse.json(notes, { headers: SWR_HEADERS });
  } catch (e) {
    console.error("GET /api/notes/list error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
