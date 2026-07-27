# Health — steward snapshot

_Last run: 2026-07-27 (steward). Overwritten each run; latest state only._

## Status counts (19 features)
- ✅ **shipped:** 16 — 001–010, 012–017 (all merged, #16–#29)
- 🤔 **proposed (your go/no-go):** 1 — 011 (search, scope is the open question)
- 📥 **ready (builder's queue):** 1 — 018 (Finance tab, gated behind 019 by design)
- 🚧 **blocked (needs you):** 1 — 019 (Plaid→Chase sync; 4-table migration + Plaid account/env vars)
- 🏗 building / 💬 discussing / 👀 preview / 🔁 iterating: 0

**Waiting on you:** 2 (011 proposal + 019 unblock). **In flight:** 0. **Queued for builder:** 1.
**Shipped this week:** 0 (last merge was #29 on 2026-06-10).

## Fixed this run
- Nothing to fix. Board byte-for-byte unchanged since the 2026-07-26 #2 steward pass.
  Since then only today's builder quiet run (`f8912d9`) touched docs (DISPATCHES +
  README "Last run" line) — no board change. Re-verified: all 19 folders still have
  `spec.md` + `log.md`; all `Status:` values valid (16 shipped, 011 proposed, 018
  ready, 019 blocked) and all agree with `gh pr list` (#13 remains the only open PR,
  still DRAFT — no new PRs, no state changes since #29). LEARNINGS.md re-checked —
  refs confirmed live (`lib/server-fetchers.ts`, `lib/validation/` present), no dupes,
  no contradictions; unchanged since 2026-06-10. No `backlog/PAUSED` kill switch.
  Refreshed the dashboard "Last run" line only.

## Observation this run (not the steward's to touch)
- The working tree still holds **uncommitted app-code WIP from a live session** — a
  new in-app "backlog view" (`components/views/BacklogView.tsx`, `app/(main)/backlog/`,
  `supabase/migrations/20260726000000_add_backlog_destination.sql`, plus edits across
  ~18 tracked files) and the untracked `ios/` folder. Left entirely untouched — app
  code is never the steward's to edit, and an active edit session must not be raced.
  No backlog folder exists for it yet; if it graduates to real work, run `/backlog`
  to give it a folder. Heads-up (from the builder's dispatch too): a dirty `main`
  blocks clean branch-offs, so commit or stash it when convenient. Flagging only.

## Needs John

### Standing (unchanged from prior runs — no push sent; nothing new this cycle)

- **011 search — 50 days untouched** (intake 2026-06-07, still only the original
  entry in `log.md`). Re-triage flag, not auto-close. Reply "go" for a Phase-1
  pitch (docs/notes search), narrow the scope, or park another cycle.

- **018 and 019 — 46 days since last `log.md` activity** (2026-06-11). Not neglect —
  both are actively blocked on the same known prerequisite (019 needs the Plaid
  account + 4-table migration; 018 is gated behind 019 by design). No new
  information this run; flagging continues per the stale-item rule.

- **[Draft PR #13](https://github.com/j0hnegan/today/pull/13) "Native iOS app shell (Capacitor) [WIP]"**
  (`feat/ios-capacitor`) — **57 days open** (since 2026-05-31). No backlog folder. Three options:
  1. **Track it** — create a backlog folder seeded from the PR description.
  2. **Park it** — minimal folder, `status: blocked` (needs Xcode/signing to proceed).
  3. **Close it** — close the PR if on indefinite hold.
  (The untracked `ios/` folder in the working tree correlates with this branch and
  the live WIP above — left untouched; it's app code, not backlog's to touch.)

- **`feature/task-triage-v2`** — local branch, 1 commit (2026-06-21, 36 days), no PR filed, no backlog folder. Options: file a PR, create a backlog folder via `/backlog`, or merge/close if it was a one-off.

- **`origin/claude/fix-task-categorization-j8nuy`** — old bug-fix branch (~87 days, 2026-05-01), 1 commit ahead of main, no PR ever filed. Previously diffed against `feature/task-triage-v2`: the latter is a much larger rewrite (163 files touched) that includes its own task-categorization changes plus migrations, config, and tooling churn — not a clean superset, so can't confirm it fully subsumes the older branch without a closer read. Worth a look before closing either.

## Healthy
- All 19 folders have `spec.md` + `log.md`. All `Status:`/`Class:` values valid.
- Every `Status:` agrees with GitHub: #16–#29 merged → shipped; 011/018/019 have no branch/PR → consistent.
- Dashboard ↔ folders are 1:1 (001–019). No orphans.
- LEARNINGS.md clean — no contradictions, no dead refs, no dupes. Unchanged since 2026-06-10.
- Nothing `building`/`discussing` → no builder race.
- No `backlog/PAUSED` kill switch present.
- Active features last touched: 011 (50 days — flagged above), 018 (46 days), 019 (46 days).

## Cleanup candidates (not the steward's to delete)
- Local branches `claude/wonderful-einstein`, `claude/wonderful-goodall`, `ios-app` — zero commits ahead of main, safe to delete. `feat/responsive-mobile` shows 2 commits by hash not on main (upstream gone), previously verified: content is fully redundant (squash-merged as PR #12; both remaining commits' changes are already present on main byte-for-byte) — safe to delete.
- Remote branch `origin/claude/task-duplication-bug-Mrona` — previously verified: 0 commits ahead of main, fully merged. Safe to delete.
- Remote stale `origin/auto/005-step2b-code`, `origin/auto/014-carryover-empty-guard` — PRs merged (#28, #25), harmless leftovers.
- Untracked `ios/` folder in working tree — Capacitor build artifact from `feat/ios-capacitor` / live WIP.
