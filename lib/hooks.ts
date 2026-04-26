"use client";

import useSWR from "swr";
import type { Task, Tag, Category, Goal, Document, CheckIn, Note, Attachment } from "./types";

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

export function useDoc(id: number | null) {
  return useSWR<Document>(id ? `/api/docs/${id}` : null, fetcher);
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

