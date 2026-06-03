"use client";

import { useEffect } from "react";
import { createClient } from "./supabase-browser";
import { applyRealtimeUpsert, applyRealtimeDelete, isLocalWrite } from "./taskCache";
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
    const channel = supabase
      .channel("tasks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: number }).id;
            if (id === undefined || isLocalWrite(id)) return;
            applyRealtimeDelete(id);
            return;
          }
          // INSERT | UPDATE
          const row = payload.new as Task;
          if (!row?.id || isLocalWrite(row.id)) return;
          applyRealtimeUpsert(row);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
