"use client";

import { useEffect, useState, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { TaskSidebar } from "@/components/focus/TaskSidebar";
import { cn } from "@/lib/utils";

type Panel = "notes" | "tasks";
const PANEL_DRAG = "application/x-hush-today-panel";

export function TodayLayout({ children }: { children: ReactNode }) {
  const [swapped, setSwapped] = useState(false);
  const [dragging, setDragging] = useState<Panel | null>(null);

  useEffect(() => {
    setSwapped(localStorage.getItem("hush-day-panels-swapped") === "true");
  }, []);

  function swapPanels() {
    const next = !swapped;
    setSwapped(next);
    localStorage.setItem("hush-day-panels-swapped", String(next));
  }

  function handle(panel: Panel) {
    return (
      <button
        type="button"
        draggable
        aria-label={`Swap ${panel} panel sides`}
        title="Drag to the other panel, or click to swap sides"
        onClick={swapPanels}
        onDragStart={(event) => {
          event.dataTransfer.setData(PANEL_DRAG, panel);
          event.dataTransfer.effectAllowed = "move";
          setDragging(panel);
        }}
        onDragEnd={() => setDragging(null)}
        className="hidden md:inline-flex cursor-grab rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className={cn(
      "flex w-full flex-col gap-6 px-4 pb-6 pt-5 md:flex-row md:gap-6 md:px-6 md:pt-20",
      swapped && "md:flex-row-reverse"
    )}>
      {(["notes", "tasks"] as const).map((panel) => (
        <section
          key={panel}
          aria-label={panel === "notes" ? "Daily notes" : "My Tasks Today"}
          data-today-panel={panel}
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
          className={cn("min-w-0 flex-1", dragging === panel && "opacity-50")}
        >
          <div className="mb-3 flex items-center gap-1 text-sm font-medium">
            {handle(panel)} {panel === "notes" ? "Notes" : "My Tasks Today"}
          </div>
          {panel === "notes" ? children : <TaskSidebar />}
        </section>
      ))}
    </div>
  );
}
