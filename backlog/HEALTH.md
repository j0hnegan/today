# Health — steward snapshot

_Last run: 2026-06-21 (steward). Overwritten each run; latest state only._

## Status counts (19 features)
- ✅ **shipped:** 16 — 001–010, 012–017 (all merged, #16–#29)
- 🤔 **proposed (your go/no-go):** 1 — 011 (search, scope is the open question)
- 📥 **ready (builder's queue):** 1 — 018 (Finance tab, gated behind 019 by design)
- 🚧 **blocked (needs you):** 1 — 019 (Plaid→Chase sync; 4-table migration + Plaid account/env vars)
- 🏗 building / 💬 discussing / 👀 preview / 🔁 iterating: 0

**Waiting on you:** 2 (011 proposal + 019 unblock). **In flight:** 0. **Queued for builder:** 1.

## Fixed this run
- Corrected a previous steward error: `claude/task-duplication-bug-Mrona` was flagged as "pending, no PR" — the fix IS already on `main` (commit `4dcc140`, ancestor-checked). Removing the erroneous cleanup flag. The remote branch is still a harmless leftover to delete when convenient.

## Needs John

### New this run

- **`feature/task-triage-v2`** — new branch with significant app changes (929+/481- lines), committed 2026-06-21. No backlog folder, no PR yet. This is a major triage engine rewrite outside the builder loop. Options:
  1. **File a PR** and merge it (the code is on the branch).
  2. **Create a backlog folder** (e.g. `020-task-triage-v2/`) via `/backlog` so the loop can track it.
  3. If this was a one-off manual session, just merge/close the branch and move on.

- **`origin/claude/fix-task-categorization-j8nuy`** — old bug-fix branch (2026-05-01, 51 days), 1 commit ahead of main. Fix: "in_progress tasks landing under Someday on My Tasks." No PR ever filed. Worth checking whether `feature/task-triage-v2` already addresses this; if so, close the branch. If not, open a PR.

### Standing (no change from prior runs)

- **[Draft PR #13](https://github.com/j0hnegan/today/pull/13) "Native iOS app shell (Capacitor) [WIP]"**
  (`feat/ios-capacitor`) — now **21 days** open (since 2026-05-31), no backlog folder. Your options:
  1. **Track it** — create `020-ios-app-shell/` seeded from the PR description.
  2. **Park it** — minimal folder, `status: blocked` (needs Xcode/signing).
  3. **Close it** — close the PR if this is on indefinite hold.

- **019 Plaid→Chase sync stays blocked** — needs the 4-table migration + Plaid account + env vars. 018 Finance tab queued right behind it.

- **011 search** — `proposed`, awaiting your one-tap go/no-go.

## Healthy
- All 19 folders have `spec.md` + `log.md`. All `Status:`/`Class:` values valid.
- Every `Status:` agrees with GitHub: #16–#29 merged → shipped; 011/018/019 have no branch/PR → consistent with proposed/ready/blocked.
- Dashboard ↔ folders are 1:1 (001–019). No orphans in the backlog table.
- LEARNINGS.md clean — no contradictions, no dupes, all cited paths verified. Unchanged.
- Nothing `building`/`discussing` → no builder race.
- No backlog features untouched >30 days (oldest log: 011-search, 2026-06-07, 14 days ago).

## Cleanup candidates (not the steward's to delete)
- Local branches `claude/wonderful-einstein`, `claude/wonderful-goodall`, `ios-app` — zero commits ahead of main, safe to delete.
- Remote branch `origin/claude/task-duplication-bug-Mrona` — fix already on main; harmless leftover.
- Remote stale `origin/auto/005-step2b-code`, `origin/auto/014-carryover-empty-guard` — PRs merged, harmless leftovers.
