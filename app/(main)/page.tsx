import { createClient } from "@/lib/supabase-server";
import { fetchNote } from "@/lib/server-fetchers";
import { ServerSWR } from "@/components/shared/ServerSWR";
import { PagePanel } from "@/components/focus/PagePanel";

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function TodayPage() {
  const supabase = createClient();
  const todayStr = toDateStr(new Date());
  const note = await fetchNote(supabase, todayStr);

  return (
    <ServerSWR fallback={{ [`/api/notes?date=${todayStr}`]: note }}>
      <PagePanel />
    </ServerSWR>
  );
}
