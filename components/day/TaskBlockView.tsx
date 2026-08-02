"use client";

import { useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { CalendarIcon, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useTasks, useTags } from "@/lib/hooks";
import { markTaskDone } from "@/lib/done-toast";
import { deleteTask, moveToInProgress, moveToToday, patchTask } from "@/lib/taskMutations";
import { LongPressCheck } from "@/components/shared/LongPressCheck";
import { TaskEditModal } from "@/components/vault/TaskEditModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useDaySelection } from "./selection";
import { cn } from "@/lib/utils";

// M/D, same as the vault's task rows.
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function TaskBlockView({ node, deleteNode }: NodeViewProps) {
  const taskId = node.attrs.taskId as number | null;
  const { data: allTasks } = useTasks();
  const { data: tags } = useTags();
  const { selected, onPillClick } = useDaySelection();
  const [editOpen, setEditOpen] = useState(false);
  const [dueOpen, setDueOpen] = useState(false);

  const task = allTasks?.find((t) => t.id === taskId);

  if (!task) {
    return (
      <NodeViewWrapper as="span" className="inline-block align-middle mx-0.5 -my-1">
        <span
          contentEditable={false}
          className="group inline-flex items-center gap-2 rounded-md border border-dashed border-border px-2.5 py-0.5 text-xs text-muted-foreground"
        >
          {allTasks === undefined ? "Loading task…" : "Task no longer exists"}
          <button
            type="button"
            onClick={deleteNode}
            className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-accent/50 transition-opacity"
            title="Remove from doc"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      </NodeViewWrapper>
    );
  }

  const isDone = task.status === "done";
  const inProgress = task.destination === "in_progress";
  const isSelected = selected.has(task.id);

  return (
    // Negative vertical margin keeps the pill's line box near text height, so
    // the caret next to a pill stays text-sized instead of stretching.
    <NodeViewWrapper as="span" className="inline-block align-middle mx-0.5 -my-1">
      <span
        contentEditable={false}
        draggable
        data-drag-handle
        onClickCapture={(e) => {
          if (e.shiftKey || e.metaKey || e.ctrlKey) {
            e.preventDefault();
            e.stopPropagation();
            onPillClick(task.id, e);
          }
        }}
        className={cn(
          "group relative inline-flex max-w-full items-center gap-2 rounded-md border border-foreground/20 bg-foreground/5 px-2.5 py-0.5 cursor-grab active:cursor-grabbing",
          isDone && "opacity-60",
          isSelected && "ring-2 ring-ring border-transparent"
        )}
      >
        <LongPressCheck
          task={task}
          isDone={isDone}
          onMarkDone={(t) => void markTaskDone(t)}
          onLongPress={(t) => void (inProgress ? moveToToday(t) : moveToInProgress(t))}
          className="flex-shrink-0"
        />

        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className={cn(
            "min-w-0 truncate text-left text-sm hover:underline underline-offset-2",
            isDone && "line-through text-muted-foreground"
          )}
          title="Open task"
        >
          {task.title}
        </button>

        {task.due_date && (
          <button
            type="button"
            onClick={() => setDueOpen(true)}
            className="flex-shrink-0 text-xs font-mono text-muted-foreground hover:text-foreground"
            style={{ letterSpacing: "-0.25px" }}
            title="Change due date"
          >
            {formatDate(task.due_date)}
          </button>
        )}

        {/* Hover mini-menu: floats above the pill's top-right corner. */}
        <span className="absolute -top-6 right-0 z-20 hidden group-hover:inline-flex items-center gap-0.5 rounded-md border border-border bg-popover px-1 py-0.5 shadow-md">
          <Popover open={dueOpen} onOpenChange={setDueOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent/50"
                title="Due date"
              >
                <CalendarIcon className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={task.due_date ? new Date(task.due_date + "T00:00:00") : undefined}
                onSelect={(day) => {
                  void patchTask(task, { due_date: day ? toDateStr(day) : null });
                  setDueOpen(false);
                }}
              />
              {task.due_date && (
                <button
                  type="button"
                  className="w-full border-t border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    void patchTask(task, { due_date: null });
                    setDueOpen(false);
                  }}
                >
                  Clear due date
                </button>
              )}
            </PopoverContent>
          </Popover>

          <button
            type="button"
            onClick={async () => {
              try {
                await deleteTask(task);
                deleteNode();
                toast.success("Task deleted");
              } catch {
                /* deleteTask already toasted */
              }
            }}
            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-accent/50"
            title="Delete task from vault"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={deleteNode}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent/50"
            title="Remove from doc (task is not deleted)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      </span>

      {editOpen && (
        <TaskEditModal
          task={task}
          allTags={tags ?? []}
          open={editOpen}
          onClose={() => setEditOpen(false)}
        />
      )}
    </NodeViewWrapper>
  );
}
