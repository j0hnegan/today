import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const checkin = db
      .prepare("SELECT * FROM checkins ORDER BY created_at DESC LIMIT 1")
      .get();
    return NextResponse.json(checkin ?? null);
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

    const result = db
      .prepare("INSERT INTO checkins (energy) VALUES (?)")
      .run(energy);
    const checkin = db
      .prepare("SELECT * FROM checkins WHERE id = ?")
      .get(result.lastInsertRowid);
    return NextResponse.json(checkin, { status: 201 });
  } catch (e) {
    console.error("POST /api/checkins error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
