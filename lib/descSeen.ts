"use client";

import { useSyncExternalStore } from "react";

// Tracks which task descriptions John has SEEN (per device, localStorage).
// Task rows show a dot: amber = description changed since last opened,
// blue = has a description you've already read. Opening the edit modal
// marks the current description as seen.

const KEY = "focus-desc-seen";
type SeenMap = Record<string, string>;

let cache: SeenMap | null = null;
const listeners = new Set<() => void>();

function load(): SeenMap {
  if (cache) return cache;
  if (typeof window === "undefined") return {};
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "{}") as SeenMap;
  } catch {
    cache = {};
  }
  return cache;
}

/** Cheap stable hash of a description string. */
export function hashDesc(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return String(h);
}

export function markDescSeen(taskId: number, description: string) {
  if (typeof window === "undefined") return;
  const map = load();
  const next = hashDesc(description ?? "");
  if (map[String(taskId)] === next) return;
  map[String(taskId)] = next;
  cache = { ...map };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* full/blocked storage — dot state just won't persist */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** The seen-hash for a task (undefined = never opened). */
export function useDescSeen(taskId: number): string | undefined {
  return useSyncExternalStore(
    subscribe,
    () => load()[String(taskId)],
    () => undefined
  );
}
