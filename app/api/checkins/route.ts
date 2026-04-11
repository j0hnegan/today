import { requireAuth } from "@/lib/api-auth";
import { validateBody } from "@/lib/validation/helpers";
import { createCheckinSchema } from "@/lib/validation/checkin";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

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
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  const parsed = await validateBody(request, createCheckinSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { energy } = parsed;

  try {
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
