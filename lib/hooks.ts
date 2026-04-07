"use client";

import { useSyncExternalStore, useCallback } from "react";
import useSWR from "swr";
import type { Task, Tag, Category, Goal, Document, CheckIn, Note, Attachment, View } from "./types";
import { VALID_VIEWS } from "./types";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
};

export function useTasks(params?: {
  destination?: string;
  status?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.destination) searchParams.set("destination", params.destination);
  if (params?.status) searchParams.set("status", params.status);
  const query = searchParams.toString();
  const url = `/api/tasks${query ? `?${query}` : ""}`;

  return useSWR<Task[]>(url, fetcher);
}

export function useCategories() {
  return useSWR<Category[]>("/api/tags", fetcher);
}

// Backward compat alias
export function useTags() {
  return useSWR<Tag[]>("/api/tags", fetcher);
}

export function useGoals() {
  return useSWR<Goal[]>("/api/goals", fetcher);
}

export function useDocs() {
  return useSWR<Document[]>("/api/docs", fetcher);
}

export function useNote(date: string) {
  return useSWR<Note>(date ? `/api/notes?date=${date}` : null, fetcher);
}

export function useAttachments(entityType: string, entityId: number | null) {
  const url = entityType && entityId
    ? `/api/uploads?entity_type=${entityType}&entity_id=${entityId}`
    : null;
  return useSWR<Attachment[]>(url, fetcher);
}

export function useDatesWithContent(from: string, to: string) {
  const url = from && to ? `/api/dates-with-content?from=${from}&to=${to}` : null;
  return useSWR<string[]>(url, fetcher);
}

export function useLatestCheckin() {
  return useSWR<CheckIn | null>("/api/checkins", fetcher);
}

export function useSettings() {
  return useSWR<Record<string, string>>("/api/settings", fetcher);
}

// --- Persisted view (localStorage-backed, flash-free) ---

const VIEW_STORAGE_KEY = "focus_current_view";

function getViewSnapshot(): View {
  try {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY);
    if (saved && VALID_VIEWS.includes(saved as View)) {
      return saved as View;
    }
  } catch {
    // localStorage unavailable
  }
  return "focus";
}

function getViewServerSnapshot(): View | null {
  return null;
}

function subscribeView(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function usePersistedView(): [View | null, (v: View) => void] {
  const view = useSyncExternalStore(subscribeView, getViewSnapshot, getViewServerSnapshot);

  const setView = useCallback((v: View) => {
    localStorage.setItem(VIEW_STORAGE_KEY, v);
    window.dispatchEvent(new StorageEvent("storage", { key: VIEW_STORAGE_KEY }));
  }, []);

  return [view, setView];
}
