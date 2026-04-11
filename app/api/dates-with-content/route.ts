import { requireAuth } from "@/lib/api-auth";
import { validateSearchParams } from "@/lib/validation/helpers";
import { datesRangeQuerySchema } from "@/lib/validation/dates";
import { NextRequest, NextResponse } from "next/server";

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

    const [{ data: noteDates }, { data: taskDates }] = await Promise.all([
      supabase
        .from("notes")
        .select("date")
        .gte("date", from)
        .lte("date", to)
        .not("content", "is", null)
        .neq("content", ""),
      supabase
        .from("tasks")
        .select("due_date")
        .gte("due_date", from)
        .lte("due_date", to)
        .eq("status", "active"),
    ]);

    const dateSet = new Set<string>();
    for (const r of noteDates || []) dateSet.add(r.date);
    for (const r of taskDates || []) if (r.due_date) dateSet.add(r.due_date);

    return NextResponse.json(Array.from(dateSet).sort());
  } catch (e) {
    console.error("GET /api/dates-with-content error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
