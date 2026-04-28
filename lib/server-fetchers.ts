import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Task,
  Document,
  Goal,
  Category,
  Tag,
  Note,
  Attachment,
} from "@/lib/types";

// Server-side fetchers that mirror the responses of the matching `/api/*`
// route handlers. Used by App Router Server Components to pre-populate the
// SWR cache so the client doesn't need to refetch on first render.
//
// Keep the return shapes identical to the API responses so SWR's `fallback`
// cache (keyed by URL) is consistent whether data came from the server or
// from a later client-side revalidation.

type SB = SupabaseClient;

export async function fetchTasks(
  supabase: SB,
  params: { destination?: string; status?: string } = {}
): Promise<Task[]> {
  let query = supabase.from("tasks").select("*");
  if (params.destination) query = query.eq("destination", params.destination);
  if (params.status) query = query.eq("status", params.status);
  query = query
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });

  const { data: tasks } = await query;
  if (!tasks || tasks.length === 0) return [];

  const taskIds = tasks.map((t) => t.id);
  const { data: rows } = await supabase
    .from("task_categories")
    .select("task_id, categories(id, name, color)")
    .in("task_id", taskIds);

  const tagsByTask = new Map<number, Category[]>();
  for (const row of rows || []) {
    const cat = row.categories as unknown as Category | null;
    if (!cat) continue;
    if (!tagsByTask.has(row.task_id)) tagsByTask.set(row.task_id, []);
    tagsByTask.get(row.task_id)!.push(cat);
  }

  return tasks.map((t) => ({ ...t, tags: tagsByTask.get(t.id) ?? [] })) as Task[];
}

export async function fetchTags(supabase: SB): Promise<Tag[]> {
  const { data } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });
  return (data ?? []) as Tag[];
}

export async function fetchGoals(supabase: SB): Promise<Goal[]> {
  const { data: rows } = await supabase
    .from("goals")
    .select("*, categories(id, name, color)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  return (rows ?? []).map((row) => {
    const { categories, ...goal } = row as Record<string, unknown>;
    return { ...goal, category: (categories as Category | null) ?? null } as Goal;
  });
}

export async function fetchDocs(supabase: SB): Promise<Document[]> {
  const { data: docs } = await supabase
    .from("documents")
    .select("*")
    .order("updated_at", { ascending: false });
  if (!docs || docs.length === 0) return [];

  const docIds = docs.map((d) => d.id);
  const [{ data: docCats }, { data: docGoals }] = await Promise.all([
    supabase
      .from("document_categories")
      .select("document_id, categories(id, name, color)")
      .in("document_id", docIds),
    supabase
      .from("document_goals")
      .select("document_id, goals(id, title, description, category_id, status)")
      .in("document_id", docIds),
  ]);

  const catsByDoc = new Map<number, Category[]>();
  for (const row of docCats || []) {
    if (!catsByDoc.has(row.document_id)) catsByDoc.set(row.document_id, []);
    catsByDoc.get(row.document_id)!.push(row.categories as unknown as Category);
  }
  const goalsByDoc = new Map<number, Goal[]>();
  for (const row of docGoals || []) {
    if (!goalsByDoc.has(row.document_id)) goalsByDoc.set(row.document_id, []);
    goalsByDoc.get(row.document_id)!.push(row.goals as unknown as Goal);
  }

  return docs.map((doc) => ({
    ...doc,
    categories: catsByDoc.get(doc.id) ?? [],
    goals: goalsByDoc.get(doc.id) ?? [],
  })) as Document[];
}

export async function fetchDoc(
  supabase: SB,
  id: number
): Promise<Document | null> {
  // Single round-trip: nest the join tables in the select so Supabase
  // returns the doc + its categories + goals in one response. The earlier
  // version did three sequential queries which dominated the doc-detail
  // page's TTFB.
  const { data: row } = await supabase
    .from("documents")
    .select(`
      *,
      document_categories(categories(id, name, color)),
      document_goals(goals(id, title, description, category_id, status))
    `)
    .eq("id", id)
    .single();
  if (!row) return null;

  const docCategories = (row.document_categories ?? []).map(
    (r: { categories: Category | null }) => r.categories
  ).filter(Boolean) as Category[];
  const docGoals = (row.document_goals ?? []).map(
    (r: { goals: Goal | null }) => r.goals
  ).filter(Boolean) as Goal[];

  const { document_categories, document_goals, ...doc } = row;
  void document_categories;
  void document_goals;

  return {
    ...doc,
    categories: docCategories,
    goals: docGoals,
  } as Document;
}

export async function fetchAttachments(
  supabase: SB,
  entityType: string,
  entityId: number
): Promise<Attachment[]> {
  const { data } = await supabase
    .from("attachments")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Attachment[];
}

export async function fetchNote(supabase: SB, date: string): Promise<Note> {
  const { data: note } = await supabase
    .from("notes")
    .select("*")
    .eq("date", date)
    .single();

  if (!note) {
    return { id: null, date, content: "", blocks: null } as unknown as Note;
  }

  let blocks = null;
  if (note.blocks && typeof note.blocks === "string") {
    try {
      blocks = JSON.parse(note.blocks);
    } catch {
      blocks = null;
    }
  }

  const { data: attachments } = await supabase
    .from("attachments")
    .select("*")
    .eq("entity_type", "note")
    .eq("entity_id", note.id)
    .order("created_at", { ascending: false });

  return { ...note, blocks, attachments: attachments || [] } as Note;
}

export async function fetchSettings(
  supabase: SB
): Promise<Record<string, string>> {
  const { data: rows } = await supabase.from("settings").select("*");
  const settings: Record<string, string> = {};
  for (const row of rows || []) settings[row.key] = row.value;
  return settings;
}

export async function fetchDatesWithContent(
  supabase: SB,
  from: string,
  to: string
): Promise<string[]> {
  const [{ data: noteDates }, { data: taskDates }] = await Promise.all([
    supabase
      .from("notes")
      .select("date")
      .gte("date", from)
      .lte("date", to)
      .not("content", "is", null)
      .neq("content", ""),
    supabase
      .from("tasks")
      .select("due_date")
      .gte("due_date", from)
      .lte("due_date", to)
      .eq("status", "active"),
  ]);

  const dateSet = new Set<string>();
  for (const r of noteDates || []) dateSet.add(r.date);
  for (const r of taskDates || []) if (r.due_date) dateSet.add(r.due_date);
  return Array.from(dateSet).sort();
}

export async function fetchLatestCheckin(supabase: SB) {
  const { data } = await supabase
    .from("checkins")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}
