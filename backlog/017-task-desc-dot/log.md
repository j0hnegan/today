Status: shipped
Class: review
Branch: auto/017-desc-dot (merged)
PR: #29 (merged) — https://github.com/j0hnegan/today/pull/29

## Decisions / feedback log
- [2026-06-09 John] Requested live: no desc preview in lists; dot right of title; blue
  = has desc, another color (builder picked amber) = new/unseen update.
- [2026-06-09 builder] Built: DescDot in vault TaskRow (shared by Today list), seen
  tracking via lib/descSeen.ts (useSyncExternalStore + localStorage), markDescSeen on
  modal open. CI green. PR #29.

- [2026-06-09 John] Merged (#29).
