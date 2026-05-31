"use client";

import { GripVertical, Lock, LockOpen, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/cashflow";
import { CashFlowDateButton } from "./CashFlowDateButton";
import type { CashFlowRow as Row } from "@/lib/types";

interface CashFlowRowProps {
  row: Row;
  index: number;
  balance: number;
  gridTemplate: string;
  isDragging: boolean;
  onChange: (patch: Partial<Row>) => void;
  onDelete: () => void;
  onToggleLock: () => void;
  onDragStart: (index: number) => void;
  onDragEnd: () => void;
  touchHandlers?: { onTouchStart: (e: React.TouchEvent) => void };
}

export function CashFlowRow({
  row,
  index,
  balance,
  gridTemplate,
  isDragging,
  onChange,
  onDelete,
  onToggleLock,
  onDragStart,
  onDragEnd,
  touchHandlers,
}: CashFlowRowProps) {
  const locked = row.locked;

  return (
    <div
      draggable={!locked}
      onDragStart={(e) => {
        if (locked) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.effectAllowed = "move";
        onDragStart(index);
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "group grid items-center gap-1.5 rounded-[10px] px-2 h-9 text-sm transition-colors",
        locked ? "bg-accent/40" : "hover:bg-white/[0.02]",
        isDragging && "opacity-40"
      )}
      style={{ gridTemplateColumns: gridTemplate }}
    >
      <span
        {...(locked ? {} : touchHandlers)}
        className={cn("flex items-center", locked ? "cursor-not-allowed" : "cursor-grab")}
      >
        <GripVertical
          className={cn(
            "h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/40 transition-opacity",
            locked
              ? "opacity-20"
              : "opacity-0 group-hover:opacity-100 coarse:opacity-100"
          )}
        />
      </span>

      <button
        type="button"
        onClick={onToggleLock}
        className={cn(
          "inline-flex items-center justify-center w-5 h-5 flex-shrink-0 transition-colors",
          locked
            ? "text-amber-400"
            : "text-muted-foreground/40 hover:text-foreground opacity-0 group-hover:opacity-100"
        )}
        title={locked ? "Unlock row" : "Lock row (pin + read-only)"}
      >
        {locked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
      </button>

      <CashFlowDateButton
        value={row.date}
        disabled={locked}
        onChange={(date) => onChange({ date })}
        className="text-left"
      />

      <input
        type="text"
        value={row.description}
        disabled={locked}
        placeholder="Description"
        onChange={(e) => onChange({ description: e.target.value })}
        className="bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50 disabled:opacity-70 disabled:cursor-default min-w-0"
      />

      <input
        type="number"
        inputMode="decimal"
        value={row.amount_in || ""}
        disabled={locked}
        placeholder="—"
        onChange={(e) => onChange({ amount_in: parseFloat(e.target.value) || 0 })}
        className="bg-transparent text-sm text-right text-green-400 outline-none placeholder:text-muted-foreground/40 disabled:opacity-70 disabled:cursor-default tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />

      <input
        type="number"
        inputMode="decimal"
        value={row.amount_out || ""}
        disabled={locked}
        placeholder="—"
        onChange={(e) => onChange({ amount_out: parseFloat(e.target.value) || 0 })}
        className="bg-transparent text-sm text-right text-red-400 outline-none placeholder:text-muted-foreground/40 disabled:opacity-70 disabled:cursor-default tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />

      <span
        className={cn(
          "text-sm text-right font-medium tabular-nums",
          balance < 0 ? "text-red-400" : "text-foreground"
        )}
      >
        {formatMoney(balance)}
      </span>

      <button
        type="button"
        onClick={onDelete}
        className="inline-flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive flex-shrink-0 p-0.5"
        title="Delete row"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
