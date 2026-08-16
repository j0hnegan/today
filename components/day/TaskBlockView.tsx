"use client";

import { useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { CalendarIcon, Pause, Play, Trash2, X } from "lucide-react";
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
  const pillRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLSpanElement>(null);

  // Anchor the hover menu where the cursor enters the pill so its actions stay
  // still while the cursor moves into the menu.
  function positionMenu(e: React.MouseEvent) {
    const pill = pillRef.current;
    const menu = menuRef.current;
    if (!pill || !menu) return;
    const rect = pill.getBoundingClientRect();
    const half = (menu.offsetWidth || 90) / 2;
    const x = Math.max(half, Math.min(e.clientX - rect.left, rect.width - half));
    menu.style.left = `${x}px`;
  }

  const task = allTasks?.find((t) => t.id === taskId);

  if (!task) {
    return (
      <NodeViewWrapper as="span" className="inline-block h-4 align-baseline overflow-visible">
        <span
          contentEditable={false}
          className="group inline-flex h-4 items-center gap-1.5 rounded-sm px-0.5 text-xs leading-none text-muted-foreground transition-colors hover:bg-foreground/5"
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
    <NodeViewWrapper as="span" className="inline-block h-4 align-baseline overflow-visible">
      <span
        ref={pillRef}
        contentEditable={false}
        draggable
        data-drag-handle
        onMouseEnter={positionMenu}
        onClickCapture={(e) => {
          if (e.shiftKey || e.metaKey || e.ctrlKey) {
            e.preventDefault();
            e.stopPropagation();
            onPillClick(task.id, e);
          }
        }}
        onClick={(e) => {
          // Click anywhere on the pill opens the edit modal — except the
          // check (stops its own propagation) and the hover menu.
          if ((e.target as HTMLElement).closest("[data-no-open]")) return;
          setEditOpen(true);
        }}
        className={cn(
          "group relative inline-flex h-4 max-w-full items-center gap-1.5 rounded-sm px-0.5 align-baseline cursor-pointer transition-colors hover:bg-foreground/5 active:cursor-grabbing",
          isDone && "opacity-60",
          isSelected && "bg-foreground/10 ring-1 ring-ring"
        )}
      >
        <LongPressCheck
          task={task}
          isDone={isDone}
          inProgress={!isDone && inProgress}
          onMarkDone={(t) => void markTaskDone(t)}
          onLongPress={(t) => void (inProgress ? moveToToday(t) : moveToInProgress(t))}
          className="h-4 w-4 flex-shrink-0 [&>svg]:h-4 [&>svg]:w-4"
        />

        <span
          className={cn(
            "min-w-0 truncate text-sm leading-none",
            isDone && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </span>

        {task.due_date && (
          <span
            className="flex-shrink-0 text-xs font-mono leading-none text-muted-foreground"
            style={{ letterSpacing: "-0.25px" }}
          >
            {formatDate(task.due_date)}
          </span>
        )}

        {/* Hover mini-menu: floats above the point where the cursor entered. */}
        <span
          ref={menuRef}
          data-no-open
          className="absolute -top-7 z-20 hidden -translate-x-1/2 group-hover:inline-flex items-center gap-0.5 rounded-md border border-border bg-popover px-1 py-0.5 shadow-md"
          style={{ left: "50%" }}
        >
          {!isDone && (
            <button
              type="button"
              onClick={() => void (inProgress ? moveToToday(task) : moveToInProgress(task))}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent/50"
              title={inProgress ? "Stop — back to To Do" : "Start — mark In Progress"}
            >
              {inProgress ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
          )}

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
