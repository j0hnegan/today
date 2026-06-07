Status: shipped
Class: review
Branch: — (resolved by 003)
PR: — (no code needed; fixed by #17)

## Done
- [x] Root-caused: the Today rail used filtered SWR keys (`/api/tasks?destination=…`)
      while My Tasks used the unfiltered `/api/tasks`, so a mutation (e.g. clearing a
      date, which can re-triage) could update one and not the other → the desync.
- [x] **Resolved by 003 (#17):** that change put the Today rail on the same
      unfiltered `/api/tasks` key as My Tasks, and `patchTask` mirrors every change to
      that shared key — so both views now derive from one source and can't drift.

## Open
- If a date-clear desync ever recurs, reopen — but the shared-key unification removes
  the mechanism that caused it.

## Decisions / feedback log
- [2026-06-07 intake] Created via /backlog. Class: review.
- [2026-06-07 builder] Determined this is fixed by 003's cache unification rather than
  needing its own change. Marked shipped (resolved by #17). John approved building it;
  the honest outcome is no separate code was required.
