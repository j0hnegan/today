"use client";

import { useRef } from "react";
import { SWRConfig } from "swr";

const CACHE_KEY = "hush-swr";

function localStorageProvider(): Map<string, unknown> {
  let init: [string, unknown][] = [];
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) init = JSON.parse(stored);
  } catch {}

  const map = new Map<string, unknown>(init);

  window.addEventListener("beforeunload", () => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(Array.from(map.entries())));
    } catch {}
  });

  return map;
}

export function SWRProvider({ children }: { children: React.ReactNode }) {
  const provider = useRef(localStorageProvider);
  return (
    <SWRConfig
      value={{
        provider: provider.current,
        revalidateOnFocus: false,
        dedupingInterval: 2000,
        shouldRetryOnError: true,
        errorRetryCount: 3,
      }}
    >
      {children}
    </SWRConfig>
  );
}
