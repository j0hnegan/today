"use client";

import { useMemo, useState } from "react";
import { AlertCircle, ChevronDown, Plus } from "lucide-react";
import { useTasks } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";

// The one bit of "push" the Day view keeps: a quiet count of genuinely-due
// tasks so real deadlines can't silently vanish. Collapsed by default — it
// informs, it doesn't assign.
export function DueTodayTray({
  todayStr,
  embeddedIds,
  onPull,
}: {
  todayStr: string;
  embeddedIds: Set<number>;
  onPull: (tasks: Task[]) => void;
}) {
  const { data: allTasks } = useTasks();
  const [expanded, setExpanded] = useState(false);

  const due = useMemo(
    () =>
      (allTasks ?? []).filter(
        (t) =>
          t.status === "active" &&
          t.due_date !== null &&
          t.due_date <= todayStr &&
          !embeddedIds.has(t.id)
      ),
    [allTasks, todayStr, embeddedIds]
  );

  if (due.length === 0) return null;

  return (
    <div className="mb-3 rounded-[10px] border border-border bg-panel">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-3.5 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
        <span className="flex-1 text-left">
          {due.length} {due.length === 1 ? "task" : "tasks"} due today, not in your doc
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="border-t border-border px-2 py-1.5 space-y-0.5">
          {due.map((task) => (
            <div
              key={task.id}
              className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent/50"
            >
              <span className="flex-1 truncate">{task.title}</span>
              <button
                type="button"
                onClick={() => onPull([task])}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-accent transition-opacity"
              >
                <Plus className="h-3 w-3" />
                Pull in
              </button>
            </div>
          ))}
          {due.length > 1 && (
            <div className="flex justify-end pt-1 pb-0.5 pr-2">
              <button
                type="button"
                onClick={() => onPull(due)}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Pull all in
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
