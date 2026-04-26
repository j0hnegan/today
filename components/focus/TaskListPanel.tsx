"use client";

import { useRef, useCallback, useState, useEffect, useMemo } from "react";
import {
  GripVertical,
  SlidersHorizontal,
  ArrowUpDown,
  Check,
  X,
  CalendarOff,
  CalendarPlus,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { Task, Size } from "@/lib/types";
import { normalizeConsequence } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { patchTask, reorderTasks } from "@/lib/taskMutations";
import { TaskListSkeleton } from "@/components/focus/TaskListSkeleton";

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

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

/** Long-press check circle that fills up over duration then fires */
function LongPressCheck({
  task,
  onMarkDone,
  onLongPress,
}: {
  task: Task;
  onMarkDone: (t: Task) => void;
  onLongPress: (t: Task) => void;
}) {
  const [pressing, setPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);
  const firedRef = useRef(false);
  const DURATION = 750;

  const startPress = useCallback(() => {
    firedRef.current = false;
    setPressing(true);
    setProgress(0);
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min(elapsed / DURATION, 1);
      setProgress(pct);
      if (pct >= 1) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        firedRef.current = true;
        setPressing(false);
        setProgress(0);
        onLongPress(task);
      }
    }, 30);
  }, [task, onLongPress]);

  const endPress = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (!firedRef.current && pressing) {
      onMarkDone(task);
    }
    setPressing(false);
    setProgress(0);
  }, [pressing, task, onMarkDone]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        startPress();
      }}
      onMouseUp={endPress}
      onMouseLeave={() => {
        if (pressing) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setPressing(false);
          setProgress(0);
        }
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
        startPress();
      }}
      onTouchEnd={endPress}
      className="inline-flex items-center justify-center w-5 h-5 flex-shrink-0 text-muted-foreground group-hover/task:text-green-400 hover:!text-green-400 transition-colors relative"
    >
      {pressing ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5">
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.2"
          />
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke="rgb(74, 222, 128)"
            strokeWidth="1.5"
            strokeDasharray={`${progress * 56.55} 56.55`}
            strokeLinecap="round"
            transform="rotate(-90 12 12)"
            style={{ transition: "stroke-dasharray 30ms linear" }}
          />
        </svg>
      ) : (
        <CheckCircleIcon className="h-5 w-5" />
      )}
    </button>
  );
}

/** A single task row — used by both Today and In Progress tabs. */
function TaskRow({
  task,
  editingTaskId,
  setEditingTaskId,
  saveTaskTitle,
  onMarkDone,
  onLongPress,
  onDeleteTask,
  onNotTodayTask,
  onEnterAfterEdit,
  isLastRow,
}: {
  task: Task;
  editingTaskId: number | null;
  setEditingTaskId: (id: number | null) => void;
  saveTaskTitle: (id: number, title: string) => void;
  onMarkDone: (task: Task) => void;
  onLongPress: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onNotTodayTask: (task: Task) => void;
  onEnterAfterEdit?: () => void;
  isLastRow?: boolean;
}) {
  const isEditing = editingTaskId === (task.id as number);

  return (
    <>
      {!isEditing && (
        <LongPressCheck task={task} onMarkDone={onMarkDone} onLongPress={onLongPress} />
      )}
      {isEditing ? (
        <input
          type="text"
          defaultValue={task.title}
          autoFocus
          className="flex-1 min-w-0 text-left text-sm text-foreground outline-none rounded-md bg-accent/60 border border-border px-2 py-0.5 -my-0.5"
          onBlur={(e) => saveTaskTitle(task.id as number, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              saveTaskTitle(task.id as number, (e.target as HTMLInputElement).value);
              if (isLastRow && onEnterAfterEdit) onEnterAfterEdit();
            }
            if (e.key === "Escape") setEditingTaskId(null);
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="flex-1 min-w-0 flex items-center gap-1">
          <span
            className="min-w-0 truncate text-left cursor-text"
            onClick={(e) => {
              e.stopPropagation();
              setEditingTaskId(task.id as number);
            }}
          >
            {task.title}
          </span>
          {task.due_date && (
            <span className="group/date inline-flex items-center gap-0.5 flex-shrink-0">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
                    style={{ letterSpacing: "-0.25px" }}
                    title="Change due date"
                  >
                    {`${new Date(task.due_date + "T00:00:00").getMonth() + 1}/${new Date(task.due_date + "T00:00:00").getDate()}`}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" onClick={(e) => e.stopPropagation()}>
                  <Calendar
                    mode="single"
                    selected={new Date(task.due_date + "T00:00:00")}
                    onSelect={async (day) => {
                      const dateStr = day
                        ? `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`
                        : null;
                      try {
                        await patchTask(task, { due_date: dateStr });
                      } catch {
                        /* helper already toasted */
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await patchTask(task, { due_date: null });
                  } catch {
                    /* helper already toasted */
                  }
                }}
                className="opacity-0 group-hover/date:opacity-100 transition-opacity inline-flex items-center justify-center h-3 w-3 rounded text-muted-foreground hover:text-destructive"
                title="Clear due date"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
        </div>
      )}
      {!isEditing && (
        <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover/task:opacity-100 transition-opacity">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 h-5 px-1.5 rounded border border-border text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Set due date"
              >
                <CalendarPlus className="h-3 w-3" />
                <span className="hidden sm:inline">Date</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end" onClick={(e) => e.stopPropagation()}>
              <Calendar
                mode="single"
                selected={task.due_date ? new Date(task.due_date + "T00:00:00") : undefined}
                onSelect={async (day) => {
                  const dateStr = day
                    ? `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`
                    : null;
                  try {
                    await patchTask(task, { due_date: dateStr });
                  } catch {
                    /* helper already toasted */
                  }
                }}
              />
            </PopoverContent>
          </Popover>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNotTodayTask(task);
            }}
            className="inline-flex items-center gap-1 h-5 px-1.5 rounded border border-border text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Move to someday"
          >
            <CalendarOff className="h-3 w-3" />
            <span className="hidden sm:inline">Not today</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteTask(task);
            }}
            className="inline-flex items-center justify-center h-5 w-5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            title="Delete task"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </>
  );
}

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
                  <div
                    className={cn(
                      "flex w-full items-center gap-1 rounded-lg px-2 h-7 text-sm transition-colors hover:bg-accent/50 group/task",
                      draggingTaskIdx === taskIdx && "opacity-30"
                    )}
                    draggable={editingTaskId !== (task.id as number)}
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
                  >
                    <TaskRow
                      task={task}
                      editingTaskId={editingTaskId}
                      setEditingTaskId={setEditingTaskId}
                      saveTaskTitle={saveTaskTitle}
                      onMarkDone={onMarkDone}
                      onLongPress={onInProgressTask}
                      onDeleteTask={onDeleteTask}
                      onNotTodayTask={onNotTodayTask}
                      onEnterAfterEdit={onEnterAfterEdit}
                      isLastRow={taskIdx === sortedTasks.length - 1}
                    />
                  </div>
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
              <div
                key={task.id}
                className="flex w-full items-center gap-1 rounded-lg px-2 h-7 text-sm transition-colors hover:bg-accent/50 group/task"
              >
                <TaskRow
                  task={task}
                  editingTaskId={editingTaskId}
                  setEditingTaskId={setEditingTaskId}
                  saveTaskTitle={saveTaskTitle}
                  onMarkDone={onMarkDone}
                  onLongPress={onBackToTodayTask}
                  onDeleteTask={onDeleteTask}
                  onNotTodayTask={onNotTodayTask}
                />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
