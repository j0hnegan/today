import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const { data: checkin, error } = await supabase
      .from("checkins")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code === "PGRST116") {
      // No rows found
      return NextResponse.json(null);
    }
    if (error) throw error;

    return NextResponse.json(checkin);
  } catch (e) {
    console.error("GET /api/checkins error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { energy } = body;

    if (!energy || !["low", "medium", "high"].includes(energy)) {
      return NextResponse.json(
        { error: "Energy must be low, medium, or high" },
        { status: 400 }
      );
    }

    const { data: checkin, error } = await supabase
      .from("checkins")
      .insert({ energy })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json(checkin, { status: 201 });
  } catch (e) {
    console.error("POST /api/checkins error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
