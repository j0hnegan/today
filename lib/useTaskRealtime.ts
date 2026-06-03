"use client";

import { useEffect } from "react";
import { createClient } from "./supabase-browser";
import { applyRealtimeUpsert, applyRealtimeDelete, isLocalWrite } from "./taskCache";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import type { Task } from "./types";

/**
 * Live-syncs the task lists with the `tasks` table. Subscribes to
 * postgres_changes and patches the SWR cache directly (revalidate:false) for
 * every change THIS tab did not originate — additive only, no refetch, no
 * polling, no extra request for the user's own actions. Mount once.
 */
export function useTaskRealtime() {
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    function onChange(payload: RealtimePostgresChangesPayload<Task>) {
      if (payload.eventType === "DELETE") {
        const id = (payload.old as { id?: number }).id;
        if (id === undefined || isLocalWrite(id)) return;
        applyRealtimeDelete(id);
        return;
      }
      const row = payload.new as Task;
      if (!row?.id || isLocalWrite(row.id)) return;
      applyRealtimeUpsert(row);
    }

    // postgres_changes is authorized by the user's JWT against the table's RLS
    // policy. The session loads from cookies asynchronously, so the socket must
    // be handed the authenticated token BEFORE we subscribe — otherwise it
    // connects as `anon`, the RLS check rejects the binding, and zero events
    // are ever delivered (looks "subscribed" but silent).
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      channel = supabase
        .channel("tasks-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, onChange)
        .subscribe();
    })();

    // Keep the socket's token fresh across refreshes / sign-in.
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) supabase.realtime.setAuth(session.access_token);
    });

    return () => {
      cancelled = true;
      authSub.subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, []);
}
