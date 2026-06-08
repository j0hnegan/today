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

## REBUILD (2026-06-07, John) — wrong approach; remove the handle
- NO top grip handle (remove it entirely).
- **Edge-grab:** hovering near the EDGES of either panel changes the cursor to grab and
  lets you drag the whole panel — no handle.
- **Real drag visual feedback:** show the panel being dragged (a drag ghost/image), like
  dragging a task. Currently there's none.
- ALSO in this PR: the **Notes panel takes ~1 min to load** in the Today view —
  investigate and fix.
Verify drag + the notes-load fix on the live preview before handing back.

## Header behavior (2026-06-07, John)
- The DATE header always stays put (top-left) — it must NOT move when panels swap.
- Each panel's OWN header (its title "My Tasks" / "Notes" + that panel's controls) travels
  WITH the panel: if Tasks is dragged to the right, the right header becomes "My Tasks"
  (+ task controls) and the left becomes "Notes" (+ note controls). Titles/controls are
  fixed to their panels; only the date is globally fixed.
- Implies: pull the date out of the tasks-panel header into a stable position, and give the
  tasks panel its own swappable "My Tasks" header (like the vault).
