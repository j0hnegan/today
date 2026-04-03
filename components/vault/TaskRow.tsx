"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { TagBadge } from "@/components/shared/TagBadge";
import { GripVertical, Trash2 } from "lucide-react";
import { linkifyText } from "@/lib/linkify";
import type { Task } from "@/lib/types";

export type SelectionPosition = "solo" | "first" | "middle" | "last" | null;

interface TaskRowProps {
  task: Task;
  onClick: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  isDragging?: boolean;
  isSelected?: boolean;
  selectionPosition?: SelectionPosition;
  onDelete?: (task: Task) => void;
  onMarkDone?: (task: Task) => void;
  showSize?: boolean;
  showDates?: boolean;
  showGoals?: boolean;
}

const sizeLabels: Record<string, string> = {
  xs: "1-15 min",
  small: "15-30 min",
  medium: "30-60 min",
  large: "60+ min",
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

const sizeColors: Record<string, { bg: string; text: string }> = {
  xs: { bg: "rgba(34,197,94,0.15)", text: "#22c55e" },
  small: { bg: "rgba(134,239,172,0.15)", text: "#86efac" },
  medium: { bg: "rgba(234,179,8,0.15)", text: "#eab308" },
  large: { bg: "rgba(249,115,22,0.15)", text: "#f97316" },
};

// Check circle icon matching the user's SVG
function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

export const TaskRow = memo(function TaskRow({
  task,
  onClick,
  onDragStart,
  isDragging,
  isSelected,
  selectionPosition,
  onDelete,
  onMarkDone,
  showSize = true,
  showDates = true,
  showGoals = true,
}: TaskRowProps) {
  // Compute border-radius based on position in contiguous selection block
  let selectionRadius = "rounded-[10px]";
  if (isSelected && selectionPosition) {
    switch (selectionPosition) {
      case "first":
        selectionRadius = "rounded-t-[10px] rounded-b-none";
        break;
      case "middle":
        selectionRadius = "rounded-none";
        break;
      case "last":
        selectionRadius = "rounded-b-[10px] rounded-t-none";
        break;
      case "solo":
        selectionRadius = "rounded-[10px]";
        break;
    }
  }

  const isDone = task.status === "done";

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={onClick}
      className={`group flex w-full items-center gap-2 ${selectionRadius} px-2 h-11 text-left text-sm cursor-pointer transition-colors overflow-visible ${
        isSelected
          ? "bg-accent/50"
          : "hover:bg-white/[0.02]"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab flex-shrink-0" />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (onMarkDone && !isDone) onMarkDone(task);
        }}
        className={`inline-flex items-center justify-center w-5 h-5 flex-shrink-0 transition-colors ${
          isDone
            ? "text-green-400"
            : "text-muted-foreground group-hover:text-green-400 hover:!text-green-400"
        }`}
      >
        <CheckCircleIcon className="h-5 w-5" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate">{task.title}</span>
          {showDates && task.due_date && (
            <span
              className="text-sm font-mono flex-shrink-0 text-muted-foreground"
              style={{
                letterSpacing: '-0.25px',
              }}
            >
              {formatDate(task.due_date)}
            </span>
          )}
        </div>
        {task.description && (
          <span className="block truncate text-xs text-muted-foreground mt-0.5">
            {linkifyText(task.description)}
          </span>
        )}
      </div>
      {showSize && (
        <Badge
          variant="secondary"
          className="text-[10px] font-mono flex-shrink-0 py-0 border-0"
          style={{
            backgroundColor: sizeColors[task.size]?.bg,
            color: sizeColors[task.size]?.text,
          }}
        >
          {sizeLabels[task.size]}
        </Badge>
      )}
      {showGoals &&
        task.tags && (
        <>
          {task.tags.slice(0, 2).map((tag) => <TagBadge key={tag.id} tag={tag} />)}
          {task.tags.length > 2 && (
            <span className="relative group/tip">
              <Badge
                variant="secondary"
                className="text-[10px] font-mono border-0 cursor-default bg-accent text-muted-foreground"
              >
                +{task.tags.length - 2}
              </Badge>
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-md bg-popover border border-border text-xs text-foreground whitespace-nowrap opacity-0 pointer-events-none group-hover/tip:opacity-100 transition-opacity z-50">
                {task.tags.slice(2).map((t) => t.name).join(", ")}
              </span>
            </span>
          )}
        </>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive flex-shrink-0 p-0.5"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
});
