import { requireAuth } from "@/lib/api-auth";
import { SWR_HEADERS } from "@/lib/api-cache";
import { fetchDayContext } from "@/lib/server-fetchers";
import { validateSearchParams } from "@/lib/validation/helpers";
import { noteQuerySchema } from "@/lib/validation/note";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const params = validateSearchParams(request.nextUrl.searchParams, noteQuerySchema);
  if (params instanceof NextResponse) return params;

  try {
    const context = await fetchDayContext(auth.supabase, params.date);
    return NextResponse.json(context, { headers: SWR_HEADERS });
  } catch (error) {
    console.error("GET /api/notes/context error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
