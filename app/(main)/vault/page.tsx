import { createClient } from "@/lib/supabase-server";
import { fetchTasks } from "@/lib/server-fetchers";
import { ServerSWR } from "@/components/shared/ServerSWR";
import { VaultView } from "@/components/views/VaultView";

export default async function VaultPage() {
  // Only the task list blocks the visible first paint of /vault. Tags
  // (chip lookups) and settings (weekly nudge config) load client-side
  // via SWR — chips render lazily next to each task and the nudge banner
  // is conditional, so they don't hold up the page's TTFB.
  const supabase = createClient();
  const tasks = await fetchTasks(supabase);

  const fallback = { "/api/tasks": tasks };

  return (
    <ServerSWR fallback={fallback}>
      <VaultView />
    </ServerSWR>
  );
}
