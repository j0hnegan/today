"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { VaultSection } from "@/components/vault/VaultSection";

import { TaskList } from "@/components/vault/TaskList";
import { TaskEditModal } from "@/components/vault/TaskEditModal";
import { WeeklyNudge } from "@/components/vault/WeeklyNudge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SlidersHorizontal, Trash2, CalendarIcon, X, Check, ChevronDown, ArrowUpDown, Target, FolderInput } from "lucide-react";
import { TagsModal } from "@/components/tags/TagsModal";
import { markTaskDone } from "@/lib/done-toast";
import { patchTask, reorderTasks, moveToInProgress, moveToToday, moveToUpcoming } from "@/lib/taskMutations";
import { moveByInsertion } from "@/lib/useTouchDragSort";
import { cn } from "@/lib/utils";
import { useTasks, useTags, useSettings } from "@/lib/hooks";
import { mutate } from "@/lib/swr-helpers";
import { toast } from "sonner";
import { normalizeConsequence } from "@/lib/types";
import type { Task, Size, Destination } from "@/lib/types";

type SortKey = "due_date" | "size" | "goal" | "consequence";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "due_date", label: "Due date" },
  { value: "size", label: "Size" },
  { value: "goal", label: "Goal" },
  { value: "consequence", label: "Priority" },
];

function sortTasks(tasks: Task[], sortKey: SortKey): Task[] {
  return [...tasks].sort((a, b) => {
    const aPriority = normalizeConsequence(a.consequence) === "hard" ? 0 : 1;
    const bPriority = normalizeConsequence(b.consequence) === "hard" ? 0 : 1;

    let primary = 0;
    switch (sortKey) {
      case "due_date": {
        if (a.due_date && b.due_date) {
          primary = a.due_date.localeCompare(b.due_date);
        } else if (a.due_date) {
          primary = -1;
        } else if (b.due_date) {
          primary = 1;
        }
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

    // Secondary: consequence (priority tasks float to top)
    if (sortKey !== "consequence" && aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // Stable fallback: older tasks first (newer at bottom). Optimistic rows
    // carry a temp id of -Date.now(); ranking them by |id| (a ms timestamp,
    // far above any real sequence id) keeps a just-added task at the bottom
    // instead of flashing at the top until the server id arrives.
    const aRank = (a.id as number) < 0 ? -(a.id as number) : (a.id as number);
    const bRank = (b.id as number) < 0 ? -(b.id as number) : (b.id as number);
    return aRank - bRank;
  });
}

// The four task sections, in render order. `key` indexes `filteredGrouped`;
// `section` is the destination/status string the drag-drop handlers speak.
// All but Someday are hidden when the "review Someday" filter is on.
const VAULT_SECTIONS = [
  { key: "onDeck", section: "on_deck", title: "Today", defaultOpen: true, alwaysShow: false },
  { key: "inProgress", section: "in_progress", title: "In Progress", defaultOpen: true, alwaysShow: false },
  { key: "upcoming", section: "upcoming", title: "Upcoming", defaultOpen: true, alwaysShow: false },
  { key: "someday", section: "someday", title: "Someday", defaultOpen: true, alwaysShow: true },
  { key: "backlog", section: "backlog", title: "Backlog", defaultOpen: true, alwaysShow: false },
  { key: "done", section: "done", title: "Done", defaultOpen: false, alwaysShow: false },
] as const;

const ALL_SECTION_KEYS = VAULT_SECTIONS.map((s) => s.section) as string[];
// Backlog is parked ideas — hidden from My Tasks unless the filter opts in.
const DEFAULT_VISIBLE_SECTIONS = ALL_SECTION_KEYS.filter((s) => s !== "backlog");
const SECTION_LABELS: Record<string, string> = Object.fromEntries(
  VAULT_SECTIONS.map((s) => [s.section, s.title])
);

/** Patch needed to move a task into a section; null if it's already there. */
function bodyForSection(task: Task, targetSection: string): Record<string, string> | null {
  if (targetSection === "done") {
    return task.status !== "done" ? { status: "done" } : null;
  }
  if (task.destination !== targetSection || task.status === "done") {
    return { destination: targetSection, status: "active" };
  }
  return null;
}

const ALL_SIZES: Size[] = ["xs", "small", "medium", "large"];
const SIZE_LABELS: Record<Size, string> = {
  xs: "1-15 min",
  small: "15-30 min",
  medium: "30-60 min",
  large: "60+ min",
};

// --- Helpers ---

function refreshAll() {
  mutate(
    (key: unknown) =>
      typeof key === "string" &&
      (key.startsWith("/api/tasks") || key.startsWith("/api/tags"))
  );
}

async function saveFilter(key: string, value: boolean | string) {
  await fetch("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [key]: String(value) }),
  });
  mutate("/api/settings");
}

// --- Component ---

export function VaultView() {
  const { data: tasks } = useTasks();
  const { data: tags } = useTags();
  const { data: settings } = useSettings();
  const [filterSomeday, setFilterSomeday] = useState(false);
  const [tagsModalOpen, setTagsModalOpen] = useState(false);

  // Column visibility filters (default true, persisted via settings)
  const [showSize, setShowSize] = useState(true);
  const [showDates, setShowDates] = useState(true);
  const [showGoals, setShowGoals] = useState(true);

  // Filter values (persisted via settings, except the date range — a saved
  // absolute date range would silently hide tasks weeks later)
  const [sizeFilter, setSizeFilter] = useState<Size[]>([...ALL_SIZES]);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [goalFilterIds, setGoalFilterIds] = useState<number[] | null>(null);
  const [visibleSections, setVisibleSections] = useState<string[]>([...DEFAULT_VISIBLE_SECTIONS]);
  const [goalSearch, setGoalSearch] = useState("");
  const [goalDropdownOpen, setGoalDropdownOpen] = useState(false);
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
  const [sectionsDropdownOpen, setSectionsDropdownOpen] = useState(false);
  const goalContainerRef = useRef<HTMLDivElement>(null);
  const sizeContainerRef = useRef<HTMLDivElement>(null);
  const sectionsContainerRef = useRef<HTMLDivElement>(null);

  // Per-section sort keys
  const [sortKeys, setSortKeys] = useState<Record<string, SortKey>>({
    on_deck: "due_date",
    in_progress: "due_date",
    upcoming: "due_date",
    someday: "due_date",
    backlog: "due_date",
    done: "due_date",
  });

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        goalContainerRef.current &&
        !goalContainerRef.current.contains(e.target as Node)
      ) {
        setGoalDropdownOpen(false);
      }
      if (
        sizeContainerRef.current &&
        !sizeContainerRef.current.contains(e.target as Node)
      ) {
        setSizeDropdownOpen(false);
      }
      if (
        sectionsContainerRef.current &&
        !sectionsContainerRef.current.contains(e.target as Node)
      ) {
        setSectionsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize filters from settings
  useEffect(() => {
    if (settings) {
      if (settings.vault_show_size !== undefined)
        setShowSize(settings.vault_show_size !== "false");
      if (settings.vault_show_dates !== undefined)
        setShowDates(settings.vault_show_dates !== "false");
      if (settings.vault_show_goals !== undefined)
        setShowGoals(settings.vault_show_goals !== "false");
      if (settings.vault_size_filter !== undefined) {
        const sizes =
          settings.vault_size_filter === "all"
            ? [...ALL_SIZES]
            : (settings.vault_size_filter.split(",").filter((s) => ALL_SIZES.includes(s as Size)) as Size[]);
        if (sizes.length > 0) setSizeFilter(sizes);
      }
      if (settings.vault_goal_filter !== undefined) {
        const ids = settings.vault_goal_filter
          .split(",")
          .map(Number)
          .filter((n) => !isNaN(n));
        setGoalFilterIds(
          settings.vault_goal_filter === "all" || ids.length === 0 ? null : ids
        );
      }
      if (settings.vault_visible_sections !== undefined) {
        const sections = settings.vault_visible_sections
          .split(",")
          .filter((s) => ALL_SECTION_KEYS.includes(s));
        if (sections.length > 0) setVisibleSections(sections);
      }
    }
  }, [settings]);

  // Edit modal
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Delete modal
  const [deletingTasks, setDeletingTasks] = useState<Task[]>([]);
  const [deleting, setDeleting] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [lastClickedId, setLastClickedId] = useState<number | null>(null);

  // Drag state
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ section: string; index: number } | null>(null);

  const grouped = useMemo(() => {
    if (!tasks) return { onDeck: [], inProgress: [], upcoming: [], someday: [], backlog: [], done: [] };

    const onDeck: Task[] = [];
    const inProgress: Task[] = [];
    const upcoming: Task[] = [];
    const someday: Task[] = [];
    const backlog: Task[] = [];
    const done: Task[] = [];

    for (const task of tasks) {
      if (task.status === "done") {
        done.push(task);
      } else if (task.destination === "backlog") {
        backlog.push(task);
      } else if (task.destination === "on_deck") {
        onDeck.push(task);
      } else if (task.destination === "in_progress") {
        inProgress.push(task);
      } else if (task.destination === "upcoming") {
        upcoming.push(task);
      } else {
        someday.push(task);
      }
    }

    return { onDeck, inProgress, upcoming, someday, backlog, done };
  }, [tasks]);

  // Apply active filters to grouped tasks
  const filteredGrouped = useMemo(() => {
    function applyFilters(list: Task[]): Task[] {
      let filtered = list;

      // Size filter: only when toggle is ON and not all sizes selected
      if (showSize && sizeFilter.length < ALL_SIZES.length) {
        filtered = filtered.filter((t) => sizeFilter.includes(t.size));
      }

      // Date filter: only when toggle is ON and at least one bound is set
      if (showDates && (dateFrom || dateTo)) {
        filtered = filtered.filter((t) => {
          if (!t.due_date) return false;
          const d = new Date(t.due_date + "T00:00:00");
          if (dateFrom && d < dateFrom) return false;
          if (dateTo) {
            const endOfDay = new Date(dateTo);
            endOfDay.setHours(23, 59, 59, 999);
            if (d > endOfDay) return false;
          }
          return true;
        });
      }

      // Goal filter: only when toggle is ON and specific goals selected
      if (showGoals && goalFilterIds !== null) {
        filtered = filtered.filter((t) =>
          t.tags?.some((tag) => goalFilterIds.includes(tag.id))
        );
      }

      return filtered;
    }

    return {
      onDeck: sortTasks(applyFilters(grouped.onDeck), sortKeys.on_deck),
      inProgress: sortTasks(applyFilters(grouped.inProgress), sortKeys.in_progress),
      upcoming: sortTasks(applyFilters(grouped.upcoming), sortKeys.upcoming),
      someday: sortTasks(applyFilters(grouped.someday), sortKeys.someday),
      backlog: sortTasks(applyFilters(grouped.backlog), sortKeys.backlog),
      done: sortTasks(applyFilters(grouped.done), sortKeys.done),
    };
  }, [grouped, showSize, sizeFilter, showDates, dateFrom, dateTo, showGoals, goalFilterIds, sortKeys]);

  // Map task ID → section name (for detecting same-section drag)
  const taskSectionMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const t of filteredGrouped.onDeck) map.set(t.id, "on_deck");
    for (const t of filteredGrouped.inProgress) map.set(t.id, "in_progress");
    for (const t of filteredGrouped.upcoming) map.set(t.id, "upcoming");
    for (const t of filteredGrouped.someday) map.set(t.id, "someday");
    for (const t of filteredGrouped.backlog) map.set(t.id, "backlog");
    for (const t of filteredGrouped.done) map.set(t.id, "done");
    return map;
  }, [filteredGrouped]);

  // Flat ordered list for shift-range selection (uses filtered data)
  const allTasksOrdered = useMemo(() => {
    return [...filteredGrouped.onDeck, ...filteredGrouped.inProgress, ...filteredGrouped.upcoming, ...filteredGrouped.someday, ...filteredGrouped.backlog, ...filteredGrouped.done];
  }, [filteredGrouped]);

  function handleReviewSomeday() {
    setFilterSomeday(true);
  }

  // --- Filter toggle handlers ---
  function toggleFilter(
    key: string,
    current: boolean,
    setter: (v: boolean) => void
  ) {
    const next = !current;
    setter(next);
    saveFilter(key, next);
  }

  function resetFilters() {
    setShowSize(true);
    setShowDates(true);
    setShowGoals(true);
    setSizeFilter([...ALL_SIZES]);
    setDateFrom(undefined);
    setDateTo(undefined);
    setGoalFilterIds(null);
    setVisibleSections([...DEFAULT_VISIBLE_SECTIONS]);
    setGoalSearch("");
    fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vault_show_size: "true",
        vault_show_dates: "true",
        vault_show_goals: "true",
        vault_size_filter: "all",
        vault_goal_filter: "all",
        vault_visible_sections: DEFAULT_VISIBLE_SECTIONS.join(","),
      }),
    }).then(() => mutate("/api/settings"));
  }

  // --- Size filter helpers ---
  function toggleSize(s: Size) {
    // If all are selected, clicking one selects only that one; deselecting
    // the last one standing reselects all
    let next: Size[];
    if (sizeFilter.length === ALL_SIZES.length) {
      next = [s];
    } else if (sizeFilter.includes(s)) {
      next = sizeFilter.length === 1 ? [...ALL_SIZES] : sizeFilter.filter((x) => x !== s);
    } else {
      next = [...sizeFilter, s];
    }
    setSizeFilter(next);
    saveFilter("vault_size_filter", next.length === ALL_SIZES.length ? "all" : next.join(","));
  }

  // --- Goal filter helpers ---
  function updateGoalFilter(next: number[] | null) {
    setGoalFilterIds(next);
    saveFilter("vault_goal_filter", next === null ? "all" : next.join(","));
  }

  function setGoalAll() {
    updateGoalFilter(null);
    setGoalSearch("");
    setGoalDropdownOpen(false);
  }

  // --- Section visibility helpers ---
  function toggleSection(s: string) {
    const next = visibleSections.includes(s)
      ? visibleSections.filter((x) => x !== s)
      : [...visibleSections, s];
    if (next.length === 0) return; // hiding every section is never what you meant
    setVisibleSections(next);
    saveFilter("vault_visible_sections", next.join(","));
  }

  // --- Drag and drop handlers ---
  const handleDragStart = useCallback(
    (e: React.DragEvent, task: Task) => {
      const isBulk = selectedIds.has(task.id) && selectedIds.size > 1;

      if (isBulk) {
        e.dataTransfer.setData(
          "text/plain",
          Array.from(selectedIds).join(",")
        );

        // Build custom drag image showing stacked tasks
        const dragEl = document.createElement("div");
        dragEl.style.cssText =
          "position:fixed;top:-1000px;left:-1000px;pointer-events:none;z-index:9999;display:flex;flex-direction:column;gap:2px;";

        const selectedTasks = allTasksOrdered.filter((t) =>
          selectedIds.has(t.id)
        );
        const maxShow = 4;
        const showing = selectedTasks.slice(0, maxShow);

        for (const t of showing) {
          const row = document.createElement("div");
          row.style.cssText =
            "background:hsl(240 3.7% 15.9%);border:1px solid hsl(240 3.7% 20%);border-radius:6px;padding:6px 12px;font-size:13px;color:hsl(0 0% 90%);white-space:nowrap;max-width:300px;overflow:hidden;text-overflow:ellipsis;font-family:system-ui,sans-serif;";
          row.textContent = t.title;
          dragEl.appendChild(row);
        }

        if (selectedTasks.length > maxShow) {
          const more = document.createElement("div");
          more.style.cssText =
            "font-size:11px;color:hsl(0 0% 60%);padding:2px 12px;font-family:system-ui,sans-serif;";
          more.textContent = `+${selectedTasks.length - maxShow} more`;
          dragEl.appendChild(more);
        }

        document.body.appendChild(dragEl);
        e.dataTransfer.setDragImage(dragEl, 0, 0);
        requestAnimationFrame(() => document.body.removeChild(dragEl));
      } else {
        e.dataTransfer.setData("text/plain", String(task.id));
      }
      e.dataTransfer.effectAllowed = "move";
      setDraggingTaskId(task.id);
    },
    [selectedIds, allTasksOrdered]
  );

  function handleDragOver(e: React.DragEvent, section: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverSection(section);
  }

  function handleDragLeave(e: React.DragEvent) {
    const relatedTarget = e.relatedTarget as Node | null;
    const currentTarget = e.currentTarget as Node;
    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      setDragOverSection(null);
    }
  }

  function handleDragEnd() {
    setDraggingTaskId(null);
    setDragOverSection(null);
    setDropIndicator(null);
  }

  useEffect(() => {
    if (!draggingTaskId) return;
    const scrollEl = document.querySelector("main");
    if (!scrollEl) return;

    const EDGE_ZONE = 80;
    const MAX_SPEED = 18;
    let mouseY = 0;
    let raf = 0;

    function onDragOver(e: DragEvent) {
      mouseY = e.clientY;
    }

    function tick() {
      const rect = scrollEl!.getBoundingClientRect();
      const distFromTop = mouseY - rect.top;
      const distFromBottom = rect.bottom - mouseY;

      if (distFromTop < EDGE_ZONE && distFromTop > 0) {
        const speed = MAX_SPEED * (1 - distFromTop / EDGE_ZONE);
        scrollEl!.scrollTop -= speed;
      } else if (distFromBottom < EDGE_ZONE && distFromBottom > 0) {
        const speed = MAX_SPEED * (1 - distFromBottom / EDGE_ZONE);
        scrollEl!.scrollTop += speed;
      }

      raf = requestAnimationFrame(tick);
    }

    document.addEventListener("dragover", onDragOver);
    raf = requestAnimationFrame(tick);
    return () => {
      document.removeEventListener("dragover", onDragOver);
      cancelAnimationFrame(raf);
    };
  }, [draggingTaskId]);

  const handleRowDragOver = useCallback(
    (section: string, index: number) => {
      setDropIndicator((prev) => {
        if (prev && prev.section === section && prev.index === index) return prev;
        return { section, index };
      });
      setDragOverSection(section);
    },
    []
  );

  async function handleDrop(e: React.DragEvent, targetSection: string) {
    e.preventDefault();
    const savedIndicator = dropIndicator;
    setDragOverSection(null);
    setDraggingTaskId(null);
    setDropIndicator(null);

    const dataStr = e.dataTransfer.getData("text/plain");
    const taskIds = dataStr
      .split(",")
      .map((s) => parseInt(s, 10))
      .filter((id) => !isNaN(id));
    if (taskIds.length === 0) return;

    // Check if this is a same-section reorder
    const sourceSection = taskIds.length > 0 ? taskSectionMap.get(taskIds[0]) : undefined;
    const isSameSection = sourceSection === targetSection && savedIndicator?.section === targetSection;

    if (isSameSection && savedIndicator) {
      // Same-section reorder
      const sectionKey = targetSection === "on_deck" ? "onDeck" : targetSection === "in_progress" ? "inProgress" : targetSection === "upcoming" ? "upcoming" : targetSection === "backlog" ? "backlog" : targetSection === "done" ? "done" : "someday";
      const sectionTasks = filteredGrouped[sectionKey as keyof typeof filteredGrouped];
      const draggedSet = new Set(taskIds);

      // Build new order: remove dragged tasks, insert at indicator position
      const remaining = sectionTasks.filter((t) => !draggedSet.has(t.id));
      const dragged = sectionTasks.filter((t) => draggedSet.has(t.id));

      // Adjust insertion index: count how many non-dragged tasks are before the indicator
      let insertAt = savedIndicator.index;
      let nonDraggedBefore = 0;
      for (let i = 0; i < sectionTasks.length && i < savedIndicator.index; i++) {
        if (!draggedSet.has(sectionTasks[i].id)) nonDraggedBefore++;
      }
      insertAt = nonDraggedBefore;

      const newOrder = [...remaining];
      newOrder.splice(insertAt, 0, ...dragged);

      const newOrderIds = newOrder.map((t) => t.id);
      reorderTasks(newOrderIds, targetSection as Destination);
      return;
    }

    // Cross-section move (existing behavior)
    const movedTasks: Task[] = [];
    for (const id of taskIds) {
      const task = tasks?.find((t) => t.id === id);
      if (!task) continue;
      const body = bodyForSection(task, targetSection);
      if (!body) continue;
      movedTasks.push(task);
      patchTask(task, body);
    }

    if (movedTasks.length === 0) return;

    setSelectedIds(new Set());

    const count = movedTasks.length;
    toast.success(
      count === 1
        ? `Moved to ${SECTION_LABELS[targetSection]}`
        : `Moved ${count} tasks to ${SECTION_LABELS[targetSection]}`
    );
  }

  // Bulk-move the current selection via the action bar's Move dropdown.
  function handleBulkMove(targetSection: string) {
    const moved: Task[] = [];
    for (const id of Array.from(selectedIds)) {
      const task = tasks?.find((t) => t.id === id);
      if (!task) continue;
      const body = bodyForSection(task, targetSection);
      if (!body) continue;
      moved.push(task);
      patchTask(task, body);
    }
    setSelectedIds(new Set());
    if (moved.length === 0) return;
    toast.success(
      moved.length === 1
        ? `Moved to ${SECTION_LABELS[targetSection]}`
        : `Moved ${moved.length} tasks to ${SECTION_LABELS[targetSection]}`
    );
  }

  // Touch within-section reorder (single task). Mirrors the same-section
  // branch of handleDrop, but driven by the pointer-based hook in TaskList.
  function reorderSectionByIndex(
    section: string,
    fromTaskId: number,
    insertionIndex: number
  ) {
    const key =
      section === "on_deck"
        ? "onDeck"
        : section === "in_progress"
          ? "inProgress"
          : section === "upcoming"
            ? "upcoming"
            : section === "backlog"
              ? "backlog"
              : section === "done"
                ? "done"
                : "someday";
    const sectionTasks = filteredGrouped[key as keyof typeof filteredGrouped];
    const ids = sectionTasks.map((t) => t.id);
    const from = ids.indexOf(fromTaskId);
    if (from === -1) return;
    reorderTasks(moveByInsertion(ids, from, insertionIndex), section as Destination);
  }

  // --- Task click handler (with selection support) ---
  function handleTaskClick(task: Task, e: React.MouseEvent) {
    if (e.shiftKey) {
      // Shift+click: range select if there's already a selection anchor, otherwise just select this one
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (lastClickedId !== null && prev.size > 0) {
          // Range select between last clicked and current
          const startIdx = allTasksOrdered.findIndex(
            (t) => t.id === lastClickedId
          );
          const endIdx = allTasksOrdered.findIndex((t) => t.id === task.id);
          if (startIdx !== -1 && endIdx !== -1) {
            const [lo, hi] =
              startIdx < endIdx
                ? [startIdx, endIdx]
                : [endIdx, startIdx];
            for (let i = lo; i <= hi; i++) {
              next.add(allTasksOrdered[i].id);
            }
          }
        } else {
          // First shift+click — just select this one
          next.add(task.id);
        }
        return next;
      });
      setLastClickedId(task.id);
    } else if (e.metaKey || e.ctrlKey) {
      // Cmd+click: toggle individual (non-sequential)
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(task.id)) {
          next.delete(task.id);
        } else {
          next.add(task.id);
        }
        return next;
      });
      setLastClickedId(task.id);
    } else {
      // Normal click — clear selection and open edit
      setSelectedIds(new Set());
      setEditingTask(task);
    }
  }

  // --- Delete handlers ---
  function handleDeleteRequest(task: Task) {
    setDeletingTasks([task]);
  }

  function handleBulkDeleteRequest() {
    const tasksToDelete = allTasksOrdered.filter((t) =>
      selectedIds.has(t.id)
    );
    setDeletingTasks(tasksToDelete);
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      await Promise.all(
        deletingTasks.map((t) =>
          fetch(`/api/tasks/${t.id}`, { method: "DELETE" })
        )
      );
      refreshAll();
      toast.success(
        deletingTasks.length === 1
          ? "Task deleted"
          : `${deletingTasks.length} tasks deleted`
      );
      setSelectedIds(new Set());
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
      setDeletingTasks([]);
    }
  }

  // --- Escape to deselect ---
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && selectedIds.size > 0) {
        setSelectedIds(new Set());
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds.size]);

  // --- Render ---

  if (!tasks) {
    return null;
  }

  const dropHighlight =
    "ring-2 ring-accent ring-offset-2 ring-offset-background rounded-[10px]";

  // Anything actively narrowing the list lights up the Filters button —
  // including the default backlog-hidden state, so it's discoverable.
  const filtersActive =
    visibleSections.length < ALL_SECTION_KEYS.length ||
    (showSize && sizeFilter.length < ALL_SIZES.length) ||
    (showDates && (dateFrom !== undefined || dateTo !== undefined)) ||
    (showGoals && goalFilterIds !== null);

  async function handleMarkDone(task: Task) {
    await markTaskDone(task);
  }

  async function handleNotToday(task: Task) {
    try {
      await moveToUpcoming(task);
    } catch {
      /* helper already toasted */
    }
  }

  // Hold the check circle to toggle In Progress (mirrors the Today panel).
  async function handleLongPress(task: Task) {
    try {
      if (task.destination === "in_progress") {
        await moveToToday(task);
      } else {
        await moveToInProgress(task);
      }
    } catch {
      /* helper already toasted */
    }
  }

  const taskListProps = {
    onTaskClick: handleTaskClick,
    onDragStart: handleDragStart,
    draggingTaskId,
    selectedIds,
    onDelete: handleDeleteRequest,
    onMarkDone: handleMarkDone,
    onLongPress: handleLongPress,
    showSize,
    showDates,
    showGoals,
    onRowDragOver: handleRowDragOver,
    onTouchDragStart: setDraggingTaskId,
    onTouchDragEnd: handleDragEnd,
    onTouchReorder: reorderSectionByIndex,
  };

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

  return (
    <div className="max-w-3xl px-4 md:px-6 pt-5 md:pt-[80px] pb-8" onDragEnd={handleDragEnd}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold tracking-tight">My Tasks</h1>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setTagsModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Target className="h-3.5 w-3.5" />
            Goals
          </button>
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "inline-flex items-center gap-1.5 text-xs transition-colors",
                filtersActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {filtersActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#a855f7]" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="end">
            <div className="space-y-3">
              {/* SECTIONS */}
              <div>
                <span className="text-sm">Sections</span>
                <div className="relative mt-2 pb-3" ref={sectionsContainerRef}>
                  <button
                    type="button"
                    onClick={() => setSectionsDropdownOpen((p) => !p)}
                    className="flex w-full items-center justify-between rounded-md border border-border bg-transparent px-3 py-1.5 text-xs h-8"
                  >
                    <span className="text-muted-foreground">
                      {visibleSections.length === ALL_SECTION_KEYS.length
                        ? "All sections"
                        : `${visibleSections.length} of ${ALL_SECTION_KEYS.length}`}
                    </span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </button>
                  {sectionsDropdownOpen && (
                    <div className="absolute left-0 right-0 z-50 mt-1 rounded-[10px] border border-border bg-popover p-1 shadow-md" style={{ top: '32px' }}>
                      {ALL_SECTION_KEYS.map((s) => {
                        const active = visibleSections.includes(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => toggleSection(s)}
                            className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-accent"
                          >
                            <span className={active ? "text-foreground" : "text-muted-foreground"}>
                              {SECTION_LABELS[s]}
                            </span>
                            {active && <Check className="h-3 w-3 text-foreground" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* SIZE */}
              <div>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">Size</span>
                  <Switch
                    checked={showSize}
                    onCheckedChange={() =>
                      toggleFilter("vault_show_size", showSize, setShowSize)
                    }
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
                      <div className="absolute left-0 right-0 z-50 mt-1 rounded-[10px] border border-border bg-popover p-1 shadow-md" style={{ top: '32px' }}>
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
                    onCheckedChange={() =>
                      toggleFilter("vault_show_dates", showDates, setShowDates)
                    }
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
                              ? dateFrom.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
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
                          onSelect={(day) => {
                            setDateFrom(day);
                            setDateFromOpen(false);
                          }}
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
                              ? dateTo.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
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
                          onSelect={(day) => {
                            setDateTo(day);
                            setDateToOpen(false);
                          }}
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
                    onCheckedChange={() =>
                      toggleFilter("vault_show_goals", showGoals, setShowGoals)
                    }
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
                        {goalFilterIds === null
                          ? "All goals"
                          : `${goalFilterIds.length} of ${(tags ?? []).length}`}
                      </span>
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </button>
                    {goalDropdownOpen && (
                      <div className="absolute left-0 right-0 z-50 mt-1 rounded-[10px] border border-border bg-popover p-1 shadow-md" style={{ top: '32px' }}>
                        <Input
                          value={goalSearch}
                          onChange={(e) => setGoalSearch(e.target.value)}
                          placeholder="Search..."
                          className="h-7 text-xs mb-1 border-0 bg-transparent focus-visible:ring-0 px-2"
                          autoFocus
                        />
                        <div className="max-h-36 overflow-auto">
                          {/* All option */}
                          {"all".includes(goalSearch.toLowerCase()) && (
                            <button
                              type="button"
                              onClick={setGoalAll}
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
                                      // Switching from "All" to this single goal
                                      updateGoalFilter([tag.id]);
                                    } else if (goalFilterIds.includes(tag.id)) {
                                      const next = goalFilterIds.filter((id) => id !== tag.id);
                                      updateGoalFilter(next.length === 0 ? null : next);
                                    } else {
                                      updateGoalFilter([...goalFilterIds, tag.id]);
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
      </div>

      <TagsModal open={tagsModalOpen} onOpenChange={setTagsModalOpen} />

      <WeeklyNudge
        nudgeDay={settings?.weekly_nudge_day ?? "sunday"}
        onReview={handleReviewSomeday}
      />

      {filterSomeday && (
        <div className="flex items-center justify-between bg-accent/30 rounded-[10px] px-4 py-2 mb-4">
          <span className="text-sm text-muted-foreground">
            Showing Someday tasks only
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilterSomeday(false)}
          >
            Show all
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {VAULT_SECTIONS.map(({ key, section, title, defaultOpen, alwaysShow }) => {
          // Someday review mode overrides section visibility — it must show
          // Someday even when the saved filter hides it.
          if (filterSomeday) {
            if (!alwaysShow) return null;
          } else if (!visibleSections.includes(section)) {
            return null;
          }
          const tasks = filteredGrouped[key];
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
                count={tasks.length}
                defaultOpen={defaultOpen}
                headerExtra={renderSortDropdown(section)}
              >
                <TaskList
                  tasks={tasks}
                  {...taskListProps}
                  section={section}
                  onNotToday={section === "on_deck" ? handleNotToday : undefined}
                  dropIndicatorIndex={dropIndicator?.section === section ? dropIndicator.index : null}
                />
              </VaultSection>
            </div>
          );
        })}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-20 md:bottom-10 left-1/2 -translate-x-1/2 z-50 bg-background border border-border rounded-full px-4 py-2 shadow-lg flex items-center gap-3">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors p-1">
                <FolderInput className="h-4 w-4" />
                Move
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-36 p-1" side="top" align="center">
              {VAULT_SECTIONS.map(({ section, title }) => (
                <button
                  key={section}
                  type="button"
                  onClick={() => handleBulkMove(section)}
                  className="flex w-full items-center rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors hover:bg-accent"
                >
                  {title}
                </button>
              ))}
            </PopoverContent>
          </Popover>
          <button
            onClick={handleBulkDeleteRequest}
            className="text-muted-foreground hover:text-destructive transition-colors p-1"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Edit modal */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          allTags={tags ?? []}
          open={true}
          onClose={() => setEditingTask(null)}
        />
      )}

      {/* Delete confirmation modal */}
      <Dialog
        open={deletingTasks.length > 0}
        onOpenChange={(v) => {
          if (!v && !deleting) setDeletingTasks([]);
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {deletingTasks.length === 1
                ? "Delete task?"
                : `Delete ${deletingTasks.length} tasks?`}
            </DialogTitle>
            <DialogDescription>
              {deletingTasks.length === 1 ? (
                <>
                  <span className="line-clamp-2 break-all">&ldquo;{deletingTasks[0]?.title}&rdquo;</span>
                  will be permanently deleted.
                </>
              ) : (
                "These tasks will be permanently deleted."
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeletingTasks([])}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
