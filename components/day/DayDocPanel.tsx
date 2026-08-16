"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { useNote } from "@/lib/hooks";
import { DayDoc, normalizeDoc, type TiptapDoc } from "./DayDoc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DayContext, DayRolloverCandidate } from "@/lib/day-rollover";

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

function normalizeCandidate(
  candidate: DayRolloverCandidate | null
): { fromDate: string; blocks: TiptapDoc } | null {
  if (!candidate) return null;
  const blocks = normalizeDoc(candidate.blocks);
  return blocks === "" ? null : { fromDate: candidate.fromDate, blocks };
}

export function DayDocPanel({
  initialRolloverCandidate = null,
}: {
  initialRolloverCandidate?: DayRolloverCandidate | null;
}) {
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const dateStr = useMemo(() => toDateStr(selectedDate), [selectedDate]);
  const isToday = dateStr === toDateStr(new Date());
  const { mutate: mutateCache } = useSWRConfig();

  const { data: note, mutate: mutateNote } = useNote(dateStr, { revalidateOnFocus: false });

  // New-day carry-over (ported from the classic Today page): if the tab sits
  // open past midnight while viewing what was "today", advance to the new day
  // and offer to bring yesterday's doc forward.
  const sessionTodayRef = useRef(toDateStr(new Date()));
  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;
  const noteRef = useRef(note);
  noteRef.current = note;
  const [carryover, setCarryover] = useState<{ fromDate: string; blocks: TiptapDoc } | null>(
    () => normalizeCandidate(initialRolloverCandidate)
  );
  const [rolloverPending, setRolloverPending] = useState(false);
  const contextRequestRef = useRef<string | null>(null);

  useEffect(() => {
    async function checkRollover() {
      const realToday = toDateStr(new Date());
      if (realToday === sessionTodayRef.current) return;
      const prevToday = sessionTodayRef.current;
      const selected = toDateStr(selectedDateRef.current);
      if (selected !== prevToday && selected !== realToday) return;
      if (contextRequestRef.current === realToday) return;

      contextRequestRef.current = realToday;
      try {
        const response = await fetch(`/api/notes/context?date=${realToday}`);
        if (!response.ok) throw new Error("Day context failed");
        const context = (await response.json()) as DayContext;
        await mutateCache(`/api/notes?date=${realToday}`, context.note, { revalidate: false });

        const currentSelection = toDateStr(selectedDateRef.current);
        if (currentSelection !== prevToday && currentSelection !== realToday) return;
        sessionTodayRef.current = realToday;
        setSelectedDate(new Date(`${realToday}T00:00:00`));
        setCarryover(normalizeCandidate(context.rolloverCandidate));
      } catch {
        // A later focus, visibility, or interval event retries the same day.
      } finally {
        contextRequestRef.current = null;
      }
    }
    const onFocus = () => void checkRollover();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void checkRollover();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const interval = setInterval(() => void checkRollover(), 60_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearInterval(interval);
    };
  }, [mutateCache]);

  async function handleRollover(action: "carried" | "dismissed") {
    if (!carryover || rolloverPending) return;
    const activeCarryover = carryover;
    const todayStr = toDateStr(new Date());
    setCarryover(null);
    setRolloverPending(true);

    try {
      const res = await fetch("/api/notes/rollover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_date: activeCarryover.fromDate,
          to_date: todayStr,
          action,
        }),
      });
      if (!res.ok) throw new Error("Rollover failed");
      const updatedNote = await res.json();
      await mutateNote(updatedNote, { revalidate: false });

      if (action === "carried") {
        if (updatedNote.rollover_status === "carried") {
          toast.success("Carried over yesterday's doc");
        } else {
          toast.info("Today's doc already changed, so nothing was overwritten");
        }
      }
    } catch {
      if (!noteRef.current?.rollover_status) setCarryover(activeCarryover);
      toast.error(action === "carried" ? "Couldn't carry over" : "Couldn't start fresh");
    } finally {
      setRolloverPending(false);
    }
  }

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

      {/* New-day carry-over prompt */}
      <Dialog
        open={!!carryover}
        onOpenChange={(open) => {
          if (!open) void handleRollover("dismissed");
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>New day</DialogTitle>
            <DialogDescription>
              It&apos;s {formatDateHeader(new Date())}. Carry over your doc from{" "}
              {carryover && formatDateHeader(new Date(carryover.fromDate + "T00:00:00"))}?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={rolloverPending}
              onClick={() => void handleRollover("dismissed")}
            >
              Start fresh
            </Button>
            <Button
              size="sm"
              disabled={rolloverPending}
              onClick={() => void handleRollover("carried")}
            >
              Carry over
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
