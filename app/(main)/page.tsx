import { createClient } from "@/lib/supabase-server";
import { fetchNote, fetchTasks } from "@/lib/server-fetchers";
import { ServerSWR } from "@/components/shared/ServerSWR";
import { PagePanel } from "@/components/focus/PagePanel";

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function TodayPage() {
  const supabase = createClient();
  const todayStr = toDateStr(new Date());
  // Fetch the note and the tasks IN PARALLEL so both panels hydrate into the
  // same server render and paint together. Concurrent fetches mean the page
  // waits for the slower of two fast queries — not their sum — so neither
  // panel lags behind the other.
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
