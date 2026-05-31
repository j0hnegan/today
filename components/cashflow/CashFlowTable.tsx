"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCashFlow } from "@/lib/hooks";
import {
  sortRows,
  runningBalances,
  lowestPoint,
  endingBalance,
  applyDrop,
  formatMoney,
} from "@/lib/cashflow";
import { CashFlowRow } from "./CashFlowRow";
import { CashFlowDateButton } from "./CashFlowDateButton";
import { useTouchDragSort } from "@/lib/useTouchDragSort";
import type { CashFlow, CashFlowRow as Row } from "@/lib/types";

const DEBOUNCE_MS = 500;
const GRID = "16px 20px 64px minmax(64px,1fr) 64px 64px 76px 24px";
const TABLE_MIN_WIDTH = 360;

const todayStr = () => new Date().toISOString().slice(0, 10);

function newRow(date: string): Row {
  return {
    id: crypto.randomUUID(),
    date,
    description: "",
    amount_in: 0,
    amount_out: 0,
    locked: false,
  };
}

interface CashFlowTableProps {
  id: string;
  onRemove: () => void;
}

export function CashFlowTable({ id, onRemove }: CashFlowTableProps) {
  const { data, mutate } = useCashFlow(id);
  const [cf, setCf] = useState<CashFlow | null>(null);
  const initialized = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    if (initialized.current || data === undefined) return;
    initialized.current = true;
    setCf(
      data ?? {
        id,
        title: "Cash Flow Forecast",
        starting_balance: 0,
        starting_date: todayStr(),
        rows: [],
      }
    );
  }, [data, id]);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const scheduleSave = useCallback(
    (next: CashFlow) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        // Keep the SWR cache (and its localStorage mirror) in sync with local
        // edits so a reload hydrates fresh data instead of a stale snapshot.
        mutate(next, { revalidate: false });
        fetch(`/api/cashflow/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: next.title,
            starting_balance: next.starting_balance,
            starting_date: next.starting_date,
            rows: next.rows,
          }),
        }).catch(() => {});
      }, DEBOUNCE_MS);
    },
    [id, mutate]
  );

  const update = useCallback(
    (patch: Partial<CashFlow>) => {
      setCf((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        if (patch.rows) next.rows = sortRows(patch.rows);
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

  const updateRow = useCallback(
    (rowId: string, patch: Partial<Row>) => {
      setCf((prev) => {
        if (!prev) return prev;
        const rows = sortRows(
          prev.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r))
        );
        const next = { ...prev, rows };
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

  const handleRemove = useCallback(async () => {
    await fetch(`/api/cashflow/${id}`, { method: "DELETE" }).catch(() => {});
    onRemove();
  }, [id, onRemove]);

  // Touch reordering (HTML5 DnD below is mouse-only). Drives the same drag
  // state and runs the same applyDrop the desktop drop handler does.
  const rowsRef = useRef<HTMLDivElement>(null);
  const bindRowDrag = useTouchDragSort({
    containerRef: rowsRef,
    onStart: setDraggingIndex,
    onMove: setDropIndex,
    onDrop: (from, ins) =>
      setCf((prev) => {
        if (!prev) return prev;
        const next = { ...prev, rows: applyDrop(prev.rows, from, ins) };
        scheduleSave(next);
        return next;
      }),
    onEnd: () => {
      setDraggingIndex(null);
      setDropIndex(null);
    },
  });

  if (!cf) {
    return (
      <div className="rounded-[10px] border border-border bg-panel p-4 text-sm text-muted-foreground">
        Loading forecast…
      </div>
    );
  }

  const rows = cf.rows;
  const balances = runningBalances(cf.starting_balance, rows);
  const ending = endingBalance(cf.starting_balance, rows);
  const lowest = lowestPoint(cf.starting_balance, rows);

  const handleRowDragOver = (e: React.DragEvent, index: number) => {
    if (draggingIndex === null) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    setDropIndex(e.clientY < mid ? index : index + 1);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggingIndex !== null && dropIndex !== null) {
      update({ rows: applyDrop(rows, draggingIndex, dropIndex) });
    }
    setDraggingIndex(null);
    setDropIndex(null);
  };

  return (
    <div
      contentEditable={false}
      className="my-2 rounded-[10px] border border-border bg-panel p-4 select-none"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Header: title + remove */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <input
          type="text"
          value={cf.title}
          onChange={(e) => update({ title: e.target.value })}
          className="bg-transparent text-base font-semibold text-foreground outline-none min-w-0 flex-1"
        />
        {confirmRemove ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-destructive">Remove?</span>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setConfirmRemove(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="text-destructive font-medium"
              onClick={handleRemove}
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmRemove(true)}
            className="text-muted-foreground hover:text-destructive p-1"
            title="Remove forecast"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Starting balance + summary */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4 rounded-[10px] border border-border bg-background/40 p-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Starting balance as of
            </span>
            <div className="flex h-9 items-center rounded-[8px] border border-input bg-background px-2.5 focus-within:ring-1 focus-within:ring-ring">
              <CashFlowDateButton
                value={cf.starting_date ?? ""}
                onChange={(date) => update({ starting_date: date })}
              />
            </div>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Amount
            </span>
            <input
              type="number"
              inputMode="decimal"
              value={cf.starting_balance || ""}
              placeholder="0.00"
              onChange={(e) =>
                update({ starting_balance: parseFloat(e.target.value) || 0 })
              }
              className="h-9 w-28 rounded-[8px] border border-input bg-background px-2.5 text-sm text-foreground outline-none tabular-nums placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </label>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Ending balance
          </div>
          <div
            className={cn(
              "text-2xl font-bold tabular-nums",
              ending < 0 ? "text-red-400" : "text-foreground"
            )}
          >
            {formatMoney(ending)}
          </div>
          <div
            className={cn(
              "text-xs tabular-nums",
              lowest < 0 ? "text-red-400" : "text-muted-foreground"
            )}
          >
            Lowest point: {formatMoney(lowest)}
          </div>
        </div>
      </div>

      {/* Table (scrolls horizontally when the panel is narrower than the columns) */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: TABLE_MIN_WIDTH }}>
          {/* Column headers */}
          <div
            className="grid items-center gap-1.5 px-2 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground"
            style={{ gridTemplateColumns: GRID }}
          >
            <span />
            <span />
            <span>Date</span>
            <span>Description</span>
            <span className="text-right">In</span>
            <span className="text-right">Out</span>
            <span className="text-right">Balance</span>
            <span />
          </div>

          {/* Rows */}
          <div ref={rowsRef}>
            {rows.map((row, i) => (
              <div key={row.id} data-drag-index={i} onDragOver={(e) => handleRowDragOver(e, i)}>
                {dropIndex === i && <DropIndicator />}
                <CashFlowRow
                  row={row}
                  index={i}
                  balance={balances[i]}
                  gridTemplate={GRID}
                  isDragging={draggingIndex === i}
                  onChange={(patch) => updateRow(row.id, patch)}
                  onDelete={() => update({ rows: rows.filter((r) => r.id !== row.id) })}
                  onToggleLock={() => updateRow(row.id, { locked: !row.locked })}
                  onDragStart={(idx) => setDraggingIndex(idx)}
                  onDragEnd={() => {
                    setDraggingIndex(null);
                    setDropIndex(null);
                  }}
                  touchHandlers={bindRowDrag(i)}
                />
              </div>
            ))}
            {dropIndex === rows.length && <DropIndicator />}
          </div>

          <button
            type="button"
            onClick={() => {
              const last = rows[rows.length - 1];
              update({ rows: [...rows, newRow(last?.date || cf.starting_date || todayStr())] });
            }}
            className="mt-1 flex w-full items-center gap-1.5 rounded-[10px] px-2 py-2 text-sm text-muted-foreground/60 hover:bg-accent/30 hover:text-muted-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add row
          </button>
        </div>
      </div>
    </div>
  );
}

function DropIndicator() {
  return (
    <div className="relative h-0 z-10">
      <div className="absolute left-2 right-2 top-0 -translate-y-[1px] h-[2px] bg-accent rounded-full" />
    </div>
  );
}
