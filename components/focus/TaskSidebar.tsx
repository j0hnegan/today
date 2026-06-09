"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  SlidersHorizontal,
  ArrowUpDown,
  Check,
  ChevronDown,
  CalendarIcon,
  X,
} from "lucide-react";
import { useTasks, useTags } from "@/lib/hooks";
import { useTaskActions } from "@/lib/useTaskActions";
import { VaultSection } from "@/components/vault/VaultSection";
import { TaskList } from "@/components/vault/TaskList";
import { TaskEditModal } from "@/components/vault/TaskEditModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { patchTask, reorderTasks, moveToInProgress, moveToToday } from "@/lib/taskMutations";
import { moveByInsertion } from "@/lib/useTouchDragSort";
import { normalizeConsequence } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Task, Size, Destination } from "@/lib/types";

// The Today task column — same components, drag behavior, AND control layout as
// the My Tasks (vault) page: sort dropdown lives in each section's header bar,
// the Filters popover (size/dates/goals) sits on the date row. Scoped to the
// Today + In Progress sections, plus the per-row "Not Today" action.
const SECTIONS = [
  { key: "onDeck", section: "on_deck", title: "Today" },
  { key: "inProgress", section: "in_progress", title: "In Progress" },
] as const;

type SortKey = "due_date" | "size" | "goal" | "consequence";
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "due_date", label: "Due date" },
  { value: "size", label: "Size" },
  { value: "goal", label: "Goal" },
  { value: "consequence", label: "Priority" },
];
const ALL_SIZES: Size[] = ["xs", "small", "medium", "large"];
const SIZE_LABELS: Record<Size, string> = {
  xs: "1-15 min",
  small: "15-30 min",
  medium: "30-60 min",
  large: "60+ min",
};

// Verbatim from VaultView so sorting behaves identically on both pages.
function sortTasks(tasks: Task[], sortKey: SortKey): Task[] {
  return [...tasks].sort((a, b) => {
    const aPriority = normalizeConsequence(a.consequence) === "hard" ? 0 : 1;
    const bPriority = normalizeConsequence(b.consequence) === "hard" ? 0 : 1;

    let primary = 0;
    switch (sortKey) {
      case "due_date": {
        if (a.due_date && b.due_date) primary = a.due_date.localeCompare(b.due_date);
        else if (a.due_date) primary = -1;
        else if (b.due_date) primary = 1;
        break;
      }
      case "size": {
        const order: Record<string, number> = { xs: 0, small: 1, medium: 2, large: 3 };
        primary = (order[a.size] ?? 99) - (order[b.size] ?? 99);
        break;
      }
      case "goal": {
        const aTag = a.tags?.[0]?.name ?? "";
        const bTag = b.tags?.[0]?.name ?? "";
        if (aTag && bTag) primary = aTag.localeCompare(bTag);
        else if (aTag) primary = -1;
        else if (bTag) primary = 1;
        break;
      }
      case "consequence": {
        primary = aPriority - bPriority;
        break;
      }
    }
    if (primary !== 0) return primary;
    if (sortKey !== "consequence" && aPriority !== bPriority) return aPriority - bPriority;
    return (a.id as number) - (b.id as number);
  });
}

export function TaskSidebar({
  headerLeading,
  panelProps,
  panelClassName,
}: {
  headerLeading?: React.ReactNode;
  // 012: spread by PagePanel onto the bordered panel div for edge-grab drag.
  panelProps?: React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean };
  panelClassName?: string;
}) {
  const { data: allTasks } = useTasks();
  const { data: tags } = useTags();
  const actions = useTaskActions(allTasks ?? []);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ section: string; index: number } | null>(null);

  // Per-section sort (vault parity — rendered in each section's header bar)
  const [sortKeys, setSortKeys] = useState<Record<string, SortKey>>({
    on_deck: "due_date",
    in_progress: "due_date",
  });

  // Filters (vault parity — size / dates / goals; session-only)
  const [showSize, setShowSize] = useState(true);
  const [showDates, setShowDates] = useState(true);
  const [showGoals, setShowGoals] = useState(true);
  const [sizeFilter, setSizeFilter] = useState<Size[]>([...ALL_SIZES]);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [goalFilterIds, setGoalFilterIds] = useState<number[] | null>(null);
  const [goalSearch, setGoalSearch] = useState("");
  const [goalDropdownOpen, setGoalDropdownOpen] = useState(false);
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);
  const goalContainerRef = useRef<HTMLDivElement>(null);
  const sizeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (goalContainerRef.current && !goalContainerRef.current.contains(e.target as Node)) {
        setGoalDropdownOpen(false);
      }
      if (sizeContainerRef.current && !sizeContainerRef.current.contains(e.target as Node)) {
        setSizeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const grouped = useMemo(() => {
    const onDeck: Task[] = [];
    const inProgress: Task[] = [];
    for (const t of allTasks ?? []) {
      if (t.status !== "active") continue;
      if (t.destination === "on_deck") onDeck.push(t);
      else if (t.destination === "in_progress") inProgress.push(t);
    }

    function applyFilters(list: Task[]): Task[] {
      let filtered = list;
      if (showSize && sizeFilter.length < ALL_SIZES.length) {
        filtered = filtered.filter((t) => sizeFilter.includes(t.size));
      }
      if (showDates && (dateFrom || dateTo)) {
        filtered = filtered.filter((t) => {
          if (!t.due_date) return false;
          const d = new Date(t.due_date + "T00:00:00");
          if (dateFrom && d < dateFrom) return false;
          if (dateTo) {
            const end = new Date(dateTo);
            end.setHours(23, 59, 59, 999);
            if (d > end) return false;
          }
          return true;
        });
      }
      if (showGoals && goalFilterIds !== null) {
        filtered = filtered.filter((t) => t.tags?.some((tag) => goalFilterIds.includes(tag.id)));
      }
      return filtered;
    }

    return {
      onDeck: sortTasks(applyFilters(onDeck), sortKeys.on_deck),
      inProgress: sortTasks(applyFilters(inProgress), sortKeys.in_progress),
    };
  }, [allTasks, sortKeys, showSize, sizeFilter, showDates, dateFrom, dateTo, showGoals, goalFilterIds]);

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
        if (prev.length === 1) return [...ALL_SIZES];
        return prev.filter((x) => x !== s);
      }
      return [...prev, s];
    });
  }

  function resetFilters() {
    setShowSize(true);
    setShowDates(true);
    setShowGoals(true);
    setSizeFilter([...ALL_SIZES]);
    setDateFrom(undefined);
    setDateTo(undefined);
    setGoalFilterIds(null);
    setGoalSearch("");
  }

  // Vault-parity sort dropdown, rendered inside each section's header bar.
  function renderSortDropdown(section: string) {
    const current = sortKeys[section] ?? "due_date";
    const currentLabel = SORT_OPTIONS.find((o) => o.value === current)?.label ?? "Due date";
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors font-mono ml-auto flex-shrink-0"
          >
            <ArrowUpDown className="h-3 w-3" />
            {currentLabel}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-36 p-1" align="end" onClick={(e) => e.stopPropagation()}>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSortKeys((prev) => ({ ...prev, [section]: opt.value }));
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-accent",
                current === opt.value ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {opt.label}
              {current === opt.value && <Check className="h-3 w-3" />}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    );
  }

  const dropHighlight = "ring-2 ring-accent ring-offset-2 ring-offset-background rounded-[10px]";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Date row + Filters (vault-style) */}
      <div className="flex items-center justify-between min-h-7" style={{ marginBottom: "1rem" }}>
        <div className="flex items-center min-w-0 flex-1">{headerLeading}</div>
        <Popover>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="end">
            <div className="space-y-3">
              {/* SIZE */}
              <div>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">Size</span>
                  <Switch
                    checked={showSize}
                    onCheckedChange={() => setShowSize((p) => !p)}
                    className="data-[state=checked]:bg-accent"
                  />
                </label>
                {showSize && (
                  <div className="relative mt-2 pb-3" ref={sizeContainerRef}>
                    <button
                      type="button"
                      onClick={() => setSizeDropdownOpen((p) => !p)}
                      className="flex w-full items-center justify-between rounded-md border border-border bg-transparent px-3 py-1.5 text-xs h-8"
                    >
                      <span className="text-muted-foreground">
                        {sizeFilter.length === ALL_SIZES.length
                          ? "All sizes"
                          : `${sizeFilter.length} of ${ALL_SIZES.length}`}
                      </span>
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </button>
                    {sizeDropdownOpen && (
                      <div className="absolute left-0 right-0 z-50 mt-1 rounded-[10px] border border-border bg-popover p-1 shadow-md" style={{ top: "32px" }}>
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
                    )}
                  </div>
                )}
              </div>

              {/* DATES */}
              <div>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">Dates</span>
                  <Switch
                    checked={showDates}
                    onCheckedChange={() => setShowDates((p) => !p)}
                    className="data-[state=checked]:bg-accent"
                  />
                </label>
                {showDates && (
                  <div className="flex gap-2 mt-2 pb-3">
                    <Popover modal open={dateFromOpen} onOpenChange={setDateFromOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "flex-1 justify-start text-left text-xs font-normal h-8",
                            !dateFrom && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-1.5 h-3 w-3 flex-shrink-0" />
                          <span className="flex-1 truncate">
                            {dateFrom
                              ? dateFrom.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                              : "From"}
                          </span>
                          {dateFrom && (
                            <span
                              role="button"
                              onClick={(e) => { e.stopPropagation(); setDateFrom(undefined); }}
                              onPointerDown={(e) => e.stopPropagation()}
                              className="ml-auto text-muted-foreground hover:text-foreground flex-shrink-0"
                            >
                              <X className="h-3 w-3" />
                            </span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={(day) => { setDateFrom(day); setDateFromOpen(false); }}
                        />
                      </PopoverContent>
                    </Popover>

                    <Popover modal open={dateToOpen} onOpenChange={setDateToOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "flex-1 justify-start text-left text-xs font-normal h-8",
                            !dateTo && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-1.5 h-3 w-3 flex-shrink-0" />
                          <span className="flex-1 truncate">
                            {dateTo
                              ? dateTo.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                              : "To"}
                          </span>
                          {dateTo && (
                            <span
                              role="button"
                              onClick={(e) => { e.stopPropagation(); setDateTo(undefined); }}
                              onPointerDown={(e) => e.stopPropagation()}
                              className="ml-auto text-muted-foreground hover:text-foreground flex-shrink-0"
                            >
                              <X className="h-3 w-3" />
                            </span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={(day) => { setDateTo(day); setDateToOpen(false); }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              {/* GOALS */}
              <div>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">Goals</span>
                  <Switch
                    checked={showGoals}
                    onCheckedChange={() => setShowGoals((p) => !p)}
                    className="data-[state=checked]:bg-accent"
                  />
                </label>
                {showGoals && (
                  <div className="relative mt-2 pb-3" ref={goalContainerRef}>
                    <button
                      type="button"
                      onClick={() => setGoalDropdownOpen((p) => !p)}
                      className="flex w-full items-center justify-between rounded-md border border-border bg-transparent px-3 py-1.5 text-xs h-8"
                    >
                      <span className="text-muted-foreground">
                        {goalFilterIds === null ? "All goals" : `${goalFilterIds.length} of ${(tags ?? []).length}`}
                      </span>
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </button>
                    {goalDropdownOpen && (
                      <div className="absolute left-0 right-0 z-50 mt-1 rounded-[10px] border border-border bg-popover p-1 shadow-md" style={{ top: "32px" }}>
                        <Input
                          value={goalSearch}
                          onChange={(e) => setGoalSearch(e.target.value)}
                          placeholder="Search..."
                          className="h-7 text-xs mb-1 border-0 bg-transparent focus-visible:ring-0 px-2"
                          autoFocus
                        />
                        <div className="max-h-36 overflow-auto">
                          {"all".includes(goalSearch.toLowerCase()) && (
                            <button
                              type="button"
                              onClick={() => { setGoalFilterIds(null); setGoalSearch(""); setGoalDropdownOpen(false); }}
                              className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-accent"
                            >
                              <span className={goalFilterIds === null ? "text-foreground" : "text-muted-foreground"}>
                                All
                              </span>
                              {goalFilterIds === null && <Check className="h-3 w-3 text-foreground" />}
                            </button>
                          )}
                          {(tags ?? [])
                            .filter((t) => t.name.toLowerCase().includes(goalSearch.toLowerCase()))
                            .map((tag) => {
                              const active = goalFilterIds === null || goalFilterIds.includes(tag.id);
                              return (
                                <button
                                  key={tag.id}
                                  type="button"
                                  onClick={() => {
                                    if (goalFilterIds === null) {
                                      setGoalFilterIds([tag.id]);
                                    } else if (goalFilterIds.includes(tag.id)) {
                                      const next = goalFilterIds.filter((id) => id !== tag.id);
                                      setGoalFilterIds(next.length === 0 ? null : next);
                                    } else {
                                      setGoalFilterIds([...goalFilterIds, tag.id]);
                                    }
                                  }}
                                  className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-accent"
                                >
                                  <span className={`flex items-center gap-2 ${active ? "text-foreground" : "text-muted-foreground"}`}>
                                    <span
                                      className="h-2 w-2 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: tag.color }}
                                    />
                                    {tag.name}
                                  </span>
                                  {active && <Check className="h-3 w-3 text-foreground" />}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Separator />
              <button
                onClick={resetFilters}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1"
              >
                Reset
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Bordered panel (mirrors the Notes panel) holding the two sections */}
      <div
        {...panelProps}
        className={cn(
          "rounded-[10px] border border-border bg-panel p-3 flex-1 min-h-0 overflow-visible md:overflow-y-auto space-y-2",
          panelClassName
        )}
      >
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
              <VaultSection
                title={title}
                count={sectionTasks.length}
                defaultOpen
                headerExtra={renderSortDropdown(section)}
              >
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
