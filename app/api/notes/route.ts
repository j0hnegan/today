import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get("date");
    if (!date) {
      return NextResponse.json({ error: "date parameter required" }, { status: 400 });
    }

    const note = db
      .prepare("SELECT * FROM notes WHERE date = ?")
      .get(date) as Record<string, unknown> | undefined;

    if (!note) {
      return NextResponse.json({ id: null, date, content: "", blocks: null });
    }

    // Parse blocks JSON if present
    let blocks = null;
    if (note.blocks && typeof note.blocks === "string") {
      try {
        blocks = JSON.parse(note.blocks as string);
      } catch {
        blocks = null;
      }
    }

    // Include attachments
    const attachments = db
      .prepare("SELECT * FROM attachments WHERE entity_type = 'note' AND entity_id = ? ORDER BY created_at DESC")
      .all(note.id);

    return NextResponse.json({ ...note, blocks, attachments });
  } catch (e) {
    console.error("GET /api/notes error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, content, blocks } = body;

    if (!date) {
      return NextResponse.json({ error: "date required" }, { status: 400 });
    }

    const blocksJson = blocks ? JSON.stringify(blocks) : null;

    const existing = db
      .prepare("SELECT id FROM notes WHERE date = ?")
      .get(date) as { id: number } | undefined;

    if (existing) {
      db.prepare("UPDATE notes SET content = ?, blocks = ?, updated_at = datetime('now') WHERE id = ?")
        .run(content ?? "", blocksJson, existing.id);
    } else {
      db.prepare("INSERT INTO notes (date, content, blocks) VALUES (?, ?, ?)")
        .run(date, content ?? "", blocksJson);
    }

    const note = db.prepare("SELECT * FROM notes WHERE date = ?").get(date);
    return NextResponse.json(note);
  } catch (e) {
    console.error("PATCH /api/notes error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
