# Health — steward snapshot

_Last run: 2026-06-17 (steward). Overwritten each run; latest state only._

Healthy run — no drift, no fixes needed. LEARNINGS, structure, and dashboard all
consistent. Nothing forces John's hand from the steward.

## Status counts (19 features)
- ✅ **shipped:** 16 — 001–010, 012–017 (all merged, #16–#29)
- 🤔 **proposed (your go/no-go):** 1 — 011 (search, scope is the open question)
- 📥 **ready (builder's queue):** 1 — 018 (Finance tab, gated behind 019 by design)
- 🚫 **blocked (needs you):** 1 — 019 (Plaid→Chase sync; 4-table migration + Plaid
  account/env vars — loop won't write/run migrations)
- 🏗 building / 💬 discussing / 👀 preview / 🔁 iterating: 0

**Waiting on you:** 2 (011 proposal + 019 unblock). **In flight:** 0. **Queued for builder:** 1.

## Fixed this run
- Nothing mechanical to fix. Refreshed dashboard "Last run" line only.

## Healthy
- All 19 folders have `spec.md` + `log.md`. All `Status:`/`Class:` values valid.
- Every `Status:` agrees with GitHub (`gh pr list`): #16–#29 merged → shipped;
  011/018/019 have no branch/PR yet → consistent with proposed/ready/blocked.
- Dashboard ↔ folders are 1:1 (001–019). No orphans either direction.
- LEARNINGS.md clean — no contradictions, no dupes, all cited paths exist. Unchanged.
- Nothing `building`/`discussing` → no builder race.
- No features untouched >30 days (oldest log activity 06-07, now 10 days ago —
  well within the 30-day window).

## For John (informational, unchanged from prior runs — no new action needed)
- **019 stays blocked by design** — needs a DB migration + a Plaid account/env
  vars before there's a testable surface. 018 is queued right behind it.
- **Open PR [#13](https://github.com/j0hnegan/today/pull/13) "Native iOS app shell
  (Capacitor) [WIP]"** (branch `feat/ios-capacitor`, last updated 2026-05-31)
  has no backlog folder; an untracked `ios/` still sits in the working tree.
  Your manual iOS work, not a loop artifact. Give it a folder if you want loop
  tracking. 17 days open; not yet stale.
- **Cleanup candidates (not the steward's to delete):** remote branches
  `claude/fix-task-categorization-j8nuy`, `claude/task-duplication-bug-Mrona`
  (pre-backlog, no PRs); merged `auto/*` leftovers still on remote
  (`auto/005-step2b-code` → #28, `auto/014-carryover-empty-guard` → #25).
