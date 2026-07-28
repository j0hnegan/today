"use client";

import { useState } from "react";
import { TaskList } from "@/components/vault/TaskList";
import { TaskEditModal } from "@/components/vault/TaskEditModal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { markTaskDone } from "@/lib/done-toast";
import { deleteTask } from "@/lib/taskMutations";
import { useTasks, useTags } from "@/lib/hooks";
import type { Task } from "@/lib/types";

export function BacklogView() {
  const { data: tasks } = useTasks({ destination: "backlog", status: "active" });
  const { data: tags } = useTags();

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!tasks) return null;

  // Oldest first — the backlog is an append-only idea list, no reordering
  const sorted = [...tasks].sort((a, b) => a.id - b.id);

  async function handleConfirmDelete() {
    if (!deletingTask) return;
    setDeleting(true);
    try {
      await deleteTask(deletingTask);
    } catch {
      /* deleteTask already toasted */
    } finally {
      setDeleting(false);
      setDeletingTask(null);
    }
  }

  return (
    <div className="max-w-3xl px-4 md:px-6 pt-5 md:pt-[80px] pb-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight">Backlog</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ideas parked outside the flow — nothing here gets promoted, dated, or
          nudged until you move it.
        </p>
      </div>

      <TaskList
        tasks={sorted}
        section="backlog"
        onTaskClick={(task) => setEditingTask(task)}
        onDragStart={() => {}}
        onMarkDone={(task) => markTaskDone(task)}
        onDelete={(task) => setDeletingTask(task)}
        showSize={false}
        showDates={false}
        showGoals
      />

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          allTags={tags ?? []}
          open={true}
          onClose={() => setEditingTask(null)}
        />
      )}

      <Dialog
        open={deletingTask !== null}
        onOpenChange={(v) => {
          if (!v && !deleting) setDeletingTask(null);
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete task?</DialogTitle>
            <DialogDescription>
              <span className="line-clamp-2 break-all">&ldquo;{deletingTask?.title}&rdquo;</span>
              will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeletingTask(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
