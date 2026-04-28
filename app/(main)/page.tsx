import { createClient } from "@/lib/supabase-server";
import { fetchTasks, fetchNote } from "@/lib/server-fetchers";
import { ServerSWR } from "@/components/shared/ServerSWR";
import { PagePanel } from "@/components/focus/PagePanel";

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function TodayPage() {
  // Only the data that blocks the first visible paint is fetched on the
  // server: today's tasks, in-progress tasks, and the day's note. Tags,
  // goals, and dates-with-content are needed for chips, pickers, and the
  // calendar dot — all of which render lazily or on interaction. They
  // load client-side via SWR (with stale-while-revalidate caching at the
  // edge) so they don't sit on the route's TTFB.
  const supabase = createClient();
  const todayStr = toDateStr(new Date());

  const [onDeck, inProgress, note] = await Promise.all([
    fetchTasks(supabase, { destination: "on_deck", status: "active" }),
    fetchTasks(supabase, { destination: "in_progress", status: "active" }),
    fetchNote(supabase, todayStr),
  ]);

  const fallback = {
    "/api/tasks?destination=on_deck&status=active": onDeck,
    "/api/tasks?destination=in_progress&status=active": inProgress,
    [`/api/notes?date=${todayStr}`]: note,
  };

  return (
    <ServerSWR fallback={fallback}>
      <PagePanel />
    </ServerSWR>
  );
}
