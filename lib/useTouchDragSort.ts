"use client";

import { useCallback, useEffect, useRef } from "react";

// Touch reordering for lists that already use HTML5 drag-and-drop on desktop.
// HTML5 DnD emits no events on touch, so this adds a parallel pointer path:
// a long-press picks up a row (so a normal touch still scrolls/taps), then the
// finger drags it and `onMove`/`onDrop` report an *insertion index* (0..count),
// matching how the desktop drop handlers already think about position.
//
// Attach `bind(index).onTouchStart` to each row (or its drag handle) and put
// `data-drag-index={index}` on the row element used for hit-testing.

interface TouchDragSortOptions {
  containerRef: React.RefObject<HTMLElement>;
  onStart: (index: number) => void;
  onMove: (insertionIndex: number) => void;
  onDrop: (fromIndex: number, insertionIndex: number) => void;
  onEnd: () => void;
  enabled?: boolean;
  longPressMs?: number;
}

interface DragState {
  fromIndex: number;
  active: boolean;
  startX: number;
  startY: number;
  pointerY: number;
  insertion: number;
  timer: ReturnType<typeof setTimeout> | null;
  raf: number;
  move: (e: TouchEvent) => void;
  end: (e: TouchEvent) => void;
}

const SLOP = 8; // px of pre-activation movement that means "scroll", not "drag"
const EDGE = 80; // autoscroll edge zone
const MAX_SPEED = 14;

// Move an item to an insertion index (0..length), accounting for its removal.
export function moveByInsertion<T>(arr: T[], from: number, insertion: number): T[] {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(insertion > from ? insertion - 1 : insertion, 0, item);
  return next;
}

export function useTouchDragSort({
  containerRef,
  onStart,
  onMove,
  onDrop,
  onEnd,
  enabled = true,
  longPressMs = 350,
}: TouchDragSortOptions) {
  const state = useRef<DragState | null>(null);
  // Keep latest callbacks reachable without re-creating the touchstart binder.
  const cb = useRef({ onStart, onMove, onDrop, onEnd });
  cb.current = { onStart, onMove, onDrop, onEnd };

  const cleanup = useCallback(() => {
    const s = state.current;
    if (!s) return;
    if (s.timer) clearTimeout(s.timer);
    if (s.raf) cancelAnimationFrame(s.raf);
    document.removeEventListener("touchmove", s.move);
    document.removeEventListener("touchend", s.end);
    document.removeEventListener("touchcancel", s.end);
    state.current = null;
  }, []);

  const insertionAt = useCallback(
    (clientY: number) => {
      const container = containerRef.current;
      if (!container) return 0;
      const rows = Array.from(
        container.querySelectorAll<HTMLElement>("[data-drag-index]")
      );
      for (let i = 0; i < rows.length; i++) {
        const rect = rows[i].getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) return i;
      }
      return rows.length;
    },
    [containerRef]
  );

  const autoScroll = useCallback(() => {
    const s = state.current;
    if (!s || !s.active) return;
    const scroller =
      (containerRef.current?.closest("main") as HTMLElement | null) ??
      (document.querySelector("main") as HTMLElement | null);
    if (scroller) {
      const rect = scroller.getBoundingClientRect();
      const fromTop = s.pointerY - rect.top;
      const fromBottom = rect.bottom - s.pointerY;
      if (fromTop < EDGE && fromTop > 0) {
        scroller.scrollTop -= MAX_SPEED * (1 - fromTop / EDGE);
      } else if (fromBottom < EDGE && fromBottom > 0) {
        scroller.scrollTop += MAX_SPEED * (1 - fromBottom / EDGE);
      }
    }
    s.raf = requestAnimationFrame(autoScroll);
  }, [containerRef]);

  const bind = useCallback(
    (index: number) => ({
      onTouchStart: (e: React.TouchEvent) => {
        if (!enabled) return;
        if (state.current) cleanup();
        const t = e.touches[0];
        if (!t) return;

        const s: DragState = {
          fromIndex: index,
          active: false,
          startX: t.clientX,
          startY: t.clientY,
          pointerY: t.clientY,
          insertion: index,
          timer: null,
          raf: 0,
          move: () => {},
          end: () => {},
        };

        s.move = (ev: TouchEvent) => {
          const touch = ev.touches[0];
          if (!touch) return;
          if (!s.active) {
            // Moved before the hold completed → treat as a scroll, bail out.
            if (
              Math.abs(touch.clientX - s.startX) > SLOP ||
              Math.abs(touch.clientY - s.startY) > SLOP
            ) {
              cleanup();
            }
            return;
          }
          ev.preventDefault(); // block scrolling while actively dragging
          s.pointerY = touch.clientY;
          const ins = insertionAt(touch.clientY);
          if (ins !== s.insertion) {
            s.insertion = ins;
            cb.current.onMove(ins);
          }
        };

        s.end = (ev: TouchEvent) => {
          if (s.active) {
            ev.preventDefault(); // swallow the click the browser would synthesize
            cb.current.onDrop(s.fromIndex, s.insertion);
            cb.current.onEnd();
          }
          cleanup();
        };

        state.current = s;
        document.addEventListener("touchmove", s.move, { passive: false });
        document.addEventListener("touchend", s.end, { passive: false });
        document.addEventListener("touchcancel", s.end);

        s.timer = setTimeout(() => {
          if (!state.current) return;
          s.active = true;
          s.insertion = index;
          cb.current.onStart(index);
          if ("vibrate" in navigator) navigator.vibrate(10);
          s.raf = requestAnimationFrame(autoScroll);
        }, longPressMs);
      },
    }),
    [enabled, longPressMs, cleanup, insertionAt, autoScroll]
  );

  useEffect(() => cleanup, [cleanup]);

  return bind;
}
