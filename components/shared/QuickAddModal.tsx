"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
import { Zap, CalendarIcon, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { TagInput } from "@/components/shared/TagInput";
import { useTags } from "@/lib/hooks";
import { toast } from "sonner";
import { mutate } from "swr";
import type { Consequence, Size } from "@/lib/types";

export function QuickAddModal() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [consequence, setConsequence] = useState<Consequence>("none");
  const [size, setSize] = useState<Size | "">("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [multiAdd, setMultiAdd] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [destination, setDestination] = useState<string | null>(null);

  const { data: tags, mutate: mutateTags } = useTags();

  const isDirty = useMemo(
    () =>
      title !== "" ||
      description !== "" ||
      consequence !== "none" ||
      size !== "" ||
      dueDate !== undefined ||
      selectedTagIds.length > 0,
    [title, description, consequence, size, dueDate, selectedTagIds]
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSaving(false);
        setOpen(true);
      }
    }
    function handleDestination(e: Event) {
      const ce = e as CustomEvent;
      setDestination(ce.detail as string);
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("quick-add-destination", handleDestination);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("quick-add-destination", handleDestination);
    };
  }, []);

  const resetFields = useCallback(() => {
    setTitle("");
    setDescription("");
    setConsequence("none");
    setSize("");
    setDueDate(undefined);
    setSelectedTagIds([]);
  }, []);

  const resetForMultiAdd = useCallback(() => {
    setTitle("");
    setDescription("");
    setDueDate(undefined);
  }, []);

  const reset = useCallback(() => {
    resetFields();
    setMultiAdd(false);
    setDestination(null);
  }, [resetFields]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description,
          consequence,
          ...(size ? { size } : {}),
          due_date: dueDate ? dueDate.toISOString().split("T")[0] : null,
          tag_ids: selectedTagIds,
          ...(destination ? { destination } : {}),
        }),
      });

      if (!res.ok) throw new Error("Failed to create task");

      toast.success("Task added");
      mutate(
        (key: unknown) =>
          typeof key === "string" && key.startsWith("/api/tasks")
      );

      if (multiAdd) {
        resetForMultiAdd();
        setSaving(false);
      } else {
        reset();
        setOpen(false);
        // Don't setSaving(false) — modal is closing, avoids flicker
      }
    } catch {
      toast.error("Failed to add task");
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          reset();
          setSaving(false);
        }
      }}
    >
      <DialogContent
        className="sm:max-w-[480px]"
        onInteractOutside={(e) => {
          if (isDirty) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Quick Add Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="What needs to happen?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-mono">
                Due date
              </label>
              <div className="relative">
                <Popover modal open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate
                        ? `${dueDate.getMonth() + 1}/${dueDate.getDate()}`
                        : "None"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={(day) => {
                        setDueDate(day);
                        setCalendarOpen(false);
                      }}
                      initialFocus
                    />
                    {dueDate && (
                      <div className="border-t p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setDueDate(undefined);
                            setConsequence("none");
                            setCalendarOpen(false);
                          }}
                        >
                          <X className="mr-2 h-3 w-3" /> Clear date
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
                {dueDate && (
                  <button
                    type="button"
                    title="Priority Task"
                    onClick={() => setConsequence(consequence === "hard" ? "none" : "hard")}
                    className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors",
                      consequence === "hard"
                        ? "text-yellow-400 bg-yellow-500/15"
                        : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-accent/50"
                    )}
                  >
                    <Zap className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
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
                  <SelectValue placeholder="Select" />
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
            allTags={tags ?? []}
            selectedTagIds={selectedTagIds}
            onTagsChange={setSelectedTagIds}
            onTagCreated={() => mutateTags()}
          />

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <Switch
                checked={multiAdd}
                onCheckedChange={setMultiAdd}
                className="scale-75 data-[state=checked]:bg-accent"
              />
              Add another
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!title.trim() || saving}>
                {saving ? "Adding..." : "Add Task"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
