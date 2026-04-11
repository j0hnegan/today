import { mutate } from "swr";
import { toast } from "sonner";
import type { Task, Destination, Size } from "./types";

const TODAY_KEY = "/api/tasks?destination=on_deck&status=active";
const IN_PROGRESS_KEY = "/api/tasks?destination=in_progress&status=active";
const SOMEDAY_KEY = "/api/tasks?destination=someday&status=active";

function keyForDestination(dest: Destination): string {
  if (dest === "on_deck") return TODAY_KEY;
  if (dest === "in_progress") return IN_PROGRESS_KEY;
  return SOMEDAY_KEY;
}

function rollbackAllTaskLists() {
  mutate((k: unknown) => typeof k === "string" && k.startsWith("/api/tasks"));
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
  destination: Destination;
  size?: Size;
}): Promise<Task> {
  const tempId = -Date.now();
  const now = new Date().toISOString();
  const optimistic: Task = {
    id: tempId,
    title: input.title,
    description: "",
    destination: input.destination,
    consequence: "none",
    size: input.size ?? "small",
    status: "active",
    due_date: null,
    snoozed_until: null,
    snooze_reason: null,
    done_at: null,
    sort_order: 0,
    created_at: now,
    updated_at: now,
    tags: [],
  };

  const key = keyForDestination(input.destination);
  mutate(key, (curr: Task[] | undefined) => append(curr, optimistic), { revalidate: false });

  try {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: input.title, destination: input.destination, size: input.size ?? "small" }),
    });
    if (!res.ok) throw new Error();
    const real: Task = await res.json();

    mutate(
      key,
      (curr: Task[] | undefined) => (curr ?? []).map((t) => (t.id === tempId ? real : t)),
      { revalidate: false }
    );
    invalidateDatesWithContent();
    return real;
  } catch {
    // Rollback: drop the temp row and re-validate from server
    mutate(key, (curr: Task[] | undefined) => without(curr, tempId), { revalidate: false });
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
    // Done means it leaves all active lists
    mutate(prevKey, (curr: Task[] | undefined) => without(curr, task.id), { revalidate: false });
  } else if (nextDest !== prevDest) {
    mutate(prevKey, (curr: Task[] | undefined) => without(curr, task.id), { revalidate: false });
    mutate(nextKey, (curr: Task[] | undefined) => append(curr, optimistic), { revalidate: false });
  } else {
    mutate(prevKey, (curr: Task[] | undefined) => replace(curr, optimistic), { revalidate: false });
  }

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

export async function deleteTask(task: Task): Promise<void> {
  const key = keyForDestination(task.destination);
  mutate(key, (curr: Task[] | undefined) => without(curr, task.id), { revalidate: false });

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

export async function reorderTasks(orderedIds: number[]): Promise<void> {
  mutate(
    TODAY_KEY,
    (curr: Task[] | undefined) => {
      if (!curr) return curr;
      const byId = new Map(curr.map((t) => [t.id, t]));
      const next: Task[] = [];
      for (const id of orderedIds) {
        const t = byId.get(id);
        if (t) next.push(t);
      }
      // Append any that weren't in the order list (shouldn't happen)
      for (const t of curr) if (!orderedIds.includes(t.id)) next.push(t);
      return next;
    },
    { revalidate: false }
  );

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
