"use client";

import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { useNote, useTasks, useTags, useGoals, useCategories, useDatesWithContent } from "@/lib/hooks";
import { TaskEditModal } from "@/components/vault/TaskEditModal";
import { BlockEditor } from "@/components/focus/BlockEditor";
import { htmlToBlocks, blocksToHtml, createBlock, padBlocks, stripTrailingEmpty } from "@/lib/blocks";
import {
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Upload,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { markTaskDone } from "@/lib/done-toast";
import { mutate } from "swr";
import { toast } from "sonner";
import type { Task, Block } from "@/lib/types";

const DEBOUNCE_MS = 500;

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateHeader(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function PagePanel() {
  const { data: tasks } = useTasks({ destination: "on_deck", status: "active" });
  const { data: inProgressTasks } = useTasks({ destination: "in_progress", status: "active" });
  const { data: tags } = useTags();
  const { data: goals } = useGoals();
  const { data: categories } = useCategories();
  const attachInputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedDateRef = useRef<string>("");
  const [uploading, setUploading] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Date navigation
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const dateStr = useMemo(() => toDateStr(selectedDate), [selectedDate]);
  const { data: note, mutate: mutateNote } = useNote(dateStr);

  // Dates with content for calendar & smart navigation
  const contentDateRange = useMemo(() => {
    const from = new Date(selectedDate);
    from.setMonth(from.getMonth() - 6);
    from.setDate(1);
    const to = new Date(selectedDate);
    to.setMonth(to.getMonth() + 2);
    to.setDate(0);
    return { from: toDateStr(from), to: toDateStr(to) };
  }, [selectedDate]);
  const { data: datesWithContent } = useDatesWithContent(contentDateRange.from, contentDateRange.to);
  const contentDateSet = useMemo(() => new Set(datesWithContent ?? []), [datesWithContent]);

  const isToday = useMemo(() => toDateStr(selectedDate) === toDateStr(new Date()), [selectedDate]);

  // Block state — pre-filled with lines
  const [blocks, setBlocks] = useState<Block[]>(() => padBlocks([createBlock("task-list")]));
  const blocksInitialized = useRef(false);

  // Load blocks when note data arrives
  useEffect(() => {
    if (note === undefined) return;
    if (loadedDateRef.current === dateStr && blocksInitialized.current) return;
    loadedDateRef.current = dateStr;
    blocksInitialized.current = true;

    let newBlocks: Block[];
    if (note?.blocks && Array.isArray(note.blocks) && note.blocks.length > 0) {
      newBlocks = note.blocks;
    } else if (note?.content) {
      newBlocks = htmlToBlocks(note.content);
    } else {
      newBlocks = [];
    }

    // Ensure task-list block exists
    if (!newBlocks.some((b) => b.type === "task-list")) {
      newBlocks = [createBlock("task-list"), ...newBlocks];
    }

    // Pad with empty lines to fill the panel
    setBlocks(padBlocks(newBlocks));
  }, [note, dateStr]);

  // Reset init flag when date changes
  useEffect(() => {
    blocksInitialized.current = false;
  }, [dateStr]);

  // Save blocks with debounce
  const saveBlocks = useCallback(
    async (newBlocks: Block[]) => {
      const trimmed = stripTrailingEmpty(newBlocks);
      const content = blocksToHtml(trimmed);
      await fetch("/api/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr, content, blocks: trimmed }),
      });
      mutateNote();
    },
    [dateStr, mutateNote]
  );

  const handleBlocksChange = useCallback(
    (newBlocks: Block[]) => {
      setBlocks(newBlocks);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => saveBlocks(newBlocks), DEBOUNCE_MS);
    },
    [saveBlocks]
  );

  // Cleanup timeout
  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  // Flush save
  function flushPendingSave() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      saveBlocks(blocks);
    }
  }

  // Date navigation — smart skip past days
  function navigateDate(delta: number) {
    flushPendingSave();
    loadedDateRef.current = "";
    const todayStr = toDateStr(new Date());
    setSelectedDate((prev) => {
      const currentStr = toDateStr(prev);
      if (contentDateSet.size > 0 && currentStr <= todayStr) {
        const sorted = Array.from(contentDateSet).sort();
        if (delta < 0) {
          const pastDates = sorted.filter((d) => d < currentStr).reverse();
          if (pastDates.length > 0) {
            const [y, m, d] = pastDates[0].split("-").map(Number);
            return new Date(y, m - 1, d);
          }
        } else if (delta > 0) {
          const futureDates = sorted.filter((d) => d > currentStr && d <= todayStr);
          if (futureDates.length > 0) {
            const [y, m, d] = futureDates[0].split("-").map(Number);
            return new Date(y, m - 1, d);
          }
          if (currentStr < todayStr) return new Date();
        }
      }
      const next = new Date(prev);
      next.setDate(next.getDate() + delta);
      return next;
    });
  }

  function goToToday() {
    flushPendingSave();
    loadedDateRef.current = "";
    setSelectedDate(new Date());
  }

  // Task actions
  async function handleMarkDone(task: Task) {
    await markTaskDone(task);
  }

  async function handleDeleteTask(task: Task) {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Task deleted");
      mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/tasks"));
    } catch {
      toast.error("Failed to delete task");
    }
  }

  async function handleInProgressTask(task: Task) {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: "in_progress" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Moved to in progress");
      mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/tasks"));
    } catch {
      toast.error("Failed to move task");
    }
  }

  async function handleBackToTodayTask(task: Task) {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: "on_deck" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Moved back to today");
      mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/tasks"));
    } catch {
      toast.error("Failed to move task");
    }
  }

  async function handleNotTodayTask(task: Task) {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: "someday", due_date: null, consequence: "none" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Moved to someday");
      mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/tasks"));
    } catch {
      toast.error("Failed to move task");
    }
  }

  function handleCreateTask(title: string) {
    fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, destination: "on_deck", size: "small" }),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        toast.success(`Task created: ${title}`);
        mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/tasks"));
        mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/dates-with-content"));
        // Ensure task-list block exists
        if (!blocks.some((b) => b.type === "task-list")) {
          handleBlocksChange([createBlock("task-list"), ...blocks]);
        }
      })
      .catch(() => toast.error("Failed to create task"));
  }

  // File upload
  const handleAttachUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0 || !note?.id) return;
      setUploading(true);
      try {
        for (let i = 0; i < files.length; i++) {
          const formData = new FormData();
          formData.append("file", files[i]);
          formData.append("entity_type", "note");
          formData.append("entity_id", String(note.id));
          const res = await fetch("/api/uploads", { method: "POST", body: formData });
          if (!res.ok) throw new Error();
          toast.success(`Uploaded ${files[i].name}`);
        }
        mutateNote();
      } catch {
        toast.error("Upload failed");
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    },
    [note?.id, mutateNote]
  );

  // Today tasks sorted by ID (older first)
  // Show all on-deck tasks for today and future dates; only matching tasks for past dates
  const todayTasks = useMemo(() => {
    if (!tasks) return [];
    const todayStr = toDateStr(new Date());
    let filtered: Task[];
    if (dateStr >= todayStr) {
      // Today or future: show all on-deck tasks
      filtered = [...tasks];
    } else {
      // Past: only tasks due on that specific date
      filtered = tasks.filter((t) => t.due_date === dateStr);
    }
    return filtered.sort((a, b) => (a.id as number) - (b.id as number));
  }, [tasks, dateStr]);

  return (
    <div className="px-6 pt-[80px] pb-6 h-full flex flex-col overflow-y-auto w-full xl:max-w-[75%]">
      {/* Date header row */}
      <div className="flex items-center justify-between" style={{ marginBottom: "1rem" }}>
        <h1 className="text-lg font-semibold tracking-tight">
          {formatDateHeader(selectedDate)}
        </h1>

        <div className="flex items-center gap-1">
          {note?.id && (
            <button
              type="button"
              onClick={() => attachInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors mr-2"
            >
              {uploading ? <Upload className="h-3 w-3 animate-pulse" /> : <Paperclip className="h-3 w-3" />}
              {uploading ? "Uploading..." : "Attach"}
            </button>
          )}

          <button
            type="button"
            onClick={() => navigateDate(-1)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                  isToday
                    ? "text-foreground bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  if (datePickerOpen) { goToToday(); setDatePickerOpen(false); }
                  else { setDatePickerOpen(true); }
                }}
              >
                Today
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                modifiers={{
                  hasContent: (date: Date) => contentDateSet.has(toDateStr(date)),
                }}
                modifiersClassNames={{
                  hasContent: "has-content-dot",
                }}
                onSelect={(day) => {
                  if (day) { flushPendingSave(); loadedDateRef.current = ""; setSelectedDate(day); }
                  setDatePickerOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>

          <button
            type="button"
            onClick={() => navigateDate(1)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Block editor panel */}
      <div className="rounded-[10px] border border-border bg-panel flex flex-col flex-1 min-h-0 overflow-y-auto" style={{ padding: "1.5rem" }}>
        <BlockEditor
          blocks={blocks}
          onChange={handleBlocksChange}
          tasks={todayTasks}
          inProgressTasks={inProgressTasks ?? []}
          goals={goals ?? []}
          categories={categories ?? []}
          attachments={note?.attachments ?? []}
          onCreateTask={handleCreateTask}
          onMarkDone={handleMarkDone}
          onEditTask={setEditingTask}
          onDeleteTask={handleDeleteTask}
          onNotTodayTask={handleNotTodayTask}
          onInProgressTask={handleInProgressTask}
          onBackToTodayTask={handleBackToTodayTask}
        />
      </div>

      {/* Hidden file input */}
      <input
        ref={attachInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleAttachUpload}
      />

      {/* Edit modal */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          allTags={tags ?? []}
          open={true}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}
