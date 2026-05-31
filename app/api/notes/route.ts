import { requireAuth } from "@/lib/api-auth";
import { fetchNote } from "@/lib/server-fetchers";
import { validateBody, validateSearchParams } from "@/lib/validation/helpers";
import { noteQuerySchema, upsertNoteSchema } from "@/lib/validation/note";
import { SWR_HEADERS } from "@/lib/api-cache";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  const params = validateSearchParams(request.nextUrl.searchParams, noteQuerySchema);
  if (params instanceof NextResponse) return params;
  const { date } = params;

  try {
    const note = await fetchNote(supabase, date);
    return NextResponse.json(note, { headers: SWR_HEADERS });
  } catch (e) {
    console.error("GET /api/notes error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  const parsed = await validateBody(request, upsertNoteSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { date, content, blocks } = parsed;

  try {
    const blocksJson = blocks ? JSON.stringify(blocks) : null;

    // `date` is UNIQUE, so a single upsert replaces the prior
    // select-then-update-or-insert-then-reselect (three round-trips → one).
    // Only listed columns are written, so created_at is preserved on conflict.
    const { data: note, error } = await supabase
      .from("notes")
      .upsert(
        { date, content: content ?? "", blocks: blocksJson, updated_at: new Date().toISOString() },
        { onConflict: "date" }
      )
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json(note);
  } catch (e) {
    console.error("PATCH /api/notes error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
