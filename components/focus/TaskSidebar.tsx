"use client";

import { useState, useMemo } from "react";
import { useTasks, useTags } from "@/lib/hooks";
import { useTaskActions } from "@/lib/useTaskActions";
import { TaskListPanel } from "@/components/focus/TaskListPanel";
import { TaskEditModal } from "@/components/vault/TaskEditModal";
import type { Task } from "@/lib/types";

export function TaskSidebar({ headerLeading }: { headerLeading?: React.ReactNode }) {
  // One fetch for all tasks (hydrated by the Today page's ServerSWR fallback),
  // grouped client-side — like VaultView. Avoids two client round-trips and the
  // mount-gated render, both of which made the rail lag behind the note.
  const { data: allTasks, isLoading } = useTasks();
  const { data: tags } = useTags();
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const tasks = useMemo(
    () =>
      (allTasks ?? []).filter(
        (t) => t.destination === "on_deck" && t.status === "active"
      ),
    [allTasks]
  );
  const inProgressTasks = useMemo(
    () =>
      (allTasks ?? []).filter(
        (t) => t.destination === "in_progress" && t.status === "active"
      ),
    [allTasks]
  );
  const actions = useTaskActions(allTasks ?? []);

  return (
    <>
      <TaskListPanel
        headerLeading={headerLeading}
        tasks={tasks}
        inProgressTasks={inProgressTasks}
        loading={isLoading}
        onMarkDone={actions.onMarkDone}
        onEditTask={setEditingTask}
        onDeleteTask={actions.onDeleteTask}
        onInProgressTask={actions.onInProgressTask}
        onBackToTodayTask={actions.onBackToTodayTask}
        editingTaskId={editingTaskId}
        setEditingTaskId={setEditingTaskId}
        saveTaskTitle={async (id, title) => {
          await actions.saveTaskTitle(id, title);
          setEditingTaskId(null);
        }}
      />

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          allTags={tags ?? []}
          open={true}
          onClose={() => setEditingTask(null)}
        />
      )}
    </>
  );
}
