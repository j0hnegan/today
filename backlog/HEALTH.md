# Health — steward snapshot

_Last run: 2026-06-18 (steward). Overwritten each run; latest state only._

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

## Needs John — escalating today

**[Draft PR #13](https://github.com/j0hnegan/today/pull/13) "Native iOS app shell
(Capacitor) [WIP]"** (`feat/ios-capacitor`) has been open 18 days (since 2026-05-31)
with no backlog folder. Flagged informational in prior runs; escalating today since
it's a real structural gap and the `ios/` directory is still untracked on `main`.

Your options:
1. **Track it** — I create `020-ios-app-shell/` seeded from the PR description; the
   loop manages it like any other feature.
2. **Park it** — minimal folder, `status: blocked` (needs Xcode/signing validation
   the builder can't do).
3. **Close it** — if this is on hold indefinitely, close the PR and remove the draft.

Call it and I'll act on it in the next session.

## Healthy
- All 19 folders have `spec.md` + `log.md`. All `Status:`/`Class:` values valid.
- Every `Status:` agrees with GitHub: #16–#29 merged → shipped; 011/018/019 have no
  branch/PR → consistent with proposed/ready/blocked.
- Dashboard ↔ folders are 1:1 (001–019). No orphans except the manual iOS PR above.
- LEARNINGS.md clean — no contradictions, no dupes, all cited paths exist. Unchanged.
- Nothing `building`/`discussing` → no builder race.
- No features untouched >30 days (oldest log activity 06-07 — 11 days ago).

## Standing items (no change from prior runs)
- **019 stays blocked** — needs a DB migration + Plaid account/env vars before
  there's a testable surface. 018 is queued right behind it.
- **011 proposed** — one-tap "go" moves it to the build queue; the builder has
  already pre-digested it.
- **Cleanup candidates (not the steward's to delete):** remote branches
  `claude/fix-task-categorization-j8nuy`, `claude/task-duplication-bug-Mrona`
  (pre-backlog, no PRs); merged `auto/*` leftovers still on remote.
