# Today rail — cross-section drag parity (Today ↔ In Progress)

## What
Part 2 of the original 008 spec, split out. The Today rail can reorder *within* a
section but can't **drag a task between Today and In Progress** the way `VaultView`
can. Add that.

## Detail
- Make the In Progress section in `TaskListPanel.tsx` a real drop target (with the
  same drop-indicator line the Today list uses) and make its rows draggable back into
  Today.
- Mirror `VaultView`'s cross-section logic — on a cross-section drop, patch
  `destination`/`status` (it already exposes `reorderTasks(orderedIds, destination)`,
  `lib/taskMutations.ts:194`, and `getBody`-style move in `VaultView.tsx`). Reuse it;
  don't invent a parallel DnD.
- Keep both mouse (HTML5 DnD) and touch (`useTouchDragSort`) working, like the vault.

## Definition of done
A Today task can be dragged into In Progress and back, plus reordered within a section,
on mouse and touch — same feel as My Tasks. CI green.

## Notes
- Split from 008 because it's a substantial DnD rewrite best done as its own focused,
  carefully-tested PR. Not blocking — long-press on the check circle already moves a
  task to In Progress.
- No schema change.
