"use client";

import { useRef, useState } from "react";
import { CircleCheck } from "lucide-react";
import { createTask } from "@/lib/taskMutations";
import type { Destination } from "@/lib/types";

export function InlineTaskEntry({ destination, compact }: { destination: Destination; compact: boolean }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rowClass = `flex w-full items-center gap-2 rounded-[10px] text-sm ${compact ? "px-1 h-8 coarse:h-11" : "px-2 h-11"}`;

  if (!editing) return (
    <button ref={buttonRef} type="button" className={`${rowClass} text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/30 transition-colors`}
      onClick={() => setEditing(true)}>
      <span className={compact ? undefined : "pl-[22px]"}>+ Add a task</span>
    </button>
  );

  return (
    <form className={`${rowClass} bg-accent/20`} aria-busy={saving}
      onSubmit={async (e) => {
        e.preventDefault();
        if (saving || !title.trim()) return;
        setSaving(true);
        try {
          await createTask({ title: title.trim(), destination });
          setTitle("");
        } catch {
          // Keep the draft for retry; createTask shows the error toast.
        } finally {
          setSaving(false);
        }
      }}>
      {!compact && <span className="w-3.5 shrink-0" aria-hidden="true" />}
      <CircleCheck aria-hidden="true" strokeWidth={1.5} className="h-5 w-5 shrink-0 text-muted-foreground/30" />
      <input autoFocus aria-label="New task" maxLength={200} value={title} readOnly={saving}
        className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none"
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => { if (!saving && !title.trim()) setEditing(false); }}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing && e.key === "Enter") e.preventDefault();
          if (e.key === "Escape" && !saving) {
            e.preventDefault();
            setTitle("");
            setEditing(false);
            requestAnimationFrame(() => buttonRef.current?.focus());
          }
        }} />
      <span className="pr-1 text-xs text-muted-foreground/50" aria-hidden="true">{saving ? "Saving…" : "↵"}</span>
    </form>
  );
}
