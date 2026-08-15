import { runAutomation } from "@/lib/automation";
import { requireAuth } from "@/lib/api-auth";
import { NextResponse } from "next/server";

export async function POST() {
  const startedAt = Date.now();
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  try {
    const { data: shouldRun, error: claimError } = await supabase.rpc(
      "claim_automation_run",
      { p_min_interval_seconds: 240 }
    );
    if (claimError) throw claimError;
    if (!shouldRun) {
      console.log(
        JSON.stringify({
          route: "/api/automation",
          result: "skipped",
          ms: Date.now() - startedAt,
        })
      );
      return NextResponse.json({
        promotedTasks: 0,
        promotedTaskTitles: [],
        bumpedOverdue: 0,
        upgradedTasks: 0,
        staledTasks: 0,
        unsnoozedTasks: 0,
        staledTaskTitles: [],
      });
    }

    const result = await runAutomation(supabase);
    console.log(
      JSON.stringify({
        route: "/api/automation",
        result: "ran",
        ms: Date.now() - startedAt,
      })
    );
    return NextResponse.json(result);
  } catch (e) {
    console.error(
      JSON.stringify({
        route: "/api/automation",
        result: "failed",
        error: e instanceof Error ? e.message : String(e),
        ms: Date.now() - startedAt,
      })
    );
    return NextResponse.json({ error: "Automation error" }, { status: 500 });
  }
}
