import { requireAuth } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  try {
    const date = request.nextUrl.searchParams.get("date");
    if (!date) {
      return NextResponse.json({ error: "date parameter required" }, { status: 400 });
    }

    const { data: note } = await supabase
      .from("notes")
      .select("*")
      .eq("date", date)
      .single();

    if (!note) {
      return NextResponse.json({ id: null, date, content: "", blocks: null });
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

    return NextResponse.json({ ...note, blocks, attachments: attachments || [] });
  } catch (e) {
    console.error("GET /api/notes error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  try {
    const body = await request.json();
    const { date, content, blocks } = body;

    if (!date) {
      return NextResponse.json({ error: "date required" }, { status: 400 });
    }

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
