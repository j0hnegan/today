"use client";

import { useState } from "react";
import { useTasks, useTags } from "@/lib/hooks";
import { useTaskActions } from "@/lib/useTaskActions";
import { TaskListPanel } from "@/components/focus/TaskListPanel";
import { TaskEditModal } from "@/components/vault/TaskEditModal";
import type { Task } from "@/lib/types";

export function RightRail() {
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

  return (
    <aside className="h-full overflow-y-auto px-4 pt-[80px] pb-8">
      <div className="rounded-[10px] border border-border bg-panel p-4">
        <TaskListPanel
          tasks={tasks ?? []}
          inProgressTasks={inProgressTasks ?? []}
          loading={tasksLoading || inProgressLoading}
          onMarkDone={actions.onMarkDone}
          onEditTask={setEditingTask}
          onDeleteTask={actions.onDeleteTask}
          onNotTodayTask={actions.onNotTodayTask}
          onInProgressTask={actions.onInProgressTask}
          onBackToTodayTask={actions.onBackToTodayTask}
          editingTaskId={editingTaskId}
          setEditingTaskId={setEditingTaskId}
          saveTaskTitle={async (id, title) => {
            await actions.saveTaskTitle(id, title);
            setEditingTaskId(null);
          }}
        />
      </div>

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
