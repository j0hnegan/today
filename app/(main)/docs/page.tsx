import { createClient } from "@/lib/supabase-server";
import { fetchDocs, fetchNotesList } from "@/lib/server-fetchers";
import { ServerSWR } from "@/components/shared/ServerSWR";
import { DocsView } from "@/components/views/DocsView";

export default async function DocsPage() {
  const supabase = createClient();
  const [docs, notes] = await Promise.all([
    fetchDocs(supabase),
    fetchNotesList(supabase),
  ]);

  const fallback = {
    "/api/docs": docs,
    "/api/notes/list": notes,
  };

  return (
    <ServerSWR fallback={fallback}>
      <DocsView />
    </ServerSWR>
  );
}
