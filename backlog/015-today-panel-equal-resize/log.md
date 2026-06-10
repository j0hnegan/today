Status: shipped
Class: review
Branch: —
PR: —

## Done
<checklist the builder ticks off>

## Open
- Equal-width default (was 7/5), draggable divider, persist split, 460px min per
  panel, coexist with the existing side-swap.

## Decisions / feedback log
- [2026-06-09 john] Intake via /backlog. Equal panels by default + resizable,
  min 460px either side. Relates to 012 (panel drag, in preview).

Branch: auto/015-today-panel-resize
PR: #26 (draft) — builder built same-day per John. Drag-test divider + swap interplay.

- [2026-06-09 John→builder] Flash on reload after resize. Fixed: pre-paint inline script sets --task-basis; drag writes the var directly (no state). PR #26 updated.

- [2026-06-09 John] Merged (#26).
