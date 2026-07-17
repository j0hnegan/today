# Health — steward snapshot

_Last run: 2026-07-17 (steward, daily). Overwritten each run; latest state only._

## Status counts (19 features)
- ✅ **shipped:** 16 — 001–010, 012–017 (all merged, #16–#29)
- 🤔 **proposed (your go/no-go):** 1 — 011 (search, scope is the open question)
- 📥 **ready (builder's queue):** 1 — 018 (Finance tab, gated behind 019 by design)
- 🚧 **blocked (needs you):** 1 — 019 (Plaid→Chase sync; 4-table migration + Plaid account/env vars)
- 🏗 building / 💬 discussing / 👀 preview / 🔁 iterating: 0

**Waiting on you:** 2 (011 proposal + 019 unblock). **In flight:** 0. **Queued for builder:** 1.

## Fixed this run
- Nothing to fix. Only builder activity since the 2026-07-16 evening steward run
  (82421cf) was one "quiet run" commit (503b110), touching only `DISPATCHES.md` +
  README's "Last run" line — no backlog structure or app code changed.
  Re-verified: all 19 folders still have `spec.md` + `log.md`, all `Status:`/`Class:`
  values still valid, all still agree with `gh pr list` (no new PRs, no state
  changes on #13). LEARNINGS.md re-checked — still no dead refs
  (`lib/server-fetchers.ts` and `lib/validation/` both exist on disk), no dupes, no
  contradictions, unchanged since 2026-06-10. Refreshed the dashboard "Last run"
  line only.

## Needs John

### Standing (unchanged from prior runs)

- **011 search — 40 days untouched** (intake 2026-06-07, still only the original
  entry in `log.md`). Re-triage flag, not auto-close. Reply "go" for a Phase-1
  pitch (docs/notes search), narrow scope, or park another cycle.

- **018 and 019 — 36 days since last `log.md` activity** (2026-06-11). Not neglect —
  both are actively blocked on the same known prerequisite (019 needs the Plaid
  account + 4-table migration; 018 is gated behind 019 by design). No new
  information this run; flagging continues per the stale-item rule.

- **[Draft PR #13](https://github.com/j0hnegan/today/pull/13) "Native iOS app shell (Capacitor) [WIP]"**
  (`feat/ios-capacitor`) — **47 days open** (since 2026-05-31). No backlog folder. Three options:
  1. **Track it** — create a backlog folder seeded from the PR description.
  2. **Park it** — minimal folder, `status: blocked` (needs Xcode/signing to proceed).
  3. **Close it** — close the PR if on indefinite hold.
  (Note: the working tree has an untracked `ios/` build-artifact folder that
  correlates with this branch — left untouched, it's app code, not backlog's to touch.)

- **`feature/task-triage-v2`** — local branch, 1 commit (2026-06-21), no PR filed, no backlog folder. Options: file a PR, create a backlog folder via `/backlog`, or merge/close if it was a one-off.

- **`origin/claude/fix-task-categorization-j8nuy`** — old bug-fix branch (~77 days, 2026-05-01), 1 commit ahead of main, no PR ever filed. Previously diffed against `feature/task-triage-v2`: the latter is a much larger rewrite (163 files touched) that includes its own task-categorization changes plus migrations, config, and tooling churn — not a clean superset, so can't confirm it fully subsumes the older branch without a closer read. Worth a look before closing either.

- **019 Plaid→Chase sync stays blocked** — needs 4-table migration + Plaid account + env vars. 018 Finance tab queued right behind it.

## Healthy
- All 19 folders have `spec.md` + `log.md`. All `Status:`/`Class:` values valid.
- Every `Status:` agrees with GitHub: #16–#29 merged → shipped; 011/018/019 have no branch/PR → consistent.
- Dashboard ↔ folders are 1:1 (001–019). No orphans.
- LEARNINGS.md clean — no contradictions, no dead refs, no dupes. Unchanged since 2026-06-10.
- Nothing `building`/`discussing` → no builder race.
- No `backlog/PAUSED` kill switch present.
- Active features last touched: 011 (40 days — flagged above), 018 (36 days), 019 (36 days).

## Cleanup candidates (not the steward's to delete)
- Local branches `claude/wonderful-einstein`, `claude/wonderful-goodall`, `ios-app` — zero commits ahead of main, safe to delete. `feat/responsive-mobile` shows 1 commit by hash not on main (upstream gone), previously verified: content is fully redundant (squash-merged as PR #12; the lone remaining commit's fix is already present on main byte-for-byte) — safe to delete.
- Remote branch `origin/claude/task-duplication-bug-Mrona` — previously verified: 0 commits ahead of main, fully merged. Safe to delete.
- Remote stale `origin/auto/005-step2b-code`, `origin/auto/014-carryover-empty-guard` — PRs merged, harmless leftovers.
- Untracked `ios/` folder in working tree — Capacitor build artifact from `feat/ios-capacitor`.
