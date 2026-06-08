"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { SlidersHorizontal, ArrowUpDown, Check } from "lucide-react";
import { useTasks, useTags } from "@/lib/hooks";
import { useTaskActions } from "@/lib/useTaskActions";
import { VaultSection } from "@/components/vault/VaultSection";
import { TaskList } from "@/components/vault/TaskList";
import { TaskEditModal } from "@/components/vault/TaskEditModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { patchTask, reorderTasks, moveToInProgress, moveToToday } from "@/lib/taskMutations";
import { moveByInsertion } from "@/lib/useTouchDragSort";
import { normalizeConsequence } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Task, Size, Destination } from "@/lib/types";

// The Today task column. Same rows + drag behavior as the My Tasks (vault) list —
// handles, padding, drop-indicator lines, reorder, cross-section drag (Today ↔ In
// Progress) — inside the bordered panel, with the date-row filter/sort controls,
// plus a per-row "Not Today" action.
const SECTIONS = [
  { key: "onDeck", section: "on_deck", title: "Today" },
  { key: "inProgress", section: "in_progress", title: "In Progress" },
] as const;

type SortKey = "manual" | "due_date" | "size" | "consequence";
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "due_date", label: "Due date" },
  { value: "size", label: "Size" },
  { value: "consequence", label: "Priority" },
];
const ALL_SIZES: Size[] = ["xs", "small", "medium", "large"];
const SIZE_LABELS: Record<Size, string> = {
  xs: "1-15 min",
  small: "15-30 min",
  medium: "30-60 min",
  large: "60+ min",
};

function sortTasks(tasks: Task[], key: SortKey): Task[] {
  if (key === "manual") return tasks; // sort_order (drag order) as fetched
  return [...tasks].sort((a, b) => {
    const aPri = normalizeConsequence(a.consequence) === "hard" ? 0 : 1;
    const bPri = normalizeConsequence(b.consequence) === "hard" ? 0 : 1;
    let primary = 0;
    if (key === "due_date") {
      if (a.due_date && b.due_date) primary = a.due_date.localeCompare(b.due_date);
      else if (a.due_date) primary = -1;
      else if (b.due_date) primary = 1;
    } else if (key === "size") {
      const order: Record<string, number> = { xs: 0, small: 1, medium: 2, large: 3 };
      primary = (order[a.size] ?? 99) - (order[b.size] ?? 99);
    } else if (key === "consequence") {
      primary = aPri - bPri;
    }
    if (primary !== 0) return primary;
    if (key !== "consequence" && aPri !== bPri) return aPri - bPri;
    return (a.id as number) - (b.id as number);
  });
}

export function TaskSidebar({ headerLeading }: { headerLeading?: React.ReactNode }) {
  const { data: allTasks } = useTasks();
  const { data: tags } = useTags();
  const actions = useTaskActions(allTasks ?? []);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ section: string; index: number } | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("manual");
  const [sizeFilter, setSizeFilter] = useState<Size[]>([...ALL_SIZES]);
  const hasActiveFilters = sizeFilter.length < ALL_SIZES.length;

  const grouped = useMemo(() => {
    const onDeck: Task[] = [];
    const inProgress: Task[] = [];
    for (const t of allTasks ?? []) {
      if (t.status !== "active") continue;
      if (t.destination === "on_deck") onDeck.push(t);
      else if (t.destination === "in_progress") inProgress.push(t);
    }
    const apply = (list: Task[]) =>
      sortTasks(hasActiveFilters ? list.filter((t) => sizeFilter.includes(t.size)) : list, sortKey);
    return { onDeck: apply(onDeck), inProgress: apply(inProgress) };
  }, [allTasks, sortKey, sizeFilter, hasActiveFilters]);

  const taskSectionMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const t of grouped.onDeck) map.set(t.id, "on_deck");
    for (const t of grouped.inProgress) map.set(t.id, "in_progress");
    return map;
  }, [grouped]);

  const handleDragStart = useCallback((e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData("text/plain", String(task.id));
    e.dataTransfer.effectAllowed = "move";
    setDraggingTaskId(task.id);
  }, []);

  function handleDragOver(e: React.DragEvent, section: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverSection(section);
  }

  function handleDragLeave(e: React.DragEvent) {
    const related = e.relatedTarget as Node | null;
    if (!related || !(e.currentTarget as Node).contains(related)) setDragOverSection(null);
  }

  function handleDragEnd() {
    setDraggingTaskId(null);
    setDragOverSection(null);
    setDropIndicator(null);
  }

  // Auto-scroll while dragging near the viewport edges (mirrors the vault).
  useEffect(() => {
    if (!draggingTaskId) return;
    const scrollEl = document.querySelector("main");
    if (!scrollEl) return;
    const EDGE = 80, MAX = 18;
    let mouseY = 0, raf = 0;
    function onDragOver(e: DragEvent) { mouseY = e.clientY; }
    function tick() {
      const r = scrollEl!.getBoundingClientRect();
      const top = mouseY - r.top, bottom = r.bottom - mouseY;
      if (top < EDGE && top > 0) scrollEl!.scrollTop -= MAX * (1 - top / EDGE);
      else if (bottom < EDGE && bottom > 0) scrollEl!.scrollTop += MAX * (1 - bottom / EDGE);
      raf = requestAnimationFrame(tick);
    }
    document.addEventListener("dragover", onDragOver);
    raf = requestAnimationFrame(tick);
    return () => { document.removeEventListener("dragover", onDragOver); cancelAnimationFrame(raf); };
  }, [draggingTaskId]);

  const handleRowDragOver = useCallback((section: string, index: number) => {
    setDropIndicator((prev) => (prev && prev.section === section && prev.index === index ? prev : { section, index }));
    setDragOverSection(section);
  }, []);

  async function handleDrop(e: React.DragEvent, targetSection: string) {
    e.preventDefault();
    const savedIndicator = dropIndicator;
    setDragOverSection(null);
    setDraggingTaskId(null);
    setDropIndicator(null);

    const id = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (isNaN(id)) return;
    const sourceSection = taskSectionMap.get(id);

    // Same-section reorder
    if (sourceSection === targetSection && savedIndicator?.section === targetSection) {
      const key = targetSection === "on_deck" ? "onDeck" : "inProgress";
      const sectionTasks = grouped[key as keyof typeof grouped];
      const remaining = sectionTasks.filter((t) => t.id !== id);
      const dragged = sectionTasks.filter((t) => t.id === id);
      let nonDraggedBefore = 0;
      for (let i = 0; i < sectionTasks.length && i < savedIndicator.index; i++) {
        if (sectionTasks[i].id !== id) nonDraggedBefore++;
      }
      const newOrder = [...remaining];
      newOrder.splice(nonDraggedBefore, 0, ...dragged);
      reorderTasks(newOrder.map((t) => t.id), targetSection as Destination);
      return;
    }

    // Cross-section move
    const task = (allTasks ?? []).find((t) => t.id === id);
    if (!task) return;
    if (targetSection === "on_deck" && task.destination !== "on_deck") {
      patchTask(task, { destination: "on_deck", status: "active" });
      toast.success("Moved to Today");
    } else if (targetSection === "in_progress" && task.destination !== "in_progress") {
      patchTask(task, { destination: "in_progress", status: "active" });
      toast.success("Moved to In Progress");
    }
  }

  function reorderSectionByIndex(section: string, fromTaskId: number, insertionIndex: number) {
    const key = section === "on_deck" ? "onDeck" : "inProgress";
    const ids = grouped[key as keyof typeof grouped].map((t) => t.id);
    const from = ids.indexOf(fromTaskId);
    if (from === -1) return;
    reorderTasks(moveByInsertion(ids, from, insertionIndex), section as Destination);
  }

  function handleLongPress(task: Task) {
    if (task.destination === "in_progress") moveToToday(task).catch(() => {});
    else moveToInProgress(task).catch(() => {});
  }

  function toggleSize(s: Size) {
    setSizeFilter((prev) => {
      if (prev.length === ALL_SIZES.length) return [s];
      if (prev.includes(s)) {
        const next = prev.filter((x) => x !== s);
        return next.length === 0 ? [...ALL_SIZES] : next;
      }
      return [...prev, s];
    });
  }

  const dropHighlight = "ring-2 ring-accent ring-offset-2 ring-offset-background rounded-[10px]";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Date row + filter/sort controls */}
      <div className="flex items-center justify-between min-h-7" style={{ marginBottom: "1rem" }}>
        <div className="flex items-center min-w-0 flex-1">{headerLeading}</div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "inline-flex items-center justify-center h-6 w-6 rounded-md border transition-colors",
                  hasActiveFilters
                    ? "border-foreground/20 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <SlidersHorizontal className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="end">
              <span className="text-xs font-medium text-muted-foreground">Size</span>
              <div className="mt-1.5 space-y-0.5">
                {ALL_SIZES.map((s) => {
                  const active = sizeFilter.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSize(s)}
                      className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-accent"
                    >
                      <span className={active ? "text-foreground" : "text-muted-foreground"}>
                        {SIZE_LABELS[s]}
                      </span>
                      {active && <Check className="h-3 w-3 text-foreground" />}
                    </button>
                  );
                })}
              </div>
              {hasActiveFilters && (
                <button
                  onClick={() => setSizeFilter([...ALL_SIZES])}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1 border-t border-border mt-2 pt-2"
                >
                  Reset
                </button>
              )}
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-accent text-[11px] text-muted-foreground hover:text-foreground transition-colors font-mono">
                <ArrowUpDown className="h-3 w-3" />
                {SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? "Manual"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-36 p-1" align="end">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSortKey(opt.value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-accent",
                    sortKey === opt.value ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {opt.label}
                  {sortKey === opt.value && <Check className="h-3 w-3" />}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Bordered panel (mirrors the Notes panel) holding the two sections */}
      <div className="rounded-[10px] border border-border bg-panel p-3 flex-1 min-h-0 overflow-visible md:overflow-y-auto space-y-2">
        {SECTIONS.map(({ key, section, title }) => {
          const sectionTasks = grouped[key as keyof typeof grouped];
          return (
            <div
              key={section}
              onDragOver={(e) => handleDragOver(e, section)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, section)}
              className={`transition-all ${dragOverSection === section ? dropHighlight : ""}`}
            >
              <VaultSection title={title} count={sectionTasks.length} defaultOpen>
                <TaskList
                  tasks={sectionTasks}
                  section={section}
                  onTaskClick={(task) => setEditingTask(task)}
                  onDragStart={handleDragStart}
                  draggingTaskId={draggingTaskId}
                  onDelete={actions.onDeleteTask}
                  onMarkDone={actions.onMarkDone}
                  onLongPress={handleLongPress}
                  onNotToday={section === "on_deck" ? actions.onNotTodayTask : undefined}
                  dropIndicatorIndex={dropIndicator?.section === section ? dropIndicator.index : null}
                  onRowDragOver={handleRowDragOver}
                  onTouchDragStart={setDraggingTaskId}
                  onTouchDragEnd={handleDragEnd}
                  onTouchReorder={reorderSectionByIndex}
                />
              </VaultSection>
            </div>
          );
        })}
      </div>

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
