# Health — steward snapshot

_Last run: 2026-06-08 (steward). Overwritten each run; latest state only._

## Status counts (14 features)
- ✅ **shipped:** 8 — 001, 003, 004, 005, 006, 007, 008, 010 (all merged this week)
- 👀 **preview (waiting on you):** 3 — 009 (#22), 012 (#23, reworked), 013 (#24)
- 🤔 **proposed (your go/no-go):** 2 — 002 (personal-task agent, parked), 011 (search, scope)
- 📋 **ready (builder queue):** 1 — 014 (carry-over empty-note guard, auto)
- 🏗 building / 💬 discussing: 0

**Waiting on you:** 5 (3 previews to merge-or-send-back + 2 proposals). **In flight:** 1 queued.

## Fixed this run
- **006 log header stale** — header read `Branch: —` / `PR: —` while the feature
  shipped via merged PR #19 (its own decision log records the branch + PR, and GitHub
  shows #19 merged). GitHub is authoritative → filled in Branch/PR to match the other
  shipped features. Status was already correct.
- Refreshed the dashboard "Last run" marker.

## Healthy
- All 14 folders have `spec.md` + `log.md`. All `Status:`/`Class:` values valid.
- Every `Status:` agrees with GitHub (`gh pr list`): #16–#21 merged → shipped;
  #22/#23/#24 draft → preview. No drift.
- LEARNINGS.md clean — no contradictions, no dupes, all cited paths exist
  (`lib/server-fetchers.ts`, `lib/validation/*`, `components/shared/ServerSWR.tsx`,
  `CLAUDE.md`). Unchanged since last run.
- Every `auto/*` branch (009, 012, 013) maps to a folder; dashboard table matches GitHub.
- No features untouched >30 days (whole backlog is from the last two days).

## For John (no action forced — informational, unchanged from last run)
- **Open PR [#13](https://github.com/j0hnegan/today/pull/13) "Native iOS app shell (Capacitor) [WIP]"**
  (branch `feat/ios-capacitor`) has no backlog folder, and there's still an untracked
  `ios/` in the working tree. Looks like your own manual iOS work, not a loop artifact —
  left untouched. Give it a folder if you want the loop to track it; otherwise ignore.
- **Two stale `claude/*` branches** with no folder/PR, predating the backlog:
  `claude/fix-task-categorization-j8nuy`, `claude/task-duplication-bug-Mrona`. Deletion
  candidates whenever you clean up remotes — not the steward's to delete.
</content>
