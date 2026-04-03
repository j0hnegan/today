"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, CheckSquare, Search } from "lucide-react";
import { useDocs, useTasks } from "@/lib/hooks";
import { buildEmbedHTML } from "@/lib/slashCommands";

interface ItemPickerModalProps {
  type: "doc" | "task";
  open: boolean;
  onClose: () => void;
  onAdd: (html: string) => void;
}

export function ItemPickerModal({
  type,
  open,
  onClose,
  onAdd,
}: ItemPickerModalProps) {
  const { data: docs } = useDocs();
  const { data: tasks } = useTasks({ status: "active" });
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const items = useMemo(() => {
    const source =
      type === "doc"
        ? (docs ?? []).map((d) => ({ id: d.id, title: d.title }))
        : (tasks ?? []).map((t) => ({ id: t.id, title: t.title }));

    if (!search) return source;
    const q = search.toLowerCase();
    return source.filter((item) => item.title.toLowerCase().includes(q));
  }, [type, docs, tasks, search]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAdd() {
    const picked = items.filter((item) => selected.has(item.id));
    if (picked.length === 0) return;
    const html = buildEmbedHTML(type, picked);
    onAdd(html);
    setSearch("");
    setSelected(new Set());
  }

  function handleDragStart(e: React.DragEvent, item: { id: number; title: string }) {
    const html = buildEmbedHTML(type, [item]);
    e.dataTransfer.setData("text/html", html);
    e.dataTransfer.effectAllowed = "copy";
  }

  const Icon = type === "doc" ? FileText : CheckSquare;
  const label = type === "doc" ? "Documents" : "Tasks";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          setSearch("");
          setSelected(new Set());
        }
      }}
    >
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            Insert {label}
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${label.toLowerCase()}...`}
            className="pl-8 h-8 text-xs"
            autoFocus
          />
        </div>

        <div className="max-h-[300px] overflow-y-auto space-y-0.5 -mx-1 px-1">
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No {label.toLowerCase()} found
            </p>
          )}
          {items.map((item) => {
            const isSelected = selected.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onClick={() => toggle(item.id)}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-xs text-left transition-colors ${
                  isSelected
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50 text-foreground"
                }`}
              >
                <div
                  className={`h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-foreground border-foreground"
                      : "border-border"
                  }`}
                >
                  {isSelected && (
                    <svg className="h-3 w-3 text-background" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="truncate">{item.title}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-[10px] text-muted-foreground">
            {selected.size} selected {selected.size > 0 && "· drag items to drop directly"}
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                onClose();
                setSearch("");
                setSelected(new Set());
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={selected.size === 0}
              onClick={handleAdd}
            >
              Add
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
