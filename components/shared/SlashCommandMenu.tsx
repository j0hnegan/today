"use client";

import { useRef, useEffect } from "react";
import type { SlashCommand } from "@/lib/slashCommands";

interface SlashCommandMenuProps {
  commands: SlashCommand[];
  highlightedIndex: number;
  position: { top: number; left: number };
  onSelect: (cmd: SlashCommand) => void;
  onHover: (index: number) => void;
}

export function SlashCommandMenu({
  commands,
  highlightedIndex,
  position,
  onSelect,
  onHover,
}: SlashCommandMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Scroll highlighted item into view
  useEffect(() => {
    const el = itemRefs.current[highlightedIndex];
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  // Flip menu above cursor if it would overflow viewport
  const adjustedTop =
    position.top + 280 > window.innerHeight
      ? position.top - 280
      : position.top;

  if (commands.length === 0) return null;

  return (
    <div
      ref={menuRef}
      data-slash-menu
      className="fixed z-50 w-[220px] max-h-[260px] overflow-y-auto rounded-[10px] border border-border bg-popover p-1 shadow-md"
      style={{ top: adjustedTop, left: position.left }}
    >
      {commands.map((cmd, i) => {
        const Icon = cmd.icon;
        return (
          <button
            key={cmd.id}
            ref={(el) => { itemRefs.current[i] = el; }}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault(); // prevent blur
              onSelect(cmd);
            }}
            onMouseEnter={() => onHover(i)}
            className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-xs transition-colors text-left ${
              i === highlightedIndex ? "bg-accent text-accent-foreground" : "text-foreground"
            }`}
          >
            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium">{cmd.label}</div>
              <div className="text-[10px] text-muted-foreground">{cmd.description}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
