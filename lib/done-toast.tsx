import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { mutate } from "swr";
import type { Task, Destination } from "@/lib/types";

/**
 * Mark a task done via API, show a styled toast with undo.
 * The toast wraps the task title naturally (no truncation) with
 * "is done" flowing inline, and an Undo button below.
 */
export async function markTaskDone(task: Task): Promise<boolean> {
  try {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    if (!res.ok) throw new Error();
    mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/tasks"));
    showDoneToast(task);
    return true;
  } catch {
    toast.error("Failed to mark task done");
    return false;
  }
}

function showDoneToast(task: Task) {
  toast.custom(
    (id) => (
      <div className="bg-[#1a1a1a] border border-white/10 rounded-[10px] px-4 py-3 text-sm text-white shadow-lg min-w-[260px] max-w-[340px]">
        <div className="flex gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
          <p className="leading-snug">
            <span className="font-medium">{task.title}</span>
            {" "}
            <span className="text-white/60">is done</span>
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            toast.dismiss(id);
            try {
              const res = await fetch(`/api/tasks/${task.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  status: "active",
                  destination: task.destination as Destination,
                }),
              });
              if (!res.ok) throw new Error();
              mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/tasks"));
              toast.success("Task restored");
            } catch {
              toast.error("Failed to undo");
            }
          }}
          className="mt-2 ml-6 text-xs text-white/50 hover:text-white transition-colors"
        >
          Undo
        </button>
      </div>
    ),
    {
      position: "bottom-right",
      duration: 5000,
    }
  );
}
