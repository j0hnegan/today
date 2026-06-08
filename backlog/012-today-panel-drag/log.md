Status: iterating
Class: review
Branch: —
PR: —

## Done

## Open
- Interactive DnD — build then verify the drag on the preview.

## Decisions / feedback log
- [2026-06-07 intake] Split from the 009 discussion. John wants to drag the Today
  panels (Tasks/Notes) by their borders to swap sides — the drag version of 008's swap
  toggle. Class: review.

Branch: auto/012-today-panel-drag
PR: #23 (draft) — https://github.com/j0hnegan/today/pull/23
- [2026-06-07 builder] Built drag-to-swap via grip handles (vs pure edge-grab, for reliability). CI green. PR #23. Verify on preview.

- [2026-06-07 John] REJECTED #23: wrong. Want edge-grab (no handle) + drag visual feedback. Also fix slow Notes load in Today view, in this PR.
