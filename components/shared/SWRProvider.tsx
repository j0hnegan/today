"use client";

import { useRef } from "react";
import { SWRConfig, useSWRConfig, type Cache } from "swr";
import { registerMutate } from "@/lib/swr-helpers";

const CACHE_KEY = "hush-swr";

function localStorageProvider(): Cache {
  if (typeof window === "undefined") return new Map() as unknown as Cache;

  let init: [string, unknown][] = [];
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) init = JSON.parse(stored);
  } catch {}

  const map = new Map<string, unknown>(init);

  // Persist on hide as well as unload: beforeunload never fires when a
  // backgrounded tab is killed (mobile Safari, OS memory pressure), which left
  // localStorage holding a snapshot from whenever the tab was last closed
  // cleanly — resurrecting long-gone tasks on the next boot.
  const persist = () => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(Array.from(map.entries())));
    } catch {}
  };
  window.addEventListener("beforeunload", persist);
  window.addEventListener("pagehide", persist);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") persist();
  });

  return map as unknown as Cache;
}

function MutateRegistrar() {
  const { mutate } = useSWRConfig();
  registerMutate(mutate);
  return null;
}

export function SWRProvider({ children }: { children: React.ReactNode }) {
  const provider = useRef(localStorageProvider);
  return (
    <SWRConfig
      value={{
        provider: provider.current,
        // Realtime keeps lists live while the socket is up, but a tab that
        // slept through a disconnect has silently missed events. Refocus is
        // exactly when that tab comes back — revalidate then, throttled so an
        // active tab isn't spamming requests on every window switch.
        revalidateOnFocus: true,
        focusThrottleInterval: 10000,
        dedupingInterval: 2000,
        shouldRetryOnError: true,
        errorRetryCount: 3,
      }}
    >
      <MutateRegistrar />
      {children}
    </SWRConfig>
  );
}
