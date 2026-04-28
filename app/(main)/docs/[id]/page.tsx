import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import {
  fetchDoc,
  fetchTags,
  fetchGoals,
  fetchAttachments,
  fetchTasks,
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

  const supabase = createClient();
  const [doc, tags, goals, attachments, onDeck, someday] = await Promise.all([
    fetchDoc(supabase, id),
    fetchTags(supabase),
    fetchGoals(supabase),
    fetchAttachments(supabase, "document", id),
    fetchTasks(supabase, { destination: "on_deck", status: "active" }),
    fetchTasks(supabase, { destination: "someday", status: "active" }),
  ]);
  if (!doc) notFound();

  const fallback = {
    [`/api/docs/${id}`]: doc,
    "/api/tags": tags,
    "/api/goals": goals,
    [`/api/uploads?entity_type=document&entity_id=${id}`]: attachments,
    "/api/tasks?destination=on_deck&status=active": onDeck,
    "/api/tasks?destination=someday&status=active": someday,
  };

  return (
    <ServerSWR fallback={fallback}>
      <DocDetailClient docId={id} />
    </ServerSWR>
  );
}
