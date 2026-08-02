"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase-browser";

export interface DayDocChange {
  blocks: unknown;
  updated_at: string;
}

/**
 * Live-syncs the current date's day-doc row. Fires the callback for every
 * UPDATE to the documents row for `dateStr` — from another tab, another
 * device, or the MCP. Caller decides how to merge (DayDoc applies when idle
 * and drops its own echoes via updated_at).
 */
export function useDayDocRealtime(dateStr: string, onRemote: (change: DayDocChange) => void) {
  const cbRef = useRef(onRemote);
  cbRef.current = onRemote;

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      // Same as useTaskRealtime: the socket must carry the authenticated JWT
      // BEFORE subscribing or RLS rejects the binding silently.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);

      channel = supabase
        .channel(`day-doc-${dateStr}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "documents", filter: `date=eq.${dateStr}` },
          (payload) => {
            const row = payload.new as { blocks?: unknown; updated_at?: string } | null;
            if (!row?.updated_at || row.blocks === undefined) return;
            let blocks = row.blocks;
            if (typeof blocks === "string") {
              try {
                blocks = JSON.parse(blocks);
              } catch {
                return;
              }
            }
            cbRef.current({ blocks, updated_at: row.updated_at });
          }
        )
        .subscribe();
    })();

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) supabase.realtime.setAuth(session.access_token);
    });

    return () => {
      cancelled = true;
      authSub.subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, [dateStr]);
}
