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
    // Day-notes live in `documents` now (005 Step 2). `date` is UNIQUE; title
    // stays empty (display title derives from the date) and sort_order is
    // unused for day-notes.
    const { data: note, error } = await supabase
      .from("documents")
      .upsert(
        { date, title: "", sort_order: 0, content: content ?? "", blocks: blocks ?? null, updated_at: new Date().toISOString() },
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
