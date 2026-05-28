import { mutate } from "swr";
import { toast } from "sonner";
import { isDueToday } from "./triage";
import type { Task, Tag, Destination, Consequence, Size } from "./types";

const TODAY_KEY = "/api/tasks?destination=on_deck&status=active";
const IN_PROGRESS_KEY = "/api/tasks?destination=in_progress&status=active";
const UPCOMING_KEY = "/api/tasks?destination=upcoming&status=active";
const SOMEDAY_KEY = "/api/tasks?destination=someday&status=active";
// Vault uses the unfiltered /api/tasks endpoint and groups locally by status
// + destination. Every mutation that touches a per-filter list also has to
// mirror into this cache, otherwise marking a task done on Today still
// shows it as active on /vault until the next page refresh.
const ALL_KEY = "/api/tasks";

function keyForDestination(dest: Destination): string {
  if (dest === "on_deck") return TODAY_KEY;
  if (dest === "in_progress") return IN_PROGRESS_KEY;
  if (dest === "upcoming") return UPCOMING_KEY;
  return SOMEDAY_KEY;
}

function rollbackAllTaskLists() {
  mutate((k: unknown) => typeof k === "string" && k.startsWith("/api/tasks"));
}

function mirrorAll(updater: (curr: Task[] | undefined) => Task[]) {
  mutate(ALL_KEY, updater, { revalidate: false });
}

function invalidateDatesWithContent() {
  mutate((k: unknown) => typeof k === "string" && k.startsWith("/api/dates-with-content"));
}

/** Remove a task from a list (by id). */
function without(list: Task[] | undefined, id: number): Task[] {
  return (list ?? []).filter((t) => t.id !== id);
}

/** Append a task to the end of a list. */
function append(list: Task[] | undefined, task: Task): Task[] {
  return [...(list ?? []), task];
}

/** Replace a task in a list by id (or append if missing). */
function replace(list: Task[] | undefined, task: Task): Task[] {
  const current = list ?? [];
  const idx = current.findIndex((t) => t.id === task.id);
  if (idx === -1) return [...current, task];
  const next = [...current];
  next[idx] = task;
  return next;
}

export async function createTask(input: {
  title: string;
  destination?: Destination;
  size?: Size;
  description?: string;
  consequence?: Consequence;
  due_date?: string | null;
  tag_ids?: number[];
  tags?: Tag[];
}): Promise<Task> {
  // Replicate server-side auto-triage so the optimistic task lands in the right list
  let destination: Destination;
  if (input.due_date && isDueToday(input.due_date)) {
    destination = "on_deck";
  } else if (input.due_date) {
    destination = input.destination === "upcoming" ? "upcoming" : "someday";
  } else {
    destination = input.destination ?? "on_deck";
  }

  const tempId = -Date.now();
  const now = new Date().toISOString();
  const optimistic: Task = {
    id: tempId,
    title: input.title,
    description: input.description ?? "",
    destination,
    consequence: input.consequence ?? "none",
    size: input.size ?? "small",
    status: "active",
    due_date: input.due_date ?? null,
    snoozed_until: null,
    snooze_reason: null,
    done_at: null,
    sort_order: 0,
    created_at: now,
    updated_at: now,
    tags: input.tags ?? [],
  };

  const key = keyForDestination(destination);
  mutate(key, (curr: Task[] | undefined) => append(curr, optimistic), { revalidate: false });
  mirrorAll((curr) => append(curr, optimistic));

  try {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: input.title,
        destination: input.destination ?? "on_deck",
        size: input.size ?? "small",
        ...(input.description ? { description: input.description } : {}),
        ...(input.consequence ? { consequence: input.consequence } : {}),
        ...(input.due_date !== undefined ? { due_date: input.due_date } : {}),
        ...(input.tag_ids?.length ? { tag_ids: input.tag_ids } : {}),
      }),
    });
    if (!res.ok) throw new Error();
    const real: Task = await res.json();

    mutate(
      key,
      (curr: Task[] | undefined) => (curr ?? []).map((t) => (t.id === tempId ? real : t)),
      { revalidate: false }
    );
    mirrorAll((curr) => (curr ?? []).map((t) => (t.id === tempId ? real : t)));
    invalidateDatesWithContent();
    return real;
  } catch {
    // Rollback: drop the temp row and re-validate from server
    mutate(key, (curr: Task[] | undefined) => without(curr, tempId), { revalidate: false });
    mirrorAll((curr) => without(curr, tempId));
    rollbackAllTaskLists();
    toast.error("Failed to create task");
    throw new Error("create failed");
  }
}

/** Generic PATCH with optimistic update across affected lists. */
export async function patchTask(task: Task, patch: Partial<Task>): Promise<Task> {
  const prevDest = task.destination;
  const nextDest = (patch.destination ?? prevDest) as Destination;
  const prevKey = keyForDestination(prevDest);
  const nextKey = keyForDestination(nextDest);

  const optimistic: Task = { ...task, ...patch, updated_at: new Date().toISOString() };

  if (patch.status === "done") {
    // Done means it leaves all active per-destination lists, but stays in
    // the unfiltered cache with status=done so /vault's Done section sees it.
    mutate(prevKey, (curr: Task[] | undefined) => without(curr, task.id), { revalidate: false });
  } else if (nextDest !== prevDest) {
    mutate(prevKey, (curr: Task[] | undefined) => without(curr, task.id), { revalidate: false });
    mutate(nextKey, (curr: Task[] | undefined) => append(curr, optimistic), { revalidate: false });
  } else {
    mutate(prevKey, (curr: Task[] | undefined) => replace(curr, optimistic), { revalidate: false });
  }
  mirrorAll((curr) => replace(curr, optimistic));

  try {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error();
    const real: Task = await res.json();

    if (patch.status === "done") {
      // Nothing more to patch in active lists
    } else if (real.destination !== prevDest) {
      mutate(
        keyForDestination(real.destination),
        (curr: Task[] | undefined) => replace(curr, real),
        { revalidate: false }
      );
    } else {
      mutate(prevKey, (curr: Task[] | undefined) => replace(curr, real), { revalidate: false });
    }
    mirrorAll((curr) => replace(curr, real));
    return real;
  } catch {
    rollbackAllTaskLists();
    toast.error("Failed to update task");
    throw new Error("patch failed");
  }
}

export async function markDone(task: Task): Promise<void> {
  await patchTask(task, { status: "done" });
}

export async function moveToInProgress(task: Task): Promise<void> {
  await patchTask(task, { destination: "in_progress" });
}

export async function moveToToday(task: Task): Promise<void> {
  await patchTask(task, { destination: "on_deck" });
}

export async function moveToSomeday(task: Task): Promise<void> {
  await patchTask(task, { destination: "someday", due_date: null, consequence: "none" });
}

export async function moveToUpcoming(task: Task): Promise<void> {
  await patchTask(task, { destination: "upcoming" });
}

export async function deleteTask(task: Task): Promise<void> {
  const key = keyForDestination(task.destination);
  mutate(key, (curr: Task[] | undefined) => without(curr, task.id), { revalidate: false });
  mirrorAll((curr) => without(curr, task.id));

  try {
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (!res.ok) throw new Error();
    invalidateDatesWithContent();
  } catch {
    rollbackAllTaskLists();
    toast.error("Failed to delete task");
    throw new Error("delete failed");
  }
}

export async function reorderTasks(orderedIds: number[], destination?: Destination): Promise<void> {
  const cacheKey = destination ? keyForDestination(destination) : TODAY_KEY;

  mutate(
    cacheKey,
    (curr: Task[] | undefined) => {
      if (!curr) return curr;
      const byId = new Map(curr.map((t) => [t.id, t]));
      const next: Task[] = [];
      for (const id of orderedIds) {
        const t = byId.get(id);
        if (t) next.push(t);
      }
      for (const t of curr) if (!orderedIds.includes(t.id)) next.push(t);
      return next;
    },
    { revalidate: false }
  );

  mirrorAll((curr) => {
    if (!curr) return [];
    const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
    return [...curr].sort((a, b) => {
      const ai = orderMap.get(a.id);
      const bi = orderMap.get(b.id);
      if (ai !== undefined && bi !== undefined) return ai - bi;
      return 0;
    });
  });

  try {
    const res = await fetch("/api/tasks/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_ids: orderedIds }),
    });
    if (!res.ok) throw new Error();
  } catch {
    rollbackAllTaskLists();
    toast.error("Failed to reorder");
    throw new Error("reorder failed");
  }
}
