# Health — steward snapshot

_Last run: 2026-08-01 (steward). Overwritten each run; latest state only._

## Status counts (19 features)
- ✅ **shipped:** 16 — 001–010, 012–017 (all merged, #16–#29)
- 🤔 **proposed (your go/no-go):** 1 — 011 (search, scope is the open question)
- 📥 **ready (builder's queue):** 1 — 018 (Finance tab, gated behind 019 by design)
- 🚧 **blocked (needs you):** 1 — 019 (Plaid→Chase sync; 4-table migration + Plaid account/env vars)
- 🏗 building / 💬 discussing / 👀 preview / 🔁 iterating: 0

**Waiting on you:** 2 (011 proposal + 019 unblock). **In flight:** 0. **Queued for builder:** 1.
**Shipped this week:** 0 (last merge was #29 on 2026-06-10).

## Changed since last run
- **Board unchanged.** Since yesterday's steward run the builder logged two quiet cron runs
  (7-31 #1, #2) — no build, iterate, propose, or ship. No merges, no new branches, no new PRs.
- Yesterday's fix landed cleanly: the `LEARNINGS.md` + `README.md` edits are committed
  (cd2da10) and the working tree is clean apart from the untracked `ios/` folder. The
  "steward run ended without committing" problem from 7-30 did **not** recur.

## Fixed this run
- **Nothing needed fixing.** Full re-verification, all green:
  - All 19 folders have `spec.md` + `log.md`. All `Status:`/`Class:` values valid
    (16 shipped, 011 `proposed`, 018 `ready`, 019 `blocked`).
  - Every status agrees with GitHub (`gh pr list`): #16–#29 merged; **#13 is still the only
    open PR** (draft); 011/018/019 have no branch or PR, consistent with their statuses.
  - Dashboard ↔ folders 1:1 (001–019). No orphan folders, no orphan dashboard rows.
  - `LEARNINGS.md`: no dupes, **no contradictions** (nothing to supersede), no dead refs —
    re-checked `lib/server-fetchers.ts`, `lib/validation/*`, `lib/triage.ts`,
    `components/shared/ServerSWR.tsx`, `lib/hooks.ts`, `app/api/mcp/`, `next-themes`.
    Entry order chronological in every section after yesterday's fix.
  - Both `auto/*` remote branches map to shipped folders (005, 014). No `backlog/PAUSED`.
    Nothing `building`/`discussing` → no builder race.

## Needs John

_Nothing new this run — no push sent. Everything below is unchanged and carried forward._

- **011 search — 55 days untouched** (intake 2026-06-07, still only the original entry in
  `log.md`). Re-triage flag, not auto-close. Reply "go" for a Phase-1 pitch (docs/notes
  search box), narrow the scope, or park another cycle.

- **018 and 019 — 51 days since last `log.md` activity** (2026-06-11). Not neglect — both are
  blocked on the same known prerequisite. Re-verified this run: no `PLAID_*` vars in
  `.env.local`, newest migration is still `20260726000000_add_backlog_destination.sql`, so
  none of the four tables exist. 018 is gated behind 019 by design.

- **[Draft PR #13](https://github.com/j0hnegan/today/pull/13) "Native iOS app shell (Capacitor) [WIP]"**
  (`feat/ios-capacitor`) — **62 days open** (since 2026-05-31), 1 commit ahead of main, no
  backlog folder. Options: **track it** (backlog folder seeded from the PR description),
  **park it** (minimal folder, `status: blocked` — needs Xcode/signing), or **close it**.
  (The untracked `ios/` folder correlates with this branch — left untouched, it's app code.)

- **`feature/task-triage-v2`** — local branch, 1 commit (2026-06-21, **41 days**), no PR, no
  backlog folder. File a PR, create a folder via `/backlog`, or drop it if it was a one-off.

- **`origin/claude/fix-task-categorization-j8nuy`** — old bug-fix branch (~92 days,
  2026-05-01), 1 commit ahead of main, no PR ever filed. Previously diffed against
  `feature/task-triage-v2`: that branch is a much larger rewrite (163 files) that includes
  its own task-categorization changes plus migrations and tooling churn — not a clean
  superset, so it can't be confirmed to subsume this one without a closer read. Worth a
  look before closing either.

- **`CLAUDE.md` still has the dead `/api/cron/*` reference** (line 15: _"API routes run on the
  edge runtime, except `/api/cron/*` and `/api/mcp/*`"_). Re-verified: `app/api/` holds
  automation, cashflow, checkins, dates-with-content, docs, goals, mcp, notes, settings,
  tags, tasks, uploads — no `cron/`. Left alone deliberately: `CLAUDE.md` is yours and sits
  outside `backlog/`. One-line fix when you want it, or say the word and a future run takes it.

## Healthy
- All 19 folders have `spec.md` + `log.md`; all `Status:`/`Class:` values valid.
- Every `Status:` agrees with GitHub. #13 is the only open PR (draft).
- Dashboard ↔ folders 1:1 (001–019). No orphans.
- `LEARNINGS.md` clean — no contradictions, no dead refs, no dupes.
- Nothing `building`/`discussing` → no builder race. No `backlog/PAUSED` kill switch.
- Working tree clean apart from untracked `ios/` — clean branch-offs unblocked.
- Active features last touched: 011 (55 days — flagged), 018 (51), 019 (51).

## Cleanup candidates (not the steward's to delete)
- Local branches `claude/wonderful-einstein`, `claude/wonderful-goodall`, `ios-app` —
  re-verified 0 commits ahead of main, safe to delete. `feat/responsive-mobile` shows 2
  commits not on main by hash (upstream gone), previously verified as fully redundant
  (squash-merged as PR #12; both commits' changes already on main byte-for-byte) — safe.
- Remote `origin/claude/task-duplication-bug-Mrona` — 0 commits ahead of main, fully merged.
- Remote `origin/auto/005-step2b-code`, `origin/auto/014-carryover-empty-guard` — PRs merged
  (#28, #25), harmless leftovers.
- Untracked `ios/` folder — Capacitor build artifact from `feat/ios-capacitor`.
