"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import {
  GripVertical,
  SlidersHorizontal,
  ArrowUpDown,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, Size } from "@/lib/types";
import { normalizeConsequence } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { reorderTasks } from "@/lib/taskMutations";
import { TaskListSkeleton } from "@/components/focus/TaskListSkeleton";
import { TaskItem } from "@/components/shared/TaskItem";

type SortKey = "due_date" | "size" | "goal" | "consequence";
const ALL_SIZES: Size[] = ["xs", "small", "medium", "large"];
const SIZE_LABELS: Record<Size, string> = {
  xs: "1-15 min",
  small: "15-30 min",
  medium: "30-60 min",
  large: "60+ min",
};
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "due_date", label: "Due date" },
  { value: "size", label: "Size" },
  { value: "goal", label: "Goal" },
  { value: "consequence", label: "Priority" },
];

/** Today / In Progress tabbed task list. */
export function TaskListPanel({
  tasks,
  inProgressTasks,
  loading,
  onMarkDone,
  // Wired through for future edit-modal use; not invoked directly here.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onEditTask,
  onDeleteTask,
  onNotTodayTask,
  onInProgressTask,
  onBackToTodayTask,
  editingTaskId,
  setEditingTaskId,
  saveTaskTitle,
  onEnterAfterEdit,
}: {
  tasks: Task[];
  inProgressTasks: Task[];
  loading?: boolean;
  onMarkDone: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onNotTodayTask: (task: Task) => void;
  onInProgressTask: (task: Task) => void;
  onBackToTodayTask: (task: Task) => void;
  editingTaskId: number | null;
  setEditingTaskId: (id: number | null) => void;
  saveTaskTitle: (id: number, title: string) => void;
  onEnterAfterEdit?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"today" | "in_progress">("today");
  const [draggingTaskIdx, setDraggingTaskIdx] = useState<number | null>(null);
  const [taskDropIdx, setTaskDropIdx] = useState<number | null>(null);
  const taskDropRef = useRef<number | null>(null);
  useEffect(() => {
    taskDropRef.current = taskDropIdx;
  }, [taskDropIdx]);
  const [sortKey, setSortKey] = useState<SortKey>("due_date");
  const [sizeFilter, setSizeFilter] = useState<Size[]>([...ALL_SIZES]);

  const toggleSize = (s: Size) => {
    setSizeFilter((prev) => {
      if (prev.length === ALL_SIZES.length) return [s];
      if (prev.includes(s)) {
        const next = prev.filter((x) => x !== s);
        return next.length === 0 ? [...ALL_SIZES] : next;
      }
      return [...prev, s];
    });
  };

  const hasActiveFilters = sizeFilter.length < ALL_SIZES.length;

  const sortedTasks = useMemo(() => {
    let filtered = tasks;
    if (sizeFilter.length < ALL_SIZES.length) {
      filtered = filtered.filter((t) => sizeFilter.includes(t.size));
    }
    return [...filtered].sort((a, b) => {
      const aPri = normalizeConsequence(a.consequence) === "hard" ? 0 : 1;
      const bPri = normalizeConsequence(b.consequence) === "hard" ? 0 : 1;
      let primary = 0;
      switch (sortKey) {
        case "due_date":
          if (a.due_date && b.due_date) primary = a.due_date.localeCompare(b.due_date);
          else if (a.due_date) primary = -1;
          else if (b.due_date) primary = 1;
          break;
        case "size": {
          const order: Record<string, number> = { xs: 0, small: 1, medium: 2, large: 3 };
          primary = (order[a.size] ?? 99) - (order[b.size] ?? 99);
          break;
        }
        case "consequence":
          primary = aPri - bPri;
          break;
      }
      if (primary !== 0) return primary;
      if (sortKey !== "consequence" && aPri !== bPri) return aPri - bPri;
      return a.created_at.localeCompare(b.created_at);
    });
  }, [tasks, sortKey, sizeFilter]);

  if (loading && tasks.length === 0 && inProgressTasks.length === 0) {
    return <TaskListSkeleton />;
  }

  if (tasks.length === 0 && inProgressTasks.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic py-1">
        No tasks today. Type{" "}
        <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">
          -
        </kbd>{" "}
        to add one.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <GripVertical className="h-3 w-3 text-muted-foreground/40" />
          <div className="flex items-center gap-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab("today");
              }}
              className={cn(
                "text-xs font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-md transition-colors",
                activeTab === "today"
                  ? "text-foreground"
                  : "text-muted-foreground/50 hover:text-muted-foreground"
              )}
            >
              Today · {tasks.length}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab("in_progress");
              }}
              className={cn(
                "text-xs font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-md transition-colors flex items-center gap-1.5",
                activeTab === "in_progress"
                  ? "text-foreground"
                  : "text-muted-foreground/50 hover:text-muted-foreground"
              )}
            >
              In Progress
              {inProgressTasks.length > 0 && (
                <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-green-500 text-[10px] font-bold text-white leading-none">
                  {inProgressTasks.length}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeTab !== "today" ? null : (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "inline-flex items-center justify-center h-6 w-6 rounded-md border transition-colors",
                      hasActiveFilters
                        ? "border-foreground/20 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-border"
                    )}
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="end">
                  <span className="text-xs font-medium text-muted-foreground">Size</span>
                  <div className="mt-1.5 space-y-0.5">
                    {ALL_SIZES.map((s) => {
                      const active = sizeFilter.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleSize(s)}
                          className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-accent"
                        >
                          <span className={active ? "text-foreground" : "text-muted-foreground"}>
                            {SIZE_LABELS[s]}
                          </span>
                          {active && <Check className="h-3 w-3 text-foreground" />}
                        </button>
                      );
                    })}
                  </div>
                  {hasActiveFilters && (
                    <button
                      onClick={() => setSizeFilter([...ALL_SIZES])}
                      className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1 border-t border-border mt-2 pt-2"
                    >
                      Reset
                    </button>
                  )}
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-accent text-[11px] text-muted-foreground hover:text-foreground transition-colors font-mono">
                    <ArrowUpDown className="h-3 w-3" />
                    {SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? "Due date"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-36 p-1" align="end">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSortKey(opt.value)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-accent",
                        sortKey === opt.value ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {opt.label}
                      {sortKey === opt.value && <Check className="h-3 w-3" />}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>
      </div>
      {activeTab === "today" && (
        <div className="space-y-0.5">
          {tasks.length === 0 ? (
            <div className="text-xs text-muted-foreground italic py-1">
              No tasks today. Type{" "}
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">
                -
              </kbd>{" "}
              to add one.
            </div>
          ) : (
            <>
              {sortedTasks.map((task, taskIdx) => (
                <div key={task.id}>
                  {taskDropIdx === taskIdx &&
                    draggingTaskIdx !== null &&
                    draggingTaskIdx !== taskIdx && (
                      <div className="h-0.5 bg-ring/60 rounded-full my-0.5" />
                    )}
                  <TaskItem
                    task={task}
                    onMarkDone={onMarkDone}
                    onLongPress={onInProgressTask}
                    onDeleteTask={onDeleteTask}
                    onNotTodayTask={onNotTodayTask}
                    editingTaskId={editingTaskId}
                    setEditingTaskId={setEditingTaskId}
                    saveTaskTitle={saveTaskTitle}
                    onEnterAfterEdit={onEnterAfterEdit}
                    isLastRow={taskIdx === sortedTasks.length - 1}
                    draggable={editingTaskId !== task.id}
                    isDragging={draggingTaskIdx === taskIdx}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.setData("text/task-reorder", String(taskIdx));
                      e.dataTransfer.effectAllowed = "move";
                      setDraggingTaskIdx(taskIdx);
                    }}
                    onDragEnd={() => {
                      setDraggingTaskIdx(null);
                      setTaskDropIdx(null);
                    }}
                    onDragOver={(e) => {
                      if (!e.dataTransfer.types.includes("text/task-reorder")) return;
                      e.preventDefault();
                      e.stopPropagation();
                      setTaskDropIdx(taskIdx);
                    }}
                    onDrop={async (e) => {
                      if (!e.dataTransfer.types.includes("text/task-reorder")) return;
                      e.preventDefault();
                      e.stopPropagation();
                      const fromTaskIdx = parseInt(
                        e.dataTransfer.getData("text/task-reorder"),
                        10
                      );
                      const toTaskIdx = taskDropRef.current;
                      if (toTaskIdx === null || fromTaskIdx === toTaskIdx) return;

                      const reordered = sortedTasks.map((t) => t.id as number);
                      const [movedId] = reordered.splice(fromTaskIdx, 1);
                      reordered.splice(toTaskIdx, 0, movedId);
                      try {
                        await reorderTasks(reordered);
                      } catch {
                        /* helper already toasted */
                      }
                      setDraggingTaskIdx(null);
                      setTaskDropIdx(null);
                    }}
                  />
                </div>
              ))}
              {taskDropIdx === sortedTasks.length && draggingTaskIdx !== null && (
                <div className="h-0.5 bg-ring/60 rounded-full my-0.5" />
              )}
            </>
          )}
        </div>
      )}

      {activeTab === "in_progress" && (
        <div className="space-y-0.5">
          {inProgressTasks.length === 0 ? (
            <div className="text-xs text-muted-foreground italic py-1">
              No tasks in progress. Hold the check circle on a task to move it here.
            </div>
          ) : (
            inProgressTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onMarkDone={onMarkDone}
                onLongPress={onBackToTodayTask}
                onDeleteTask={onDeleteTask}
                onNotTodayTask={onNotTodayTask}
                editingTaskId={editingTaskId}
                setEditingTaskId={setEditingTaskId}
                saveTaskTitle={saveTaskTitle}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
