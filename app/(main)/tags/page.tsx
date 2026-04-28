import { createClient } from "@/lib/supabase-server";
import { fetchTags, fetchGoals } from "@/lib/server-fetchers";
import { ServerSWR } from "@/components/shared/ServerSWR";
import { TagsView } from "@/components/views/TagsView";

export default async function TagsPage() {
  const supabase = createClient();
  const [tags, goals] = await Promise.all([
    fetchTags(supabase),
    fetchGoals(supabase),
  ]);

  const fallback = {
    "/api/tags": tags,
    "/api/goals": goals,
  };

  return (
    <ServerSWR fallback={fallback}>
      <TagsView />
    </ServerSWR>
  );
}
