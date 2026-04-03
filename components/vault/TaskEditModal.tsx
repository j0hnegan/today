"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Zap, CalendarIcon, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TagInput } from "@/components/shared/TagInput";
import { FileUpload } from "@/components/shared/FileUpload";
import { useAttachments } from "@/lib/hooks";
import { mutate } from "swr";
import { toast } from "sonner";
import { normalizeConsequence } from "@/lib/types";
import type { Task, Tag, Consequence, Size } from "@/lib/types";

interface TaskEditModalProps {
  task: Task;
  allTags: Tag[];
  open: boolean;
  onClose: () => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function TaskEditModal({
  task,
  allTags,
  open,
  onClose,
}: TaskEditModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [consequence, setConsequence] = useState<Consequence>(
    normalizeConsequence(task.consequence)
  );
  const [size, setSize] = useState<Size>(task.size);
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task.due_date ? new Date(task.due_date + "T00:00:00") : undefined
  );
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(
    task.tags?.map((t) => t.id) ?? []
  );
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { data: attachments, mutate: mutateAttachments } = useAttachments("task", task.id);

  const isDirty = useMemo(() => {
    const initialTagIds = (task.tags?.map((t) => t.id) ?? []).sort().join(",");
    const currentTagIds = [...selectedTagIds].sort().join(",");
    const initialDue = task.due_date || null;
    const currentDue = dueDate ? dueDate.toISOString().split("T")[0] : null;
    return (
      title !== task.title ||
      description !== (task.description || "") ||
      consequence !== normalizeConsequence(task.consequence) ||
      size !== task.size ||
      currentDue !== initialDue ||
      currentTagIds !== initialTagIds
    );
  }, [title, description, consequence, size, dueDate, selectedTagIds, task]);

  function refreshAll() {
    mutate(
      (key: unknown) =>
        typeof key === "string" &&
        (key.startsWith("/api/tasks") || key.startsWith("/api/tags"))
    );
  }

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description,
          consequence,
          size,
          due_date: dueDate ? dueDate.toISOString().split("T")[0] : null,
          tag_ids: selectedTagIds,
        }),
      });
      if (!res.ok) throw new Error("API error");
      refreshAll();
      toast.success("Task updated");
      onClose();
    } catch {
      toast.error("Failed to update task");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("API error");
      refreshAll();
      toast.success("Task deleted");
      onClose();
    } catch {
      toast.error("Failed to delete task");
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent
        className="sm:max-w-[480px]"
        onInteractOutside={(e) => {
          if (isDirty) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            autoFocus
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-mono">
                Due date
              </label>
              <Popover modal>
                {dueDate ? (
                  <div className="flex items-center gap-2">
                    {/* Date chip – click date text to change */}
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent border border-border px-3 py-1.5 text-sm font-mono">
                      <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <PopoverTrigger asChild>
                        <button type="button" className="hover:text-foreground transition-colors">
                          {formatDate(dueDate.toISOString().split("T")[0])}
                        </button>
                      </PopoverTrigger>
                      <button
                        type="button"
                        onClick={() => {
                          setDueDate(undefined);
                          setConsequence("none");
                        }}
                        className="rounded-full hover:bg-accent p-0.5 -mr-1 transition-colors"
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </span>
                    {/* Priority toggle */}
                    <button
                      type="button"
                      title="Priority Task"
                      onClick={() => setConsequence(consequence === "hard" ? "none" : "hard")}
                      className={cn(
                        "p-1.5 rounded-md transition-colors",
                        consequence === "hard"
                          ? "text-yellow-400 bg-yellow-500/15"
                          : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-accent/50"
                      )}
                    >
                      <Zap className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal text-muted-foreground"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      None
                    </Button>
                  </PopoverTrigger>
                )}
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-mono">
                Size
              </label>
              <Select
                value={size}
                onValueChange={(v) => setSize(v as Size)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xs">1-15 min</SelectItem>
                  <SelectItem value="small">15-30 min</SelectItem>
                  <SelectItem value="medium">30-60 min</SelectItem>
                  <SelectItem value="large">60+ min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TagInput
            allTags={allTags}
            selectedTagIds={selectedTagIds}
            onTagsChange={setSelectedTagIds}
            onTagCreated={() => mutate("/api/tags")}
          />

          {/* Attachments */}
          <FileUpload
            entityType="task"
            entityId={task.id}
            attachments={attachments ?? []}
            onUploadComplete={() => mutateAttachments()}
            compact
          />

          {task.status === "done" && task.done_at && (
            <div className="text-xs text-muted-foreground font-mono">
              Completed{" "}
              {new Date(task.done_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          )}

          {confirmingDelete ? (
            <div className="flex items-center justify-between rounded-[10px] border border-destructive/30 bg-destructive/5 px-4 py-3">
              <span className="text-sm text-destructive">Delete this task?</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Delete
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving || !title.trim()}
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
