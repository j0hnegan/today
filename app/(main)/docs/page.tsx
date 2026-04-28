import { createClient } from "@/lib/supabase-server";
import { fetchDocs } from "@/lib/server-fetchers";
import { ServerSWR } from "@/components/shared/ServerSWR";
import { DocsView } from "@/components/views/DocsView";

export default async function DocsPage() {
  const supabase = createClient();
  const docs = await fetchDocs(supabase);

  const fallback = {
    "/api/docs": docs,
  };

  return (
    <ServerSWR fallback={fallback}>
      <DocsView />
    </ServerSWR>
  );
}
