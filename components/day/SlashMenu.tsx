"use client";

import { useEffect, useRef } from "react";
import type { SlashItem } from "./SlashCommand";

// Emphasize the matched substring ("/med" lights up the "med" in
// "find new migraine medication").
function HighlightedLabel({ label, query }: { label: string; query?: string }) {
  const idx = query ? label.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (!query || idx === -1) return <>{label}</>;
  return (
    <>
      {label.slice(0, idx)}
      <span className="bg-foreground/20 rounded-[2px]">
        {label.slice(idx, idx + query.length)}
      </span>
      {label.slice(idx + query.length)}
    </>
  );
}

export function SlashMenu({
  items,
  rect,
  index,
  onSelect,
  onHover,
}: {
  items: SlashItem[];
  rect: DOMRect | null;
  index: number;
  onSelect: (item: SlashItem) => void;
  onHover: (i: number) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${index}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [index]);

  if (!rect || items.length === 0) return null;

  return (
    <div
      ref={listRef}
      className="fixed z-50 w-64 max-h-72 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md"
      style={{ top: rect.bottom + 6, left: rect.left }}
    >
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            data-index={i}
            onMouseEnter={() => onHover(i)}
            // mousedown, not click: the editor keeps focus and the suggestion
            // range is still active when the command runs.
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(item);
            }}
            className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
              i === index ? "bg-accent text-accent-foreground" : "text-foreground"
            }`}
          >
            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="flex flex-col min-w-0">
              <span className="font-medium truncate">
                <HighlightedLabel label={item.label} query={item.query} />
              </span>
              <span className="text-[10px] text-muted-foreground truncate">
                {item.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
