"use client";

import { useMemo, useCallback } from "react";
import { TaskRow } from "./TaskRow";
import type { SelectionPosition } from "./TaskRow";
import type { Task } from "@/lib/types";

interface TaskListProps {
  tasks: Task[];
  onTaskClick: (task: Task, e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  draggingTaskId?: number | null;
  selectedIds?: Set<number>;
  onDelete?: (task: Task) => void;
  onMarkDone?: (task: Task) => void;
  showSize?: boolean;
  showDates?: boolean;
  showGoals?: boolean;
  section?: string;
  dropIndicatorIndex?: number | null;
  onRowDragOver?: (section: string, index: number) => void;
}

function AddTaskButton({ section }: { section?: string }) {
  return (
    <button
      type="button"
      className="flex w-full items-center rounded-[10px] px-2 py-3 text-sm text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/30 transition-colors"
      onClick={() => {
        // Dispatch custom event with destination info before opening modal
        if (section) {
          document.dispatchEvent(
            new CustomEvent("quick-add-destination", { detail: section })
          );
        }
        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "k",
            metaKey: true,
            bubbles: true,
          })
        );
      }}
    >
      {/* Offset to align with status dot: grip (14px) + gap (8px) */}
      <span className="pl-[22px]">+ Add a task</span>
    </button>
  );
}

function DropIndicator() {
  return (
    <div className="relative h-0 z-10">
      <div className="absolute left-2 right-2 top-0 -translate-y-[1px] h-[2px] bg-accent rounded-full" />
    </div>
  );
}

export function TaskList({
  tasks,
  onTaskClick,
  onDragStart,
  draggingTaskId,
  selectedIds,
  onDelete,
  onMarkDone,
  showSize,
  showDates,
  showGoals,
  section,
  dropIndicatorIndex,
  onRowDragOver,
}: TaskListProps) {
  // Compute selection positions for contiguous block rendering
  const selectionPositions = useMemo(() => {
    if (!selectedIds || selectedIds.size === 0) return new Map<number, SelectionPosition>();
    const positions = new Map<number, SelectionPosition>();
    for (let i = 0; i < tasks.length; i++) {
      if (!selectedIds.has(tasks[i].id)) continue;
      const prevSelected = i > 0 && selectedIds.has(tasks[i - 1].id);
      const nextSelected = i < tasks.length - 1 && selectedIds.has(tasks[i + 1].id);
      if (prevSelected && nextSelected) {
        positions.set(tasks[i].id, "middle");
      } else if (prevSelected) {
        positions.set(tasks[i].id, "last");
      } else if (nextSelected) {
        positions.set(tasks[i].id, "first");
      } else {
        positions.set(tasks[i].id, "solo");
      }
    }
    return positions;
  }, [tasks, selectedIds]);

  const handleRowDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      if (!section || !onRowDragOver) return;
      e.preventDefault();
      e.stopPropagation();

      const rect = e.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const insertIndex = e.clientY < midY ? index : index + 1;

      onRowDragOver(section, insertIndex);
    },
    [section, onRowDragOver]
  );

  return (
    <div>
      {tasks.map((task, i) => (
        <div key={task.id} onDragOver={(e) => handleRowDragOver(e, i)}>
          {dropIndicatorIndex === i && <DropIndicator />}
          <TaskRow
            task={task}
            onClick={(e) => onTaskClick(task, e)}
            onDragStart={onDragStart}
            isDragging={
              draggingTaskId === task.id ||
              (draggingTaskId != null &&
                selectedIds !== undefined &&
                selectedIds.has(draggingTaskId) &&
                selectedIds.has(task.id))
            }
            isSelected={selectedIds?.has(task.id)}
            selectionPosition={selectionPositions.get(task.id) ?? null}
            onDelete={onDelete}
            onMarkDone={onMarkDone}
            showSize={showSize}
            showDates={showDates}
            showGoals={showGoals}
          />
        </div>
      ))}
      {/* Show indicator after last task */}
      {dropIndicatorIndex === tasks.length && <DropIndicator />}
      <AddTaskButton section={section} />
    </div>
  );
}
