Status: preview
Class: review
Branch: auto/012-today-panel-drag
PR: #23 (draft) — https://github.com/j0hnegan/today/pull/23

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

- [2026-06-08 builder] Reworked: removed the grip handle; edge-grab (cursor turns to grab within ~14px of a panel's border, whole panel drags), real drag image = the panel itself, drop-target ring on the other panel. md+ only; ⇄ toggle kept as fallback. Notes-load fix was already split out to 013, so not re-done here. CI green (tsc+lint+build). PR #23 → preview. Drag-test on the preview.
- [2026-06-08 builder] DEFERRED the spec's date-header-stays-top-left / per-panel "My Tasks" header refinement: it overlaps 009 (#22), which rewrites the Today task panel wholesale (deletes TaskListPanel, moves the date header). Will fold in after 009 lands so it isn't built twice.
- [2026-06-08 builder] PR #23 went CONFLICTING — a stray steward doc commit on this branch collided with backlog docs on main. Rebased onto main and dropped that commit; only app change remains `PagePanel.tsx`. CI green (tsc+lint+build), force-pushed. Mergeable again. Still preview/your call.

- [2026-06-09 John→builder] Edge-grab must be on the bordered panel DIVs only, NOT the header rows (headers still travel with panels on swap). Held until #22 merges — same code region; will rebase #23 onto main and apply both the div-only edges and the headers-travel/date-fixed behavior in one pass.

- [2026-06-09 builder] REBUILT on post-009 main: edge-grab on the bordered divs only (16px zones, cursor-grab), drag image = the panel itself, ring on drop target, headers excluded from grab but travel on swap. CI green, render verified. PR #23 force-pushed — drag-test.
