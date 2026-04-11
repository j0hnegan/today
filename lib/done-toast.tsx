import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { Task, Destination } from "@/lib/types";
import { markDone as markDoneMutation, patchTask } from "@/lib/taskMutations";

/**
 * Mark a task done via optimistic update, show a styled toast with undo.
 */
export async function markTaskDone(task: Task): Promise<boolean> {
  try {
    await markDoneMutation(task);
    showDoneToast(task);
    return true;
  } catch {
    // helper already toasted the error
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
              await patchTask(task, {
                status: "active",
                destination: task.destination as Destination,
              });
              toast.success("Task restored");
            } catch {
              /* helper already toasted */
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
