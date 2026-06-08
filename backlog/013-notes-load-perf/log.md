Status: preview
Class: review
Branch: auto/013-notes-load-perf
PR: #24 (draft) — https://github.com/j0hnegan/today/pull/24

## Done
- [x] Root cause: 003 coupled the Today page render to the task query (Promise.all).
- [x] Fix: render on the note alone; rail hydrates client-side, non-blocking.

## Decisions / feedback log
- [2026-06-08 builder] Pulled out of 012 to ship fast. CI green. PR #24.
