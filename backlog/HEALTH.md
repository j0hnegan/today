# Health — steward snapshot

_Last run: 2026-06-09 (steward). Overwritten each run; latest state only._

Healthy run — one drift fixed (016), everything else consistent. Nothing forces John's hand from the steward.

## Status counts (16 features)
- ✅ **shipped:** 14 — 001–010, 012, 013, 014, 016 (all merged this week)
- 👀 **preview (waiting on you):** 1 — 015 (#26, equal-width + resizable panels)
- 🤔 **proposed (your go/no-go):** 1 — 011 (search, scope is the open question)
- 🏗 building / 💬 discussing / 📋 ready / 🚫 blocked: 0

**Waiting on you:** 2 (1 preview to merge-or-send-back + 1 proposal). **In flight:** 0.

## Fixed this run
- **016 drift → synced.** PR #27 was merged on GitHub (commit `0187a14`) but its
  `log.md` and the dashboard still read `preview`. GitHub is authoritative — set
  016 → **shipped** (log + dashboard), noted the sync in its log.

## Healthy
- All 16 folders have `spec.md` + `log.md`. All `Status:`/`Class:` values valid.
- Every `Status:` now agrees with GitHub (`gh pr list`): #16–#28 merged → shipped;
  #26 (015) open draft → preview. No remaining drift.
- LEARNINGS.md clean — no contradictions, no dupes, all cited paths exist (CLAUDE.md,
  `lib/server-fetchers.ts`, `lib/validation/*`). Unchanged this run.
- Dashboard table matches GitHub; folders ↔ dashboard rows are 1:1 (001–016).
- No features untouched >30 days (whole backlog is 2026-06-07/09).

## For John (no action forced — informational)
- **Open PR [#13](https://github.com/j0hnegan/today/pull/13) "Native iOS app shell (Capacitor) [WIP]"**
  (branch `feat/ios-capacitor`, last updated 2026-05-31) has no backlog folder, and an
  untracked `ios/` still sits in the working tree. Your manual iOS work, not a loop
  artifact — left untouched. Give it a folder if you want the loop to track it.
- **Two stale `claude/*` branches** with no folder/PR, predating the backlog:
  `claude/fix-task-categorization-j8nuy`, `claude/task-duplication-bug-Mrona`. Plus
  merged `auto/*` branches (005, 009, 012, 013, 014, 016) still on the remote.
  Deletion candidates whenever you clean up remotes — not the steward's to delete.
