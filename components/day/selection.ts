"use client";

import { createContext, useContext } from "react";

// Multi-select state for task pills: shift-click selects a range, cmd-click
// toggles one. Lives in DayDoc; pills read it via context so the node views
// (rendered through Tiptap portals) stay in sync.
export interface DaySelectionState {
  selected: Set<number>;
  /** Returns true when the click was a selection gesture and was handled. */
  onPillClick: (taskId: number, e: React.MouseEvent) => boolean;
}

export const DaySelectionContext = createContext<DaySelectionState>({
  selected: new Set(),
  onPillClick: () => false,
});

export function useDaySelection() {
  return useContext(DaySelectionContext);
}
