import { useCallback } from "react";
import { toast } from "sonner";
import { markTaskDone } from "@/lib/done-toast";
import {
  deleteTask,
  moveToInProgress,
  moveToToday,
  moveToSomeday,
  patchTask,
} from "@/lib/taskMutations";
import type { Task } from "@/lib/types";

/** Shared task action callbacks used by the Today page and the right rail. */
export function useTaskActions(allTasks: Task[]) {
  const onMarkDone = useCallback(async (task: Task) => {
    await markTaskDone(task);
  }, []);

  const onDeleteTask = useCallback(async (task: Task) => {
    try {
      await deleteTask(task);
      toast.success("Task deleted");
    } catch {
      /* helper already toasted */
    }
  }, []);

  const onInProgressTask = useCallback(async (task: Task) => {
    try {
      await moveToInProgress(task);
    } catch {
      /* helper already toasted */
    }
  }, []);

  const onBackToTodayTask = useCallback(async (task: Task) => {
    try {
      await moveToToday(task);
    } catch {
      /* helper already toasted */
    }
  }, []);

  const onNotTodayTask = useCallback(async (task: Task) => {
    try {
      await moveToSomeday(task);
    } catch {
      /* helper already toasted */
    }
  }, []);

  const saveTaskTitle = useCallback(
    async (taskId: number, newTitle: string) => {
      const trimmed = newTitle.trim();
      const task = allTasks.find((t) => t.id === taskId);
      if (task) {
        try {
          await patchTask(task, { title: trimmed });
        } catch {
          /* helper already toasted */
        }
      }
    },
    [allTasks]
  );

  return {
    onMarkDone,
    onDeleteTask,
    onInProgressTask,
    onBackToTodayTask,
    onNotTodayTask,
    saveTaskTitle,
  };
}
