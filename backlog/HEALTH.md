# Health — steward snapshot

_Last run: 2026-06-08 (steward). Overwritten each run; latest state only._

## Status counts (14 features)
- ✅ **shipped:** 8 — 001, 003, 004, 005, 006, 007, 008, 010 (all merged this week)
- 👀 **preview (waiting on you):** 3 — 009 (#22), 012 (#23), 013 (#24)
- 🤔 **proposed (your go/no-go):** 2 — 002 (personal-task agent, phased), 011 (search, scope)
- 📋 **ready (builder queue):** 1 — 014 (carry-over empty-note guard, auto)
- 🏗 building / 💬 discussing: 0

**Waiting on you:** 5 (3 previews to merge-or-send-back + 2 proposals). **In flight:** 1 queued.

## Fixed this run
- **004 log was stale** — header said `Status: ready` but PR #18 is merged (its own decision log even noted "Merged (#18)"). GitHub is authoritative → flipped to `shipped`, filled in Branch/PR. Dashboard already showed it shipped, so this just realigns the log.
- Refreshed the dashboard "Last run" marker.

## Healthy
- All 14 folders have `spec.md` + `log.md`. All `Status:`/`Class:` values valid.
- LEARNINGS.md clean — no contradictions, no dead refs (all cited paths exist), no dupes.
- Every `auto/*` branch maps to a folder; dashboard table matches GitHub.
- No features untouched >30 days (whole backlog is from the last two days).

## For John (no action forced — informational)
- **Open PR [#13](https://github.com/j0hnegan/today/pull/13) "Native iOS app shell (Capacitor) [WIP]"** (branch `feat/ios-capacitor`) has no backlog folder, and there's an untracked `ios/` in the working tree. Looks like your own manual iOS work, not a loop artifact — left untouched. If you want it tracked by the loop, give it a folder; otherwise ignore.
- **Two stale `claude/*` branches** with no folder/PR and predating the backlog: `claude/fix-task-categorization-j8nuy`, `claude/task-duplication-bug-Mrona`. Candidates for deletion whenever you're cleaning up remotes — left alone (not the steward's to delete).
