Status: shipped
Class: review
Branch: auto/003-today-tasklist-perf (merged)
PR: #17 (merged) — https://github.com/j0hnegan/today/pull/17

## Done
- [x] Root-caused the rail lag: Today page prefetched only the note; TaskSidebar made
      two filtered fetches AND had a mount gate that blocked SSR.
- [x] Prefetch tasks on the Today page; hydrate `/api/tasks` via ServerSWR.
- [x] TaskSidebar → single `useTasks()` + client grouping (mirrors VaultView); dropped
      the mount gate.
- [x] Verified the rail now appears in server-rendered HTML; CI green.

## Open
- The broader "general app sluggishness / slow nav" is a separate investigation —
  intentionally left out of this PR to keep it focused. Spin a follow-up if still slow.

## Decisions / feedback log
- [2026-06-07 intake] Created via /backlog. Class: review.
- [2026-06-07 builder] Fixed the Today rail lag (SSR + single fetch). Scoped out the
  general-sluggishness investigation. PR #17.
