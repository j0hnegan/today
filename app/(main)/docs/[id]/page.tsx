import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { fetchDoc } from "@/lib/server-fetchers";
import { ServerSWR } from "@/components/shared/ServerSWR";
import { DocDetailClient } from "./DocDetailClient";

export default async function DocDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  // Only the doc itself blocks first paint. Tags/goals/attachments load
  // client-side via SWR — they're virtually always already in cache from
  // the prior /docs render, and on direct visits they fetch in parallel
  // with the editor mount instead of blocking the server response.
  const supabase = createClient();
  const doc = await fetchDoc(supabase, id);
  if (!doc) notFound();

  const fallback = { [`/api/docs/${id}`]: doc };

  return (
    <ServerSWR fallback={fallback}>
      <DocDetailClient docId={id} />
    </ServerSWR>
  );
}
