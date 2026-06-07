# Today screen — swappable panels + task-panel parity with My Tasks

## What
Three related upgrades to the Today screen (`components/focus/PagePanel.tsx` +
`TaskListPanel.tsx`), all making the task rail behave like the My Tasks vault:

1. **Swap panel sides.** Let John move the Notes panel and the Task panel from
   left↔right and back, so he can put either on whichever side he prefers.
2. **Full drag parity with My Tasks.** Tasks in the Today rail should drag to
   reorder *and* drag between sections (Today ↔ In Progress), exactly like
   `VaultView`.
3. **Fix the row "X".** Clicking it currently *deletes* the task. It should use
   the trash icon from the My Tasks rows, and a **Not Today** button should sit
   to its left (bring it back — it existed before).

## Detail

### 1 — Swap panel sides
- Today is `flex flex-col md:flex-row` with Tasks (`flex-[7]`) then Notes
  (`flex-[5]`) — see `PagePanel.tsx:273-294`. Add a control that flips which side
  each lands on (toggle the flex order, keep the 7/5 ratio with the *task* panel
  always at 7 regardless of side).
- Persist the choice in `localStorage` so it sticks across reloads (personal,
  single-user — no need for a DB column or a setting row).
- A small icon button (e.g. a swap/columns icon) in one of the existing header
  control clusters is enough — don't add a settings panel. Must look right in
  light and dark, use design tokens, match the existing header button styling.
- Mobile stacks vertically already; the swap only needs to matter at `md+`.

### 2 — Drag parity with My Tasks
- The Today rail already reorders *within* the Today section via `reorderTasks` +
  `useTouchDragSort` + HTML5 DnD (`TaskListPanel.tsx:314-329, 431-499`). What's
  missing is **dragging a task from Today into In Progress and back**.
- Mirror how `VaultView` moves a task across sections on drop: it calls
  `reorderTasks(orderedIds, destination)` (the fn already takes an optional
  `destination` — `lib/taskMutations.ts:194`) and patches `destination` /`status`
  on cross-section drop (`VaultView.tsx:~500-540`). Reuse that logic; don't invent
  a parallel one.
- In Progress section here is render-only today (`TaskListPanel.tsx:522-547`) —
  make it a real drop target with the same drop-indicator line the Today list
  uses, and make its rows draggable back into Today.
- Touch + mouse both work in the vault; keep both working here.

### 3 — Row actions: trash icon + Not Today
- The destructive row button (`TaskListPanel.tsx:165-179`) currently shows an `X`
  and calls `onDeleteTask`. Swap the icon to **`Trash2`** to match the vault row
  (`components/vault/TaskRow.tsx:6,162`). It still deletes — that part is correct;
  only the icon is wrong.
- Add a **Not Today** button immediately to the *left* of the trash button, in the
  same hover-revealed action cluster. It moves the task out of Today rather than
  deleting it — i.e. off `on_deck`. Use the existing `moveToUpcoming` /
  `moveToSomeday` mutation (`lib/taskMutations.ts:169-175`); check git history for
  the prior "Not Today" to match which destination it used (likely Someday). Wire
  it through `TaskSidebar` → `useTaskActions` like the other row actions, don't
  call mutations inline in the row.
- Keep the action cluster's hover/`coarse:` reveal behavior and token-based styling.

### Bake-in (the Hush way)
- Follow the patterns already in `VaultView` / vault `TaskRow` — this is parity
  work, so reuse, don't re-architect.
- Design tokens only, dark mode first-class, proper TS types (no `any`).
- No DB/schema change: `destination`, `status`, `sort_order` all already exist.

## Definition of done
- Notes/Tasks panels can be swapped left↔right and the choice survives a reload.
- A Today task can be dragged into In Progress and back, plus reordered within a
  section, on both mouse and touch — same feel as My Tasks.
- The row's destructive button shows the `Trash2` icon (still deletes); a
  **Not Today** button sits to its left and moves the task off Today without
  deleting it.
- Looks correct in light and dark; CI gate green (typecheck + lint + test + build).

## Notes
needs migration? No.
