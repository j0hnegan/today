import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const rows = db.prepare("SELECT * FROM settings").all() as {
      key: string;
      value: string;
    }[];
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return NextResponse.json(settings);
  } catch (e) {
    console.error("GET /api/settings error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    const upsert = db.prepare(
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)"
    );

    const transaction = db.transaction(() => {
      for (const [key, value] of Object.entries(body)) {
        upsert.run(key, String(value));
      }
    });

    transaction();

    // Return updated settings
    const rows = db.prepare("SELECT * FROM settings").all() as {
      key: string;
      value: string;
    }[];
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return NextResponse.json(settings);
  } catch (e) {
    console.error("PATCH /api/settings error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
