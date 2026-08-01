import { createClient } from "@/lib/supabase-server";
import { fetchNote, fetchTasks } from "@/lib/server-fetchers";
import { ServerSWR } from "@/components/shared/ServerSWR";
import { DayDocPanel } from "@/components/day/DayDocPanel";

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function DayPage() {
  const supabase = createClient();
  const todayStr = toDateStr(new Date());
  const [note, tasks] = await Promise.all([
    fetchNote(supabase, todayStr),
    fetchTasks(supabase),
  ]);

  return (
    <ServerSWR
      fallback={{ [`/api/notes?date=${todayStr}`]: note, "/api/tasks": tasks }}
    >
      <DayDocPanel />
    </ServerSWR>
  );
}
