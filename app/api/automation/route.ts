import { runAutomation } from "@/lib/automation";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const result = await runAutomation();
    return NextResponse.json(result);
  } catch (e) {
    console.error("POST /api/automation error:", e);
    return NextResponse.json({ error: "Automation error" }, { status: 500 });
  }
}
