"use client";

import { useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { CalendarIcon, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useTasks, useTags } from "@/lib/hooks";
import { markTaskDone } from "@/lib/done-toast";
import { deleteTask, moveToInProgress, moveToToday, patchTask } from "@/lib/taskMutations";
import { LongPressCheck } from "@/components/shared/LongPressCheck";
import { TagBadge } from "@/components/shared/TagBadge";
import { TaskEditModal } from "@/components/vault/TaskEditModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

function formatDue(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function TaskBlockView({ node, deleteNode }: NodeViewProps) {
  const taskId = node.attrs.taskId as number | null;
  const { data: allTasks } = useTasks();
  const { data: tags } = useTags();
  const [editOpen, setEditOpen] = useState(false);
  const [dueOpen, setDueOpen] = useState(false);

  const task = allTasks?.find((t) => t.id === taskId);

  if (!task) {
    return (
      <NodeViewWrapper className="my-1">
        <div
          contentEditable={false}
          className="group flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground"
        >
          <span className="flex-1">
            {allTasks === undefined ? "Loading task…" : "Task no longer exists"}
          </span>
          <button
            type="button"
            onClick={deleteNode}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent/50 transition-opacity"
            title="Remove from doc"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </NodeViewWrapper>
    );
  }

  const isDone = task.status === "done";
  const inProgress = task.destination === "in_progress";

  return (
    <NodeViewWrapper className="my-1">
      <div
        contentEditable={false}
        className={cn(
          "group inline-flex w-fit max-w-full items-center gap-2.5 rounded-md border border-border bg-background/50 px-3 py-2",
          isDone && "opacity-60"
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

        {inProgress && !isDone && (
          <span className="flex-shrink-0 text-[10px] font-medium text-amber-500">
            In Progress
          </span>
        )}

        {task.tags?.map((tag) => (
          <span key={tag.id} className="flex-shrink-0 hidden sm:inline-flex">
            <TagBadge tag={tag} />
          </span>
        ))}

        <Popover open={dueOpen} onOpenChange={setDueOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex-shrink-0 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-colors hover:bg-accent/50",
                task.due_date ? "text-muted-foreground" : "text-muted-foreground/40 opacity-0 group-hover:opacity-100"
              )}
              title="Due date"
            >
              <CalendarIcon className="h-3 w-3" />
              {task.due_date && formatDue(task.due_date)}
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
          className="flex-shrink-0 p-1 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-accent/50 transition-opacity"
          title="Delete task from vault"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={deleteNode}
          className="flex-shrink-0 p-1 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent/50 transition-opacity"
          title="Remove from doc (task is not deleted)"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

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
