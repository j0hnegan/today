import { createClient } from "@/lib/supabase-server";
import { fetchNote, fetchTasks } from "@/lib/server-fetchers";
import { ServerSWR } from "@/components/shared/ServerSWR";
import { PagePanel } from "@/components/focus/PagePanel";

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// The original two-panel Today page (notes + task sidebar), stashed here when
// the Day doc became the main Today view. Not linked from the nav.
export default async function ClassicTodayPage() {
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
      <PagePanel />
    </ServerSWR>
  );
}
