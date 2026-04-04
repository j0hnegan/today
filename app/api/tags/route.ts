import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const { data: tags, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
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

    const { data: tag, error } = await supabase
      .from("categories")
      .insert({ name: name.trim(), color })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Tag already exists" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(tag, { status: 201 });
  } catch (e) {
    console.error("POST /api/tags error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
