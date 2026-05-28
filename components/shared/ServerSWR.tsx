"use client";

import { useRef } from "react";
import { SWRConfig, useSWRConfig } from "swr";

/**
 * Overwrites stale localStorage-cached entries with fresh server data.
 * Runs synchronously during render (before children mount) so useSWR
 * hooks read the server's data on first render — matching SSR output.
 */
function CacheSyncer({ data }: { data: Record<string, unknown> }) {
  const { cache } = useSWRConfig();
  const synced = useRef(false);
  if (!synced.current) {
    synced.current = true;
    const map = cache as unknown as Map<string, unknown>;
    for (const [key, value] of Object.entries(data)) {
      const existing = map.get(key);
      if (existing && typeof existing === "object") {
        // Preserve SWR's internal state shape, overwrite data
        map.set(key, { ...(existing as Record<string, unknown>), data: value });
      } else {
        map.set(key, { data: value, isLoading: false, isValidating: true });
      }
    }
  }
  return null;
}

export function ServerSWR({
  fallback,
  children,
}: {
  fallback: Record<string, unknown>;
  children: React.ReactNode;
}) {
  return (
    <SWRConfig value={{ fallback }}>
      <CacheSyncer data={fallback} />
      {children}
    </SWRConfig>
  );
}
