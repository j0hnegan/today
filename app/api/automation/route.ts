import { runAutomation } from "@/lib/automation";
import { requireAuth } from "@/lib/api-auth";
import { NextResponse } from "next/server";

export async function POST() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  try {
    const result = await runAutomation(supabase);
    return NextResponse.json(result);
  } catch (e) {
    console.error("POST /api/automation error:", e);
    return NextResponse.json({ error: "Automation error" }, { status: 500 });
  }
}
