"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { mutate } from "swr";

export function AutomationRunner() {
  useEffect(() => {
    async function run() {
      try {
        const res = await fetch("/api/automation", { method: "POST" });
        if (!res.ok) return;
        const data = await res.json();

        const hadChanges =
          data.promotedTasks > 0 || data.staledTasks > 0 || data.unsnoozedTasks > 0;

        if (data.promotedTasks > 0) {
          toast.info(
            `${data.promotedTasks} task${data.promotedTasks > 1 ? "s" : ""} moved to Today — due soon.`
          );
        }
        if (data.staledTasks > 0) {
          toast.info(
            `${data.staledTasks} task${data.staledTasks > 1 ? "s" : ""} moved back to Someday — ${data.staledTasks > 1 ? "they weren't" : "it wasn't"} getting done.`
          );
        }

        // Revalidate task lists if anything changed
        if (hadChanges) {
          mutate(
            (key: unknown) =>
              typeof key === "string" && key.startsWith("/api/tasks")
          );
        }
      } catch {
        // Silently fail — automation is not critical path
      }
    }

    run();
    const interval = setInterval(run, 5 * 60 * 1000); // every 5 minutes
    return () => clearInterval(interval);
  }, []);

  return null;
}
