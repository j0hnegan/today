import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * Returns a list of date strings (YYYY-MM-DD) that have notes or tasks due.
 * Query params: from (YYYY-MM-DD), to (YYYY-MM-DD)
 */
export async function GET(request: NextRequest) {
  try {
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json({ error: "from and to parameters required" }, { status: 400 });
    }

    // Dates with notes that have content
    const noteDates = db
      .prepare(
        "SELECT DISTINCT date FROM notes WHERE date BETWEEN ? AND ? AND content IS NOT NULL AND content != ''"
      )
      .all(from, to) as { date: string }[];

    // Dates with tasks due
    const taskDates = db
      .prepare(
        "SELECT DISTINCT due_date AS date FROM tasks WHERE due_date BETWEEN ? AND ? AND status = 'active'"
      )
      .all(from, to) as { date: string }[];

    const dateSet = new Set<string>();
    for (const r of noteDates) dateSet.add(r.date);
    for (const r of taskDates) dateSet.add(r.date);

    return NextResponse.json(Array.from(dateSet).sort());
  } catch (e) {
    console.error("GET /api/dates-with-content error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
