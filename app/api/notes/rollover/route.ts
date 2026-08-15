import { requireAuth } from "@/lib/api-auth";
import { validateBody } from "@/lib/validation/helpers";
import { dayRolloverSchema } from "@/lib/validation/note";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  const parsed = await validateBody(request, dayRolloverSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    const { data: note, error } = await supabase
      .rpc("handle_day_rollover", {
        p_from_date: parsed.from_date,
        p_to_date: parsed.to_date,
        p_action: parsed.action,
      })
      .single();
    if (error) throw error;

    return NextResponse.json(note);
  } catch (error) {
    console.error("POST /api/notes/rollover error:", error);
    return NextResponse.json({ error: "Couldn't record day rollover" }, { status: 500 });
  }
}
