"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { mutate } from "@/lib/swr-helpers";

const LAST_RUN_KEY = "hush-automation-last-run";
const MIN_RUN_INTERVAL_MS = 4 * 60 * 1000;

export function AutomationRunner() {
  useEffect(() => {
    async function runIfDue() {
      const now = Date.now();
      const lastRun = Number(localStorage.getItem(LAST_RUN_KEY));
      if (Number.isFinite(lastRun) && now - lastRun < MIN_RUN_INTERVAL_MS) return;
      localStorage.setItem(LAST_RUN_KEY, String(now));

      try {
        const res = await fetch("/api/automation", { method: "POST" });
        if (!res.ok) throw new Error("Automation failed");
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
        if (localStorage.getItem(LAST_RUN_KEY) === String(now)) {
          localStorage.removeItem(LAST_RUN_KEY);
        }
        // Silently fail — automation is not critical path
      }
    }

    function run() {
      if (document.visibilityState === "hidden") return;
      if (navigator.locks) {
        void navigator.locks.request(
          "hush-automation",
          { ifAvailable: true },
          async (lock) => {
            if (lock) await runIfDue();
          }
        );
        return;
      }
      void runIfDue();
    }

    run();
    const interval = setInterval(run, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
