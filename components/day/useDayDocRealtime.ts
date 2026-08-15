"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase-browser";

export interface DayDocChange {
  blocks: unknown;
  updated_at: string;
}

/**
 * Live-syncs the current date's day-doc row. Fires the callback for every
 * INSERT or UPDATE to the documents row for `dateStr` — from another tab, another
 * device, or the MCP. Caller decides how to merge (DayDoc applies when idle
 * and drops its own echoes via updated_at).
 */
export function useDayDocRealtime(
  dateStr: string,
  onRemote: (change: DayDocChange) => void,
  onReconnect: () => void
) {
  const cbRef = useRef(onRemote);
  cbRef.current = onRemote;
  const reconnectRef = useRef(onReconnect);
  reconnectRef.current = onReconnect;

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

      const onChange = (payload: { new: unknown }) => {
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
      };

      let hadDropped = false;
      channel = supabase
        .channel(`day-doc-${dateStr}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "documents", filter: `date=eq.${dateStr}` },
          onChange
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "documents", filter: `date=eq.${dateStr}` },
          onChange
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED" && hadDropped) {
            hadDropped = false;
            reconnectRef.current();
          } else if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            hadDropped = true;
            if (process.env.NODE_ENV !== "production") {
              console.warn(`[hush] Day-doc Realtime ${status.toLowerCase()}`);
            }
          }
        });
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
