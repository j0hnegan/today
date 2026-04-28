import { requireAuth } from "@/lib/api-auth";
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
    const { data: note } = await supabase
      .from("notes")
      .select("*")
      .eq("date", date)
      .single();

    if (!note) {
      return NextResponse.json({ id: null, date, content: "", blocks: null }, { headers: SWR_HEADERS });
    }

    // Parse blocks JSON if present
    let blocks = null;
    if (note.blocks && typeof note.blocks === "string") {
      try {
        blocks = JSON.parse(note.blocks);
      } catch {
        blocks = null;
      }
    }

    // Include attachments
    const { data: attachments } = await supabase
      .from("attachments")
      .select("*")
      .eq("entity_type", "note")
      .eq("entity_id", note.id)
      .order("created_at", { ascending: false });

    return NextResponse.json(
      { ...note, blocks, attachments: attachments || [] },
      { headers: SWR_HEADERS }
    );
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

    const { data: existing } = await supabase
      .from("notes")
      .select("id")
      .eq("date", date)
      .single();

    if (existing) {
      await supabase
        .from("notes")
        .update({ content: content ?? "", blocks: blocksJson, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("notes")
        .insert({ date, content: content ?? "", blocks: blocksJson });
    }

    const { data: note } = await supabase.from("notes").select("*").eq("date", date).single();
    return NextResponse.json(note);
  } catch (e) {
    console.error("PATCH /api/notes error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
