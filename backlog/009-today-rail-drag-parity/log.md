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
