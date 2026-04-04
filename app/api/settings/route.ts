import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const { data: rows, error } = await supabase.from("settings").select("*");
    if (error) throw error;

    const settings: Record<string, string> = {};
    for (const row of rows || []) {
      settings[row.key] = row.value;
    }
    return NextResponse.json(settings);
  } catch (e) {
    console.error("GET /api/settings error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    const upserts = Object.entries(body).map(([key, value]) => ({
      key,
      value: String(value),
    }));

    const { error } = await supabase
      .from("settings")
      .upsert(upserts, { onConflict: "key" });
    if (error) throw error;

    // Return updated settings
    const { data: rows } = await supabase.from("settings").select("*");
    const settings: Record<string, string> = {};
    for (const row of rows || []) {
      settings[row.key] = row.value;
    }
    return NextResponse.json(settings);
  } catch (e) {
    console.error("PATCH /api/settings error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
