Status: preview
Class: review
Branch: auto/001-in-progress-sections (not yet pushed — dry run)
PR: — (holding for GitHub-plumbing confirmation)

## Done
- [x] Extracted shared `components/shared/LongPressCheck.tsx` (reused by both screens).
- [x] Vault: added In Progress section (Today → In Progress → Upcoming → Someday → Done);
      wired grouping, filters, drag-target, reorder, toast names, sort key.
- [x] Vault: fixed `in_progress` tasks being lumped into Someday (latent bug).
- [x] Vault: hold-the-check-circle toggles In Progress (and back to Today).
- [x] Today panel: replaced the Today/In Progress tab toggle with two stacked
      `VaultSection`s; preserved long-press, mark-done, add-task, filters, sort, counts.
- [x] CI gate green: `tsc --noEmit` (0), `next lint` (clean), `next build` (ok).
- [x] Local preview verified: both screens render, in_progress task now under In
      Progress not Someday, no console errors.

## Open
- Not yet committed/pushed — awaiting decision on the GitHub-as-plumbing model.
- Hold-gesture (750ms) and cross-section drag are wired identically to the proven
  Today-panel pattern, but the gesture *feel* is best confirmed by John in preview.

## Decisions / feedback log
- [2026-06-07 intake] Created via /backlog. Class: review. No migration needed.
- [2026-06-07 builder dry-run] Implemented both parts on branch auto/001. Chose to
  extract LongPressCheck to a shared component rather than duplicate (per LEARNINGS:
  reuse, don't duplicate). Kept the Today panel's outer bordered container and nested
  the two sections inside it — flagged as a possible style tweak for John's review.
  CI green, verified locally. Stopped before push pending plumbing confirmation.
