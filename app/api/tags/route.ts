import { requireAuth } from "@/lib/api-auth";
import { validateBody } from "@/lib/validation/helpers";
import { createTagSchema } from "@/lib/validation/tag";
import { SWR_HEADERS } from "@/lib/api-cache";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  try {
    const { data: tags, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return NextResponse.json(tags, { headers: SWR_HEADERS });
  } catch (e) {
    console.error("GET /api/tags error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  const parsed = await validateBody(request, createTagSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { name, color } = parsed;

  try {
    const { data: tag, error } = await supabase
      .from("categories")
      .insert({ name, color })
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
