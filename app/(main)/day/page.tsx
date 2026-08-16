import { createClient } from "@/lib/supabase-server";
import { fetchDayContext, fetchTasks } from "@/lib/server-fetchers";
import { ServerSWR } from "@/components/shared/ServerSWR";
import { DayDocPanel } from "@/components/day/DayDocPanel";

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function DayPage() {
  const supabase = createClient();
  const todayStr = toDateStr(new Date());
  const [dayContext, tasks] = await Promise.all([
    fetchDayContext(supabase, todayStr),
    fetchTasks(supabase),
  ]);

  return (
    <ServerSWR
      fallback={{ [`/api/notes?date=${todayStr}`]: dayContext.note, "/api/tasks": tasks }}
    >
      <DayDocPanel initialRolloverCandidate={dayContext.rolloverCandidate} />
    </ServerSWR>
  );
}
