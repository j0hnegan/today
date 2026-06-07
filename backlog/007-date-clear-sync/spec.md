# Today ↔ My Tasks stay in sync (date-clear bug)

## What
Clearing a due date on a Today task was causing the task to disappear from the Today
view and then show up in the My Tasks "Today" list — an inconsistency between the two
views. It's not reproducing right now, but it happened. The real fix is making sure the
Today view and the My Tasks view are always in sync.

## Detail
- Reproduce: clear / change a date on a Today task and watch whether it vanishes from
  the Today rail and/or jumps around in My Tasks.
- Likely an SWR cache issue: the Today rail uses filtered fetches
  (`useTasks({ destination: "on_deck" })` + `in_progress`) while My Tasks
  (`VaultView`) uses `useTasks()` (all). A mutation that patches one cache key may not
  update the other, so the two views drift. Auto-triage (`lib/triage.ts`) moving a task
  on date change may also play in.
- Fix: ensure task mutations invalidate / optimistically patch **all** relevant task
  cache keys so both views reflect the same state immediately — no disappearing or
  duplicating.

## Definition of done
Clearing or changing a date keeps the Today view and My Tasks consistent — no task
disappears, duplicates, or shows in one view but not the other.

## Notes
- Related to 003 (both touch RightRail task fetching / SWR caches) — may share a fix.
- No schema migration.
