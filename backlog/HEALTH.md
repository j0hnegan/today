# Health — steward snapshot

_Last run: 2026-06-26 #2 (steward). Overwritten each run; latest state only._

## Status counts (19 features)
- ✅ **shipped:** 16 — 001–010, 012–017 (all merged, #16–#29)
- 🤔 **proposed (your go/no-go):** 1 — 011 (search, scope is the open question)
- 📥 **ready (builder's queue):** 1 — 018 (Finance tab, gated behind 019 by design)
- 🚧 **blocked (needs you):** 1 — 019 (Plaid→Chase sync; 4-table migration + Plaid account/env vars)
- 🏗 building / 💬 discussing / 👀 preview / 🔁 iterating: 0

**Waiting on you:** 2 (011 proposal + 019 unblock). **In flight:** 0. **Queued for builder:** 1.

## Fixed this run
- **iOS PR #13 day count corrected:** morning HEALTH said "day 28" (2 days from 30-day threshold). Checked GitHub — PR created 2026-05-31; today is 2026-06-26 = **26 days open**. 30-day flag threshold is 2026-06-30 (4 days away). No structural fix needed; count corrected here.

## Needs John

### Standing (unchanged)

- **`feature/task-triage-v2`** — local branch, 1 commit (2026-06-21), no PR filed, no backlog folder. **~5 days old.** Options:
  1. **File a PR** and merge it (the code is on the branch).
  2. **Create a backlog folder** (`020-task-triage-v2/`) via `/backlog` so the loop tracks it.
  3. If a one-off manual session, merge/close the branch.

- **`origin/claude/fix-task-categorization-j8nuy`** — old bug-fix branch (2026-05-01, **~56 days**), 1 commit ahead of main, no PR ever filed. Fix: "in_progress tasks landing under Someday on My Tasks." Worth checking whether `feature/task-triage-v2` already addresses this; if so, close the branch. If not, open a PR.

- **[Draft PR #13](https://github.com/j0hnegan/today/pull/13) "Native iOS app shell (Capacitor) [WIP]"**
  (`feat/ios-capacitor`) — **26 days** open (since 2026-05-31). **4 days from the 30-day flag.** No backlog folder. Options:
  1. **Track it** — create a backlog folder seeded from the PR description.
  2. **Park it** — minimal folder, `status: blocked` (needs Xcode/signing).
  3. **Close it** — close the PR if on indefinite hold.

- **019 Plaid→Chase sync stays blocked** — needs 4-table migration + Plaid account + env vars. 018 Finance tab queued right behind it.

- **011 search** — `proposed`, awaiting your one-tap go/no-go (19 days since intake).

## Healthy
- All 19 folders have `spec.md` + `log.md`. All `Status:`/`Class:` values valid.
- Every `Status:` agrees with GitHub: #16–#29 merged → shipped; 011/018/019 have no branch/PR → consistent.
- Dashboard ↔ folders are 1:1 (001–019). No orphans.
- LEARNINGS.md clean — no contradictions, no dead refs, no dupes. Unchanged.
- Nothing `building`/`discussing` → no builder race.
- No backlog features untouched >30 days (oldest active: 011-search, 2026-06-07, ~19 days).

## Cleanup candidates (not the steward's to delete)
- Local branches `claude/wonderful-einstein`, `claude/wonderful-goodall`, `ios-app`, `feat/responsive-mobile` — zero commits ahead of main, safe to delete.
- Remote branch `origin/claude/task-duplication-bug-Mrona` — fix already on main; harmless leftover.
- Remote stale `origin/auto/005-step2b-code`, `origin/auto/014-carryover-empty-guard` — PRs merged, harmless leftovers.
- Untracked `ios/` folder in working tree — Capacitor build artifact from `feat/ios-capacitor`.
