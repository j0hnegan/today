import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const tags = db.prepare("SELECT * FROM categories ORDER BY name ASC").all();
    return NextResponse.json(tags);
  } catch (e) {
    console.error("GET /api/tags error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color = "#6366f1" } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const result = db
      .prepare("INSERT INTO categories (name, color) VALUES (?, ?)")
      .run(name.trim(), color);
    const tag = db
      .prepare("SELECT * FROM categories WHERE id = ?")
      .get(result.lastInsertRowid);
    return NextResponse.json(tag, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("UNIQUE")) {
      return NextResponse.json(
        { error: "Tag already exists" },
        { status: 409 }
      );
    }
    console.error("POST /api/tags error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
