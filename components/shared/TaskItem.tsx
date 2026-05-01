"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarOff, CalendarPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { patchTask } from "@/lib/taskMutations";
import type { Task } from "@/lib/types";

export type SelectionPosition = "solo" | "first" | "middle" | "last" | null;

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

/** Long-press check circle: tap to mark done, hold to fire onLongPress. */
export function LongPressCheck({
  task,
  onMarkDone,
  onLongPress,
  isDone,
}: {
  task: Task;
  onMarkDone: (t: Task) => void;
  onLongPress?: (t: Task) => void;
  isDone?: boolean;
}) {
  const [pressing, setPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);
  const firedRef = useRef(false);
  const DURATION = 750;

  const startPress = useCallback(() => {
    if (isDone || !onLongPress) return;
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
  }, [task, onLongPress, isDone]);

  const endPress = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (!firedRef.current && pressing && !isDone) {
      onMarkDone(task);
    }
    setPressing(false);
    setProgress(0);
  }, [pressing, task, onMarkDone, isDone]);

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
        if (isDone) return;
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
        if (isDone) return;
        startPress();
      }}
      onTouchEnd={endPress}
      className={cn(
        "inline-flex items-center justify-center w-5 h-5 flex-shrink-0 transition-colors relative",
        isDone
          ? "text-green-400 cursor-default"
          : "text-muted-foreground group-hover/task:text-green-400 hover:!text-green-400"
      )}
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

interface TaskItemProps {
  task: Task;

  // Required actions
  onMarkDone: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onNotTodayTask: (task: Task) => void;

  // Optional long-press behavior (omitted for the Done section)
  onLongPress?: (task: Task) => void;

  // Inline title editing
  editingTaskId: number | null;
  setEditingTaskId: (id: number | null) => void;
  saveTaskTitle: (id: number, title: string) => void;
  onEnterAfterEdit?: () => void;
  isLastRow?: boolean;

  // Multi-select (vault)
  isSelected?: boolean;
  selectionPosition?: SelectionPosition;
  onRowClick?: (task: Task, e: React.MouseEvent) => void;

  // Drag & drop (vault cross-section moves; today reorder)
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent, task: Task) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

/** Compact task row used by both the daily Today list and the My Tasks vault. */
export function TaskItem({
  task,
  onMarkDone,
  onDeleteTask,
  onNotTodayTask,
  onLongPress,
  editingTaskId,
  setEditingTaskId,
  saveTaskTitle,
  onEnterAfterEdit,
  isLastRow,
  isSelected,
  selectionPosition,
  onRowClick,
  draggable,
  isDragging,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: TaskItemProps) {
  const isEditing = editingTaskId === task.id;
  const isDone = task.status === "done";

  let selectionRadius = "rounded-lg";
  if (isSelected && selectionPosition) {
    switch (selectionPosition) {
      case "first":
        selectionRadius = "rounded-t-lg rounded-b-none";
        break;
      case "middle":
        selectionRadius = "rounded-none";
        break;
      case "last":
        selectionRadius = "rounded-b-lg rounded-t-none";
        break;
      case "solo":
        selectionRadius = "rounded-lg";
        break;
    }
  }

  return (
    <div
      className={cn(
        "flex w-full items-center gap-1 px-2 h-7 text-sm transition-colors group/task",
        selectionRadius,
        isSelected ? "bg-accent/60" : "hover:bg-accent/50",
        isDragging && "opacity-30",
        isDone && "text-muted-foreground"
      )}
      draggable={draggable && !isEditing}
      onDragStart={onDragStart ? (e) => onDragStart(e, task) : undefined}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onRowClick ? (e) => onRowClick(task, e) : undefined}
    >
      {!isEditing && (
        <LongPressCheck
          task={task}
          onMarkDone={onMarkDone}
          onLongPress={onLongPress}
          isDone={isDone}
        />
      )}
      {isEditing ? (
        <input
          type="text"
          defaultValue={task.title}
          autoFocus
          className="flex-1 min-w-0 text-left text-sm text-foreground outline-none rounded-md bg-accent/60 border border-border px-2 py-0.5 -my-0.5"
          onBlur={(e) => saveTaskTitle(task.id, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              saveTaskTitle(task.id, (e.target as HTMLInputElement).value);
              if (isLastRow && onEnterAfterEdit) onEnterAfterEdit();
            }
            if (e.key === "Escape") setEditingTaskId(null);
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="flex-1 min-w-0 flex items-center gap-1">
          <span
            className={cn(
              "min-w-0 truncate text-left cursor-text",
              isDone && "line-through opacity-70"
            )}
            onClick={(e) => {
              e.stopPropagation();
              setEditingTaskId(task.id);
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
                <PopoverContent
                  className="w-auto p-0"
                  align="start"
                  onClick={(e) => e.stopPropagation()}
                >
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
            <PopoverContent
              className="w-auto p-0"
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
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
    </div>
  );
}
