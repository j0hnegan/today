"use client";

import { useEffect, useRef } from "react";
import type { SlashItem } from "./SlashCommand";

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
              <span className="font-medium">{item.label}</span>
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
