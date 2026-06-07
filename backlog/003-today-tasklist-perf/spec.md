# Today task-list lag + general app performance

## What
After swapping the Notes / My Tasks placement and splitting In Progress into its own
section, the My Tasks list in the Today view lags on load (Notes paints instantly, the
task list doesn't — it used to be instant too). The app also feels generally sluggish
(nav clicks are slow). Investigate and fix.

## Detail
- `components/shared/RightRail.tsx` now makes **two** `useTasks` calls (`on_deck` and
  `in_progress`). Check whether the split caused an extra round-trip / request waterfall
  vs. the old single fetch. Consider one fetch + client-side grouping (like
  `VaultView` does) instead of two filtered fetches.
- Notes paints instantly → it's prefetched on the server and hydrated. Verify the task
  rail's data is hydrated the same way (`lib/server-fetchers.ts` + `ServerSWR`). If the
  rail isn't part of the server prefetch, that's the lag.
- General sluggishness: profile client nav transitions — SWR revalidation storms, heavy
  re-renders, or the recent layout refactor. Find the worst offenders and fix.

## Definition of done
My Tasks list paints as fast as Notes (hydrated on first load), nav feels snappy, no
regressions to task interactions.

## Notes
- Likely tied to the 001 refactor (RightRail split + layout swap).
- Related to 007 (both touch RightRail task fetching / SWR caches).
- No schema migration.
