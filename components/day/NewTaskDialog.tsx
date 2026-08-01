"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { createTask } from "@/lib/taskMutations";
import type { Task } from "@/lib/types";

// Minimal inline capture: title only, lands in Today (on_deck). Full editing
// (due date, tags, description) is one click away on the embedded block.
export function NewTaskDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (task: Task) => void;
}) {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    const trimmed = title.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const task = await createTask({ title: trimmed, destination: "on_deck" });
      onCreated(task);
      setTitle("");
      onClose();
    } catch {
      /* createTask already toasted */
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          setTitle("");
        }
      }}
    >
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New task
          </DialogTitle>
        </DialogHeader>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleCreate();
            }
          }}
          placeholder="What needs doing?"
          className="h-9 text-sm"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            disabled={!title.trim() || saving}
            onClick={() => void handleCreate()}
          >
            {saving ? "Creating…" : "Create & add"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
