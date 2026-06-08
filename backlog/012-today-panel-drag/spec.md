# Today view — drag panels to swap sides

## What
On the Today screen, let John **drag the Tasks panel or Notes panel by its edge/border**
to swap which side each is on — the drag-based version of the swap toggle shipped in 008.

## Detail
- 008 added a swap button (⇄) that flips Notes/Tasks sides at `md+`, persisted in
  `localStorage` (`focus-today-swapped`). This adds **drag**: grab a panel near its border
  and drag it to the other side.
- Reuse a drag approach already in the app / shadcn rather than hand-rolling. Persist the
  side the same way (`focus-today-swapped`); keep the existing toggle as a fallback.
- `md+` only (mobile stacks vertically). Light + dark, design tokens.

## Definition of done
Dragging a panel by its edge swaps the two panels' sides and the choice persists across
reloads. Works on mouse (and touch if feasible).

## Notes
- Interactive DnD — verify on the preview (drag can't be unit-tested).
- Relates to 008 (swap toggle) — this is the richer drag version.
- No schema change. Class: review.
