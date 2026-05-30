import type { CashFlowRow } from "./types";

/** Add n days to a YYYY-MM-DD date string (UTC, TZ-safe). */
export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** Format a YYYY-MM-DD date string as "May 29" (TZ-safe). */
export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Format a number as US currency, e.g. -1063.99 → "-$1,063.99". */
export function formatMoney(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}$${abs}`;
}

/** Stable sort by date ascending; rows with no date sort last. */
export function sortRows(rows: CashFlowRow[]): CashFlowRow[] {
  return [...rows].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
  });
}

/** Running balance after each row, aligned to the rows array. */
export function runningBalances(start: number, rows: CashFlowRow[]): number[] {
  let bal = start;
  return rows.map((r) => {
    bal += (r.amount_in || 0) - (r.amount_out || 0);
    return bal;
  });
}

/** Lowest the balance reaches, including the starting balance. */
export function lowestPoint(start: number, rows: CashFlowRow[]): number {
  const bals = runningBalances(start, rows);
  return Math.min(start, ...bals);
}

/** Final balance after all rows. */
export function endingBalance(start: number, rows: CashFlowRow[]): number {
  const bals = runningBalances(start, rows);
  return bals.length ? bals[bals.length - 1] : start;
}

/**
 * Date the dragged row should take to sit between its new neighbours.
 * Dragging rewrites the row's date so a plain date-sort lands it at the drop
 * slot — e.g. dropping a 5/28 row below a 6/1 row (nothing beneath) → 6/2.
 */
export function dateForDrop(
  aboveDate: string | null,
  belowDate: string | null,
  fallback: string
): string {
  const above = aboveDate || null;
  const below = belowDate || null;
  if (above && below) {
    if (above >= below) return above;
    const plus1 = addDays(above, 1);
    return plus1 <= below ? plus1 : above;
  }
  if (above) return addDays(above, 1);
  if (below) return addDays(below, -1);
  return fallback;
}

/**
 * Reorder rows after a drag: move row `fromIndex` to `dropIndex` (insertion
 * index in the original array, 0..length), rewrite its date to fit the slot,
 * and return the re-sorted array. Locked rows can't be moved.
 */
export function applyDrop(
  rows: CashFlowRow[],
  fromIndex: number,
  dropIndex: number
): CashFlowRow[] {
  const dragged = rows[fromIndex];
  if (!dragged || dragged.locked) return rows;

  const others = rows.filter((_, i) => i !== fromIndex);
  let insertAt = dropIndex > fromIndex ? dropIndex - 1 : dropIndex;
  insertAt = Math.max(0, Math.min(insertAt, others.length));

  const above = others[insertAt - 1];
  const below = others[insertAt];
  const newDate = dateForDrop(above?.date ?? null, below?.date ?? null, dragged.date);

  const moved = { ...dragged, date: newDate };
  const result = [...others.slice(0, insertAt), moved, ...others.slice(insertAt)];
  return sortRows(result);
}
