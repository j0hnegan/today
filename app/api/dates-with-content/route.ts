import { requireAuth } from "@/lib/api-auth";
import { fetchDatesWithContent } from "@/lib/server-fetchers";
import { validateSearchParams } from "@/lib/validation/helpers";
import { datesRangeQuerySchema } from "@/lib/validation/dates";
import { SWR_HEADERS } from "@/lib/api-cache";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/**
 * Returns a list of date strings (YYYY-MM-DD) that have notes or tasks due.
 * Query params: from (YYYY-MM-DD), to (YYYY-MM-DD)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  const params = validateSearchParams(request.nextUrl.searchParams, datesRangeQuerySchema);
  if (params instanceof NextResponse) return params;
  const { from, to } = params;

  try {
    const dates = await fetchDatesWithContent(supabase, from, to);
    return NextResponse.json(dates, { headers: SWR_HEADERS });
  } catch (e) {
    console.error("GET /api/dates-with-content error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
