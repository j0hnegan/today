"use client";

import { useEffect, useState, type ReactNode } from "react";
import { TaskSidebar } from "@/components/focus/TaskSidebar";
import { cn } from "@/lib/utils";

type Panel = "notes" | "tasks";
const PANEL_DRAG = "application/x-hush-today-panel";

export function TodayLayout({ children }: { children: ReactNode }) {
  const [swapped, setSwapped] = useState(false);
  const [edgePanel, setEdgePanel] = useState<Panel | null>(null);
  const [dragging, setDragging] = useState<Panel | null>(null);

  useEffect(() => {
    setSwapped(localStorage.getItem("hush-day-panels-swapped") === "true");
  }, []);

  function swapPanels() {
    const next = !swapped;
    setSwapped(next);
    localStorage.setItem("hush-day-panels-swapped", String(next));
  }

  return (
    <div className={cn(
      "flex w-full flex-col gap-6 px-4 pb-6 pt-5 md:h-full md:overflow-hidden md:flex-row md:gap-3 md:px-6 md:pt-20",
      swapped && "md:flex-row-reverse"
    )}>
      {(["notes", "tasks"] as const).map((panel) => (
        <section
          key={panel}
          aria-label={panel === "notes" ? "Daily notes" : "My Tasks Today"}
          data-today-panel={panel}
          tabIndex={0}
          aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight"
          title="Drag the panel border to swap sides, or focus and press Alt + Left/Right"
          draggable={edgePanel === panel}
          onMouseMove={(event) => {
            const surface = (event.target as HTMLElement).closest<HTMLElement>("[data-panel-surface]");
            if (!surface || !window.matchMedia("(min-width: 1026px)").matches) {
              setEdgePanel(null);
              return;
            }
            const rect = surface.getBoundingClientRect();
            const distance = Math.min(event.clientX - rect.left, rect.right - event.clientX,
              event.clientY - rect.top, rect.bottom - event.clientY);
            setEdgePanel(distance <= 12 ? panel : null);
          }}
          onMouseLeave={() => setEdgePanel(null)}
          onKeyDown={(event) => {
            if (event.target === event.currentTarget && event.altKey &&
              (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
              event.preventDefault();
              swapPanels();
            }
          }}
          onDragStart={(event) => {
            if (event.target !== event.currentTarget || edgePanel !== panel) return;
            event.dataTransfer.setData(PANEL_DRAG, panel);
            event.dataTransfer.effectAllowed = "move";
            setDragging(panel);
          }}
          onDragEnd={() => { setDragging(null); setEdgePanel(null); }}
          onDragOverCapture={(event) => {
            if (!event.dataTransfer.types.includes(PANEL_DRAG)) return;
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = "move";
          }}
          onDropCapture={(event) => {
            if (!event.dataTransfer.types.includes(PANEL_DRAG)) return;
            event.preventDefault();
            event.stopPropagation();
            const source = event.dataTransfer.getData(PANEL_DRAG);
            if ((source === "notes" || source === "tasks") && source !== panel) swapPanels();
            setDragging(null);
          }}
          className={cn("flex min-w-0 flex-col md:min-h-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", panel === "notes" ? "md:flex-[3] md:overflow-y-auto" : "md:flex-[2]", edgePanel === panel && "cursor-grab", dragging === panel && "opacity-50")}
        >
          {panel === "notes" ? children : <TaskSidebar tabbed />}
        </section>
      ))}
    </div>
  );
}
