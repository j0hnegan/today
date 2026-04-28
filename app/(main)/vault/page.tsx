import { createClient } from "@/lib/supabase-server";
import {
  fetchTasks,
  fetchTags,
  fetchSettings,
} from "@/lib/server-fetchers";
import { ServerSWR } from "@/components/shared/ServerSWR";
import { VaultView } from "@/components/views/VaultView";

export default async function VaultPage() {
  const supabase = createClient();
  const [tasks, tags, settings] = await Promise.all([
    fetchTasks(supabase),
    fetchTags(supabase),
    fetchSettings(supabase),
  ]);

  const fallback = {
    "/api/tasks": tasks,
    "/api/tags": tags,
    "/api/settings": settings,
  };

  return (
    <ServerSWR fallback={fallback}>
      <VaultView />
    </ServerSWR>
  );
}
