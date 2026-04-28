"use client";

import { SWRConfig } from "swr";

/**
 * Wraps a tree with an SWRConfig that pre-populates SWR's cache from a
 * server-rendered fallback dictionary. Keys must be the exact URLs that
 * the matching `useXxx` hooks fetch — this lets Server Components hydrate
 * the cache so the first render in the client never shows a skeleton.
 *
 * Uses the function form of `value` so the parent SWRProvider's config
 * (revalidateOnFocus, dedupingInterval, etc.) is preserved while we layer
 * fallback data on top — and so each navigation's fallback stomps the
 * previous one rather than persisting stale entries between routes.
 */
export function ServerSWR({
  fallback,
  children,
}: {
  fallback: Record<string, unknown>;
  children: React.ReactNode;
}) {
  return <SWRConfig value={{ fallback }}>{children}</SWRConfig>;
}
