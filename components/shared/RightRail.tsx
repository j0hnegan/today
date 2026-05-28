"use client";

import { useState, useEffect } from "react";
import { useTasks, useTags } from "@/lib/hooks";
import { useTaskActions } from "@/lib/useTaskActions";
import { TaskListPanel } from "@/components/focus/TaskListPanel";
import { TaskEditModal } from "@/components/vault/TaskEditModal";
import type { Task } from "@/lib/types";

export function RightRail() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: tasks, isLoading: tasksLoading } = useTasks({
    destination: "on_deck",
    status: "active",
  });
  const { data: inProgressTasks, isLoading: inProgressLoading } = useTasks({
    destination: "in_progress",
    status: "active",
  });
  const { data: tags } = useTags();
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const allTasks: Task[] = [...(tasks ?? []), ...(inProgressTasks ?? [])];
  const actions = useTaskActions(allTasks);

  if (!mounted) return <aside className="h-full pr-6 pt-[80px] pb-8" />;

  return (
    <aside className="h-full flex flex-col pr-6 pt-[80px] pb-8">
      <TaskListPanel
        tasks={tasks ?? []}
        inProgressTasks={inProgressTasks ?? []}
        loading={tasksLoading || inProgressLoading}
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
    </aside>
  );
}
