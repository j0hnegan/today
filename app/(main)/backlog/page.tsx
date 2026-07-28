import { createClient } from "@/lib/supabase-server";
import { fetchTasks } from "@/lib/server-fetchers";
import { ServerSWR } from "@/components/shared/ServerSWR";
import { BacklogView } from "@/components/views/BacklogView";

export default async function BacklogPage() {
  const supabase = createClient();
  const tasks = await fetchTasks(supabase, { destination: "backlog", status: "active" });

  return (
    <ServerSWR
      fallback={{ "/api/tasks?destination=backlog&status=active": tasks }}
    >
      <BacklogView />
    </ServerSWR>
  );
}
