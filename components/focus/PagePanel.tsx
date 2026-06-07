"use client";

import { useRef, useCallback, useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useNote, useDatesWithContent } from "@/lib/hooks";
import { NoteEditor } from "@/components/focus/NoteEditor";
import { TaskSidebar } from "@/components/focus/TaskSidebar";
import {
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Upload,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

export function PagePanel() {
  const attachInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Date navigation — initialize from ?date= if present
  const searchParams = useSearchParams();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const param = searchParams?.get("date");
    if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) {
      return new Date(param + "T00:00:00");
    }
    return new Date();
  });
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Sync when ?date= changes (e.g. navigating from Docs page)
  useEffect(() => {
    const param = searchParams?.get("date");
    if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) {
      setSelectedDate(new Date(param + "T00:00:00"));
    }
  }, [searchParams]);

  const dateStr = useMemo(() => toDateStr(selectedDate), [selectedDate]);
  const { data: note, mutate: mutateNote } = useNote(dateStr);

  // Dates with content for calendar & smart navigation
  const contentDateRange = useMemo(() => {
    const from = new Date(selectedDate);
    from.setMonth(from.getMonth() - 6);
    from.setDate(1);
    const to = new Date(selectedDate);
    to.setMonth(to.getMonth() + 2);
    to.setDate(0);
    return { from: toDateStr(from), to: toDateStr(to) };
  }, [selectedDate]);
  const { data: datesWithContent } = useDatesWithContent(contentDateRange.from, contentDateRange.to);
  const contentDateSet = useMemo(() => new Set(datesWithContent ?? []), [datesWithContent]);

  const isToday = useMemo(() => toDateStr(selectedDate) === toDateStr(new Date()), [selectedDate]);

  // Date navigation — smart skip past days
  function navigateDate(delta: number) {
    const todayStr = toDateStr(new Date());
    setSelectedDate((prev) => {
      const currentStr = toDateStr(prev);
      if (contentDateSet.size > 0 && currentStr <= todayStr) {
        const sorted = Array.from(contentDateSet).sort();
        if (delta < 0) {
          const pastDates = sorted.filter((d) => d < currentStr).reverse();
          if (pastDates.length > 0) {
            const [y, m, d] = pastDates[0].split("-").map(Number);
            return new Date(y, m - 1, d);
          }
        } else if (delta > 0) {
          const futureDates = sorted.filter((d) => d > currentStr && d <= todayStr);
          if (futureDates.length > 0) {
            const [y, m, d] = futureDates[0].split("-").map(Number);
            return new Date(y, m - 1, d);
          }
          if (currentStr < todayStr) return new Date();
        }
      }
      const next = new Date(prev);
      next.setDate(next.getDate() + delta);
      return next;
    });
  }

  function goToToday() {
    setSelectedDate(new Date());
  }

  // File upload
  const handleAttachUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0 || !note?.id) return;
      setUploading(true);
      try {
        for (let i = 0; i < files.length; i++) {
          const formData = new FormData();
          formData.append("file", files[i]);
          formData.append("entity_type", "note");
          formData.append("entity_id", String(note.id));
          const res = await fetch("/api/uploads", { method: "POST", body: formData });
          if (!res.ok) throw new Error();
          toast.success(`Uploaded ${files[i].name}`);
        }
        mutateNote();
      } catch {
        toast.error("Upload failed");
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    },
    [note?.id, mutateNote]
  );

  // Date title — sits above the task column, sharing its row with the
  // task sort/filter controls (rendered by TaskListPanel after this node).
  const dateHeader = (
    <h1 className="text-lg font-semibold tracking-tight truncate flex-1 min-w-0 mr-2">
      {formatDateHeader(selectedDate)}
    </h1>
  );

  // Note controls — attach + date navigation, shown on the right above Notes.
  const noteControls = (
    <div className="flex items-center gap-1 flex-shrink-0">
      <button
        type="button"
        onClick={() => attachInputRef.current?.click()}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors mr-1"
      >
        {uploading ? <Upload className="h-3 w-3 animate-pulse" /> : <Paperclip className="h-3 w-3" />}
        {uploading ? "Uploading..." : "Attach"}
      </button>

      <button
        type="button"
        onClick={() => navigateDate(-1)}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium transition-colors",
              isToday
                ? "text-foreground bg-accent"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
            onClick={(e) => {
              e.preventDefault();
              if (datePickerOpen) { goToToday(); setDatePickerOpen(false); }
              else { setDatePickerOpen(true); }
            }}
          >
            Today
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={selectedDate}
            modifiers={{
              hasContent: (date: Date) => contentDateSet.has(toDateStr(date)),
            }}
            modifiersClassNames={{
              hasContent: "has-content-dot",
            }}
            onSelect={(day) => {
              if (day) setSelectedDate(day);
              setDatePickerOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>

      <button
        type="button"
        onClick={() => navigateDate(1)}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="px-4 md:px-6 pt-5 md:pt-[80px] pb-6 md:h-full flex flex-col md:flex-row md:gap-6 md:overflow-hidden w-full">
      {/* Tasks (left) — date title + sort/filter share the header row */}
      <div className="flex flex-col flex-[7] min-w-0 md:min-h-0 mb-6 md:mb-0">
        <TaskSidebar headerLeading={dateHeader} />
      </div>

      {/* Notes (right) */}
      <div className="flex flex-col flex-[5] min-w-0 md:min-h-0">
        <div className="flex items-center justify-between min-h-7" style={{ marginBottom: "1rem" }}>
          <h1 className="text-lg font-semibold tracking-tight">Notes</h1>
          {noteControls}
        </div>
        <div className="rounded-[10px] border border-border bg-panel flex flex-col flex-1 min-h-[55vh] md:min-h-0 md:overflow-y-auto p-4 md:p-6">
          <NoteEditor
            note={note}
            dateStr={dateStr}
            noteId={note?.id ?? null}
            mutateNote={mutateNote}
          />
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={attachInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleAttachUpload}
      />
    </div>
  );
}
