"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTasks, useTags } from "@/lib/hooks";
import { useTaskActions } from "@/lib/useTaskActions";
import { VaultSection } from "@/components/vault/VaultSection";
import { TaskList } from "@/components/vault/TaskList";
import { TaskEditModal } from "@/components/vault/TaskEditModal";
import { patchTask, reorderTasks, moveToInProgress, moveToToday } from "@/lib/taskMutations";
import { moveByInsertion } from "@/lib/useTouchDragSort";
import { toast } from "sonner";
import type { Task, Destination } from "@/lib/types";

// The Today task column. Same components + drag behavior as the My Tasks (vault)
// list — handles, padding, drop-indicator lines, reorder, and cross-section drag
// (Today ↔ In Progress) — scoped to two sections, plus a per-row "Not Today" action.
const SECTIONS = [
  { key: "onDeck", section: "on_deck", title: "Today" },
  { key: "inProgress", section: "in_progress", title: "In Progress" },
] as const;

export function TaskSidebar({ headerLeading }: { headerLeading?: React.ReactNode }) {
  const { data: allTasks } = useTasks();
  const { data: tags } = useTags();
  const actions = useTaskActions(allTasks ?? []);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ section: string; index: number } | null>(null);

  const grouped = useMemo(() => {
    const onDeck: Task[] = [];
    const inProgress: Task[] = [];
    for (const t of allTasks ?? []) {
      if (t.status !== "active") continue;
      if (t.destination === "on_deck") onDeck.push(t);
      else if (t.destination === "in_progress") inProgress.push(t);
    }
    return { onDeck, inProgress };
  }, [allTasks]);

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

  const dropHighlight = "ring-2 ring-accent ring-offset-2 ring-offset-background rounded-[10px]";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {headerLeading && (
        <div className="flex items-center min-h-7" style={{ marginBottom: "1rem" }}>
          {headerLeading}
        </div>
      )}

      <div className="space-y-2 flex-1 min-h-0 md:overflow-y-auto">
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
