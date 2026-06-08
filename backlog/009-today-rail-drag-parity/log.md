Status: preview
Class: review
Branch: —
PR: —

## Done

## Open
- Substantial DnD work — mirror VaultView's cross-section drop carefully.

## Decisions / feedback log
- [2026-06-07 builder] Split from 008 (part 2). 008 shipped parts 1+3 (#20); this is
  the cross-section drag parity, deferred to its own focused PR. Class: review.

- [2026-06-07 John] NOTE: described dragging the *panels* by their borders, which is different from this item (dragging *tasks* between Today/In Progress). Clarify before building: keep 009 as task-drag + new item for panel-drag, repoint 009, or both.

- [2026-06-07 John] Confirmed 009 = TASK drag on the Today list (port the vault DnD: reorder + cross-section). Panel-drag split to 012. "do both."

Branch: auto/009-today-task-drag
PR: #22 (draft) — https://github.com/j0hnegan/today/pull/22
- [2026-06-07 builder] Built cross-section task drag (Today↔In Progress), reusing existing mutations. CI green. PR #22. Verify drag on preview.

- [2026-06-07 John] REJECTED #22: not real parity. Rebuild to fully reuse the vault task list (handles, padding, drop indicators incl. cross-section) + Not Today.

- [2026-06-08 builder] REBUILT for full parity: Today list now uses the actual vault VaultSection/TaskList/TaskRow + ported vault drag + Not Today. Deleted bespoke TaskListPanel. CI green. PR #22 — drag-test.
