"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNote } from "@/lib/hooks";
import { DayDoc } from "./DayDoc";
import { cn } from "@/lib/utils";

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

export function DayDocPanel() {
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const dateStr = useMemo(() => toDateStr(selectedDate), [selectedDate]);
  const isToday = dateStr === toDateStr(new Date());

  const { data: note } = useNote(dateStr);

  function navigateDate(delta: number) {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + delta);
      return next;
    });
  }

  return (
    <div className="px-4 md:px-6 pt-5 md:pt-[80px] pb-6 flex flex-col w-full max-w-5xl">
      <div className="flex items-center justify-between min-h-7 mb-4">
        <h1 className="text-lg font-semibold tracking-tight truncate flex-1 min-w-0 mr-2">
          {formatDateHeader(selectedDate)}
        </h1>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => navigateDate(-1)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(new Date())}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium transition-colors",
              isToday
                ? "text-foreground bg-accent"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => navigateDate(1)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* key remounts the editor when the date changes so content reloads;
          note must be fetched before the editor initializes its content. */}
      {note !== undefined && (
        <DayDoc key={dateStr} note={note} dateStr={dateStr} isToday={isToday} />
      )}
    </div>
  );
}
