import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { Task } from "@/lib/types";
import { markDone as markDoneMutation, patchTask } from "@/lib/taskMutations";

let clearKeyboardUndo = () => {};

export function registerTaskUndo(undo: () => void) {
  clearKeyboardUndo();
  const clear = () => {
    document.removeEventListener("keydown", onKeyDown, { capture: true });
    document.removeEventListener("beforeinput", clear, { capture: true });
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (!(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey || event.key.toLowerCase() !== "z") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    clear();
    undo();
  };
  document.addEventListener("keydown", onKeyDown, { capture: true });
  // Once typing resumes, the editor owns undo again.
  document.addEventListener("beforeinput", clear, { capture: true });
  clearKeyboardUndo = clear;
  return clear;
}

export async function markTaskDone(task: Task): Promise<boolean> {
  if (task.status === "done") return false;
  const completion = markDoneMutation(task);
  let restoring = false;
  let toastId: string | number | undefined;
  const undo = async () => {
    if (restoring) return;
    restoring = true;
    clear();
    try {
      await completion;
      await patchTask({ ...task, status: "done" }, {
        status: "active",
      });
      if (toastId !== undefined) toast.dismiss(toastId);
      toast.success("Task restored");
    } catch {
      restoring = false;
      // Mutation helpers show failures; the toast button can retry.
    }
  };
  const clear = registerTaskUndo(() => { void undo(); });
  try {
    await completion;
    if (!restoring) toastId = showDoneToast(task, undo);
    return true;
  } catch {
    clear();
    return false;
  }
}

function showDoneToast(task: Task, undo: () => Promise<void>) {
  return toast.custom(
    () => (
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
          onClick={() => { void undo(); }}
          className="mt-2 ml-6 text-xs text-white/50 hover:text-white transition-colors"
        >
          Undo (⌘Z / Ctrl+Z)
        </button>
      </div>
    ),
    {
      position: "bottom-right",
      duration: 5000,
    }
  );
}
