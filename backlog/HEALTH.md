# Health — steward snapshot

_Last run: 2026-07-03 (steward). Overwritten each run; latest state only._

## Status counts (19 features)
- ✅ **shipped:** 16 — 001–010, 012–017 (all merged, #16–#29)
- 🤔 **proposed (your go/no-go):** 1 — 011 (search, scope is the open question)
- 📥 **ready (builder's queue):** 1 — 018 (Finance tab, gated behind 019 by design)
- 🚧 **blocked (needs you):** 1 — 019 (Plaid→Chase sync; 4-table migration + Plaid account/env vars)
- 🏗 building / 💬 discussing / 👀 preview / 🔁 iterating: 0

**Waiting on you:** 2 (011 proposal + 019 unblock). **In flight:** 0. **Queued for builder:** 1.

## Fixed this run
- Nothing to fix — board, LEARNINGS, and structure all clean.

## Needs John

### Standing (unchanged)

- **[Draft PR #13](https://github.com/j0hnegan/today/pull/13) "Native iOS app shell (Capacitor) [WIP]"**
  (`feat/ios-capacitor`) — **33 days open** (since 2026-05-31). No backlog folder. 30-day flag triggered 2026-06-30 — decision still pending. Three options:
  1. **Track it** — create a backlog folder seeded from the PR description.
  2. **Park it** — minimal folder, `status: blocked` (needs Xcode/signing to proceed).
  3. **Close it** — close the PR if on indefinite hold.

- **`feature/task-triage-v2`** — local branch, 12 days old (1 commit 2026-06-21), no PR filed, no backlog folder. Options: file a PR, create a backlog folder via `/backlog`, or merge/close if it was a one-off.

- **`origin/claude/fix-task-categorization-j8nuy`** — old bug-fix branch (~63 days, 2026-05-01), 1 commit ahead of main, no PR ever filed. Check whether `feature/task-triage-v2` addresses this; if so, close the branch.

- **019 Plaid→Chase sync stays blocked** — needs 4-table migration + Plaid account + env vars. 018 Finance tab queued right behind it.

- **011 search** — `proposed`, awaiting your one-tap go/no-go (26 days since intake). Reply "go on 011" to build Phase 1 (docs/notes search).

## Healthy
- All 19 folders have `spec.md` + `log.md`. All `Status:`/`Class:` values valid.
- Every `Status:` agrees with GitHub: #16–#29 merged → shipped; 011/018/019 have no branch/PR → consistent.
- Dashboard ↔ folders are 1:1 (001–019). No orphans.
- LEARNINGS.md clean — no contradictions, no dead refs, no dupes. Unchanged.
- Nothing `building`/`discussing` → no builder race.
- Active features last touched: 011 (26 days), 018 (22 days), 019 (22 days) — none >30 days.

## Cleanup candidates (not the steward's to delete)
- Local branches `claude/wonderful-einstein`, `claude/wonderful-goodall`, `ios-app` — zero commits ahead of main, safe to delete. `feat/responsive-mobile` shows 2 commits by hash not on main, but verified today: content is fully redundant (squash-merged as PR #12; the lone remaining commit's `next.config.mjs` fix is already present on main byte-for-byte) — safe to delete.
- Remote branch `origin/claude/task-duplication-bug-Mrona` — verified today: 0 commits ahead of main, fully merged. Safe to delete.
- Remote stale `origin/auto/005-step2b-code`, `origin/auto/014-carryover-empty-guard` — PRs merged, harmless leftovers.
- Untracked `ios/` folder in working tree — Capacitor build artifact from `feat/ios-capacitor`.
