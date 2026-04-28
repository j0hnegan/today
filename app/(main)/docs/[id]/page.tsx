import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import {
  fetchDoc,
  fetchTags,
  fetchGoals,
  fetchAttachments,
} from "@/lib/server-fetchers";
import { ServerSWR } from "@/components/shared/ServerSWR";
import { DocDetailClient } from "./DocDetailClient";

export default async function DocDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  // Fetch only what blocks the first paint of the editor: the doc itself
  // and the chip lookup tables (categories/goals). Attachments render
  // below the content and slash-command task lookups only matter when the
  // user types `/`, so let those load client-side via SWR — they don't
  // belong on the critical path.
  const supabase = createClient();
  const [doc, tags, goals, attachments] = await Promise.all([
    fetchDoc(supabase, id),
    fetchTags(supabase),
    fetchGoals(supabase),
    fetchAttachments(supabase, "document", id),
  ]);
  if (!doc) notFound();

  const fallback = {
    [`/api/docs/${id}`]: doc,
    "/api/tags": tags,
    "/api/goals": goals,
    [`/api/uploads?entity_type=document&entity_id=${id}`]: attachments,
  };

  return (
    <ServerSWR fallback={fallback}>
      <DocDetailClient docId={id} />
    </ServerSWR>
  );
}
