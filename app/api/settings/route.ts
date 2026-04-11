import { requireAuth } from "@/lib/api-auth";
import { validateBody } from "@/lib/validation/helpers";
import { updateSettingsSchema } from "@/lib/validation/settings";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

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
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  const parsed = await validateBody(request, updateSettingsSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    const upserts = Object.entries(parsed).map(([key, value]) => ({
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
