"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarIcon, Search, SquareCheck } from "lucide-react";
import { useTags, useTasks } from "@/lib/hooks";
import { TagBadge } from "@/components/shared/TagBadge";
import { cn } from "@/lib/utils";
import type { Destination, Task } from "@/lib/types";

const DEST_FILTERS: { value: Destination | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "on_deck", label: "Today" },
  { value: "in_progress", label: "In Progress" },
  { value: "upcoming", label: "Upcoming" },
  { value: "someday", label: "Someday" },
  { value: "backlog", label: "Backlog" },
];

function formatDue(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Search matches title, description, tag names, AND hidden keywords — so
// "migraine" finds "get Tylenol" once the enrichment routine keyworded it.
function matches(task: Task, q: string): boolean {
  if (task.title.toLowerCase().includes(q)) return true;
  if (task.description?.toLowerCase().includes(q)) return true;
  if ((task.tags ?? []).some((t) => t.name.toLowerCase().includes(q))) return true;
  return (task.keywords ?? []).some((k) => k.toLowerCase().includes(q));
}

export function TaskPickerModal({
  open,
  onClose,
  onAdd,
  excludeIds,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (taskIds: number[]) => void;
  /** Tasks already embedded in the doc — shown last and marked. */
  excludeIds: Set<number>;
}) {
  const { data: allTasks } = useTasks();
  const { data: tags } = useTags();
  const [search, setSearch] = useState("");
  const [dest, setDest] = useState<Destination | "all">("all");
  const [tagId, setTagId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const items = useMemo(() => {
    let list = (allTasks ?? []).filter((t) => t.status === "active");
    if (dest !== "all") list = list.filter((t) => t.destination === dest);
    if (tagId !== null) list = list.filter((t) => (t.tags ?? []).some((tag) => tag.id === tagId));
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((t) => matches(t, q));
    // Already-in-doc tasks sink to the bottom.
    return [...list].sort((a, b) => Number(excludeIds.has(a.id)) - Number(excludeIds.has(b.id)));
  }, [allTasks, dest, tagId, search, excludeIds]);

  function reset() {
    setSearch("");
    setDest("all");
    setTagId(null);
    setSelected(new Set());
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAdd() {
    const ids = items.filter((t) => selected.has(t.id)).map((t) => t.id);
    if (ids.length === 0) return;
    onAdd(ids);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          reset();
        }
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SquareCheck className="h-4 w-4" />
            Add tasks to today
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search titles, descriptions, tags..."
            className="pl-8 h-8 text-xs"
            autoFocus
          />
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {DEST_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setDest(f.value)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] transition-colors",
                dest === f.value
                  ? "bg-foreground text-background"
                  : "bg-accent/50 text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
          {(tags ?? []).length > 0 && <span className="mx-1 h-4 w-px bg-border" />}
          {(tags ?? []).map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => setTagId((prev) => (prev === tag.id ? null : tag.id))}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] transition-colors",
                tagId === tag.id
                  ? "bg-foreground text-background"
                  : "bg-accent/50 text-muted-foreground hover:text-foreground"
              )}
            >
              {tag.name}
            </button>
          ))}
        </div>

        <div className="max-h-[320px] overflow-y-auto space-y-0.5 -mx-1 px-1">
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No matching tasks
            </p>
          )}
          {items.map((task) => {
            const isSelected = selected.has(task.id);
            const inDoc = excludeIds.has(task.id);
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => toggle(task.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-xs text-left transition-colors",
                  isSelected
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50 text-foreground",
                  inDoc && "opacity-50"
                )}
              >
                <div
                  className={cn(
                    "h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                    isSelected ? "bg-foreground border-foreground" : "border-border"
                  )}
                >
                  {isSelected && (
                    <svg className="h-3 w-3 text-background" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="flex-1 truncate">{task.title}</span>
                {inDoc && (
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">in doc</span>
                )}
                {task.tags?.slice(0, 2).map((tag) => (
                  <span key={tag.id} className="hidden sm:inline-flex flex-shrink-0">
                    <TagBadge tag={tag} />
                  </span>
                ))}
                {task.due_date && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0">
                    <CalendarIcon className="h-3 w-3" />
                    {formatDue(task.due_date)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-[10px] text-muted-foreground">
            {selected.size} selected
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                onClose();
                reset();
              }}
            >
              Cancel
            </Button>
            <Button size="sm" className="h-7 text-xs" disabled={selected.size === 0} onClick={handleAdd}>
              Add {selected.size > 0 && selected.size}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
