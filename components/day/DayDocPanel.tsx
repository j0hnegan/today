"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useNote } from "@/lib/hooks";
import { DayDoc, isTiptapDoc, normalizeDoc, type TiptapDoc } from "./DayDoc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { JSONContent } from "@tiptap/react";

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

// True when the doc has anything worth carrying: a task pill or actual text.
function docHasContent(blocks: unknown): boolean {
  if (!isTiptapDoc(blocks)) return false;
  const walk = (nodes: JSONContent[]): boolean =>
    nodes.some(
      (n) =>
        n.type === "taskBlock" ||
        (n.type === "text" && (n.text ?? "").trim().length > 0) ||
        (n.content ? walk(n.content) : false)
    );
  return walk(blocks.content ?? []);
}

export function DayDocPanel() {
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const dateStr = useMemo(() => toDateStr(selectedDate), [selectedDate]);
  const isToday = dateStr === toDateStr(new Date());

  const { data: note, mutate: mutateNote } = useNote(dateStr);

  // New-day carry-over (ported from the classic Today page): if the tab sits
  // open past midnight while viewing what was "today", advance to the new day
  // and offer to bring yesterday's doc forward.
  const sessionTodayRef = useRef(toDateStr(new Date()));
  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;
  const noteRef = useRef(note);
  noteRef.current = note;
  const [carryover, setCarryover] = useState<{ fromDate: string; blocks: TiptapDoc } | null>(null);

  useEffect(() => {
    function checkRollover() {
      const realToday = toDateStr(new Date());
      if (realToday === sessionTodayRef.current) return;
      const prevToday = sessionTodayRef.current;
      sessionTodayRef.current = realToday;
      // Only act if the user is still looking at the day that just ended.
      if (toDateStr(selectedDateRef.current) !== prevToday) return;
      const prevBlocks = noteRef.current?.blocks;
      setSelectedDate(new Date(realToday + "T00:00:00"));
      const normalized = normalizeDoc(prevBlocks);
      if (normalized !== "" && docHasContent(normalized)) {
        setCarryover({ fromDate: prevToday, blocks: normalized });
      }
    }
    window.addEventListener("focus", checkRollover);
    document.addEventListener("visibilitychange", checkRollover);
    const interval = setInterval(checkRollover, 60_000);
    return () => {
      window.removeEventListener("focus", checkRollover);
      document.removeEventListener("visibilitychange", checkRollover);
      clearInterval(interval);
    };
  }, []);

  // Fresh-open carry-over: the midnight watcher above only helps a tab that
  // crossed midnight while open. Opening the app on a new day is the common
  // case — if today's doc is still empty and yesterday's has content, offer
  // to carry it over (once per day; "Start fresh" remembers the answer).
  const checkedFreshRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isToday || note === undefined || carryover) return;
    if (checkedFreshRef.current === dateStr) return;
    checkedFreshRef.current = dateStr;
    if (localStorage.getItem(`day-carryover-dismissed-${dateStr}`)) return;
    const todayNorm = normalizeDoc(note.blocks);
    if (todayNorm !== "" && docHasContent(todayNorm)) return; // day already started
    const y = new Date(dateStr + "T00:00:00");
    y.setDate(y.getDate() - 1);
    const yStr = toDateStr(y);
    fetch(`/api/notes?date=${yStr}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((n) => {
        const norm = normalizeDoc(n?.blocks);
        if (norm !== "" && docHasContent(norm)) {
          setCarryover({ fromDate: yStr, blocks: norm });
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday, note, dateStr, carryover]);

  function dismissCarryover() {
    if (carryover) {
      localStorage.setItem(`day-carryover-dismissed-${toDateStr(new Date())}`, "1");
    }
    setCarryover(null);
  }

  async function handleCarryOver() {
    if (!carryover) return;
    const todayStr = toDateStr(new Date());
    let existing: JSONContent[] = [];
    try {
      const res = await fetch(`/api/notes?date=${todayStr}`);
      if (res.ok) {
        const todayNote = await res.json();
        const norm = normalizeDoc(todayNote?.blocks);
        if (norm !== "" && docHasContent(norm)) existing = norm.content ?? [];
      }
    } catch {
      /* treat as empty */
    }
    const merged: TiptapDoc = {
      type: "doc",
      content: existing.length
        ? [...existing, { type: "horizontalRule" }, ...(carryover.blocks.content ?? [])]
        : carryover.blocks.content ?? [],
    };
    try {
      const res = await fetch("/api/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: todayStr, blocks: merged }),
      });
      if (!res.ok) throw new Error();
      await mutateNote();
      toast.success("Carried over yesterday's doc");
    } catch {
      toast.error("Couldn't carry over");
    }
    setCarryover(null);
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
      <Dialog open={!!carryover} onOpenChange={(v) => { if (!v) dismissCarryover(); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>New day</DialogTitle>
            <DialogDescription>
              It&apos;s {formatDateHeader(new Date())}. Carry over your doc from{" "}
              {carryover && formatDateHeader(new Date(carryover.fromDate + "T00:00:00"))}?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={dismissCarryover}>
              Start fresh
            </Button>
            <Button size="sm" onClick={handleCarryOver}>
              Carry over
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
