import { mutate } from "./swr-helpers";
import type { Task, Destination } from "./types";

// The exact SWR cache keys the task lists read from. Both the optimistic
// mutation layer (taskMutations.ts) and the Realtime sync (useTaskRealtime.ts)
// patch these — this module is the single source of truth for the key set and
// the list-patching primitives so the two paths can never drift apart.
export const TODAY_KEY = "/api/tasks?destination=on_deck&status=active";
export const IN_PROGRESS_KEY = "/api/tasks?destination=in_progress&status=active";
export const UPCOMING_KEY = "/api/tasks?destination=upcoming&status=active";
export const SOMEDAY_KEY = "/api/tasks?destination=someday&status=active";
// Vault reads the unfiltered /api/tasks endpoint and groups locally by status
// + destination, so every write that touches a per-filter list must mirror
// into this cache too.
export const ALL_KEY = "/api/tasks";

const PER_DEST_KEYS = [TODAY_KEY, IN_PROGRESS_KEY, UPCOMING_KEY, SOMEDAY_KEY] as const;

export function keyForDestination(dest: Destination): string {
  if (dest === "on_deck") return TODAY_KEY;
  if (dest === "in_progress") return IN_PROGRESS_KEY;
  if (dest === "upcoming") return UPCOMING_KEY;
  return SOMEDAY_KEY;
}

/** Remove a task from a list (by id). */
export function without(list: Task[] | undefined, id: number): Task[] {
  return (list ?? []).filter((t) => t.id !== id);
}

/** Append a task to the end of a list. */
export function append(list: Task[] | undefined, task: Task): Task[] {
  return [...(list ?? []), task];
}

/** Replace a task in a list by id. No-ops if the task is not found. */
export function replace(list: Task[] | undefined, task: Task): Task[] {
  const current = list ?? [];
  const idx = current.findIndex((t) => t.id === task.id);
  if (idx === -1) return current;
  const next = [...current];
  next[idx] = task;
  return next;
}

/**
 * Swap an optimistic temp row for the real row, collapsing any duplicate the
 * Realtime INSERT echo may have already appended under the real id. Drops both
 * the temp id and any pre-existing real-id row, then appends the real one —
 * so the list converges to exactly one row regardless of which arrives first.
 */
export function swapTemp(list: Task[] | undefined, tempId: number, real: Task): Task[] {
  const rest = (list ?? []).filter((t) => t.id !== tempId && t.id !== real.id);
  return [...rest, real];
}

/**
 * Upsert a row by id, preserving the tags already in cache. Realtime
 * postgres_changes payloads carry only the `tasks` columns (no joined
 * categories), so a bare replace would blow away tags on every external edit.
 */
function upsertPreservingTags(list: Task[] | undefined, row: Task): Task[] {
  const current = list ?? [];
  const idx = current.findIndex((t) => t.id === row.id);
  const merged: Task = { ...row, tags: row.tags ?? current[idx]?.tags ?? [] };
  if (idx === -1) return [...current, merged];
  const next = [...current];
  next[idx] = merged;
  return next;
}

// -- Self-echo suppression -------------------------------------------------
// A write made in THIS tab is already reflected optimistically; the Realtime
// echo for it carries no new information and would only risk a flicker/dup.
// We record ids this tab just wrote and ignore their echoes for a short
// window. (Creates register their real id once POST returns; if the echo
// races ahead of that, swapTemp + the id-keyed upsert still converge to one
// row — the suppression is the fast path, not the correctness guarantee.)
const recentLocalWrites = new Map<number, number>();
const LOCAL_WRITE_TTL = 3000;

export function markLocalWrite(id: number) {
  recentLocalWrites.set(id, Date.now());
}

export function isLocalWrite(id: number): boolean {
  const t = recentLocalWrites.get(id);
  if (t === undefined) return false;
  if (Date.now() - t > LOCAL_WRITE_TTL) {
    recentLocalWrites.delete(id);
    return false;
  }
  return true;
}

// Realtime only ever patches a list that's already loaded. Keys for views the
// user hasn't opened start undefined; seeding them from a single streamed row
// would build a partial list that SWR then shows before revalidating (the same
// class of bug that produced phantom vault rows). When the user opens that
// view, SWR fetches the full list fresh.
function patchIfLoaded(key: string, fn: (list: Task[]) => Task[]) {
  mutate(key, (curr: Task[] | undefined) => (curr === undefined ? undefined : fn(curr)), {
    revalidate: false,
  });
}

/**
 * Apply an external INSERT/UPDATE to every loaded cache key. The row lives in a
 * per-destination active list only when its destination matches AND it's still
 * active; everywhere else it's removed. The unfiltered vault cache always keeps
 * it (active or done). All patches are revalidate:false — no refetch.
 */
export function applyRealtimeUpsert(row: Task) {
  for (const key of PER_DEST_KEYS) {
    const belongs = key === keyForDestination(row.destination) && row.status === "active";
    patchIfLoaded(key, (curr) => (belongs ? upsertPreservingTags(curr, row) : without(curr, row.id)));
  }
  patchIfLoaded(ALL_KEY, (curr) => upsertPreservingTags(curr, row));
}

/** Apply an external DELETE to every loaded cache key. */
export function applyRealtimeDelete(id: number) {
  for (const key of [...PER_DEST_KEYS, ALL_KEY]) {
    patchIfLoaded(key, (curr) => without(curr, id));
  }
}
