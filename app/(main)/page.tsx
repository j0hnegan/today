import { createClient } from "@/lib/supabase-server";
import {
  fetchTasks,
  fetchTags,
  fetchGoals,
  fetchNote,
  fetchDatesWithContent,
} from "@/lib/server-fetchers";
import { ServerSWR } from "@/components/shared/ServerSWR";
import { PagePanel } from "@/components/focus/PagePanel";

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function TodayPage() {
  const supabase = createClient();
  const today = new Date();
  const todayStr = toDateStr(today);

  const from = new Date(today);
  from.setMonth(from.getMonth() - 6);
  from.setDate(1);
  const to = new Date(today);
  to.setMonth(to.getMonth() + 2);
  to.setDate(0);
  const fromStr = toDateStr(from);
  const toStr = toDateStr(to);

  const [onDeck, inProgress, tags, goals, note, dates] = await Promise.all([
    fetchTasks(supabase, { destination: "on_deck", status: "active" }),
    fetchTasks(supabase, { destination: "in_progress", status: "active" }),
    fetchTags(supabase),
    fetchGoals(supabase),
    fetchNote(supabase, todayStr),
    fetchDatesWithContent(supabase, fromStr, toStr),
  ]);

  const fallback = {
    "/api/tasks?destination=on_deck&status=active": onDeck,
    "/api/tasks?destination=in_progress&status=active": inProgress,
    "/api/tags": tags,
    "/api/goals": goals,
    [`/api/notes?date=${todayStr}`]: note,
    [`/api/dates-with-content?from=${fromStr}&to=${toStr}`]: dates,
  };

  return (
    <ServerSWR fallback={fallback}>
      <PagePanel />
    </ServerSWR>
  );
}
