"use client";

import { useEffect, useRef } from "react";
import {
  Heading1,
  Heading2,
  Heading3,
  Type,
  List,
  ListOrdered,
  ListTodo,
} from "lucide-react";

interface EditorContextMenuProps {
  position: { top: number; left: number };
  onDismiss: () => void;
  onFormatBlock: (tag: string) => void;
  onConvertToTask: () => void;
}

const ITEMS = [
  { id: "h1", label: "Heading 1", icon: Heading1, tag: "h1" },
  { id: "h2", label: "Heading 2", icon: Heading2, tag: "h2" },
  { id: "h3", label: "Heading 3", icon: Heading3, tag: "h3" },
  { id: "p", label: "Normal text", icon: Type, tag: "div" },
  { id: "ul", label: "Bullet list", icon: List, tag: "insertUnorderedList" },
  { id: "ol", label: "Numbered list", icon: ListOrdered, tag: "insertOrderedList" },
] as const;

export function EditorContextMenu({
  position,
  onDismiss,
  onFormatBlock,
  onConvertToTask,
}: EditorContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onDismiss]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 rounded-[10px] border border-border bg-popover p-1 shadow-md min-w-[180px]"
      style={{ top: position.top, left: position.left }}
    >
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-accent transition-colors"
            onMouseDown={(e) => {
              e.preventDefault();
              onFormatBlock(item.tag);
            }}
          >
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            {item.label}
          </button>
        );
      })}
      <div className="my-1 border-t border-border" />
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-accent transition-colors"
        onMouseDown={(e) => {
          e.preventDefault();
          onConvertToTask();
        }}
      >
        <ListTodo className="h-3.5 w-3.5 text-muted-foreground" />
        Convert to task
      </button>
    </div>
  );
}
