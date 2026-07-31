# Health — steward snapshot

_Last run: 2026-07-31 (steward). Overwritten each run; latest state only._

## Status counts (19 features)
- ✅ **shipped:** 16 — 001–010, 012–017 (all merged, #16–#29)
- 🤔 **proposed (your go/no-go):** 1 — 011 (search, scope is the open question)
- 📥 **ready (builder's queue):** 1 — 018 (Finance tab, gated behind 019 by design)
- 🚧 **blocked (needs you):** 1 — 019 (Plaid→Chase sync; 4-table migration + Plaid account/env vars)
- 🏗 building / 💬 discussing / 👀 preview / 🔁 iterating: 0

**Waiting on you:** 2 (011 proposal + 019 unblock). **In flight:** 0. **Queued for builder:** 1.
**Shipped this week:** 0 (last merge was #29 on 2026-06-10).

## Changed since last run
- **Board unchanged.** Since the last steward run (2026-07-30) the builder logged two quiet
  cron runs (7-30 #1, #2) — no build, iterate, propose, or ship. No merges since #29, no new
  branches or PRs.
- **One thing was off:** yesterday's steward edits to `LEARNINGS.md` and `README.md` were
  left **uncommitted** in the working tree — the two builder runs that followed committed
  around them, so the fixes never landed. Verified them as still correct and committed them
  this run (details below). Worth knowing that a steward run can end without committing.

## Fixed this run
- **Landed the pending `LEARNINGS.md` fixes** (written 2026-07-30, uncommitted until now):
  - Dead reference removed — the Zod/edge-runtime entry claimed API routes run Node for
    `/api/cron/*` **and** `/api/mcp/*`. Re-verified: `app/api/cron/` **does not exist**
    (`app/api/` holds automation, cashflow, checkins, dates-with-content, docs, goals, mcp,
    notes, settings, tags, tasks, uploads). Entry now names only `/api/mcp/*`. Mechanical.
  - Entry order — the 2026-06-10 FOUC/CSS-var entry sat above the 2026-06-07 entries in
    "Code patterns"; moved to chronological order like every other section. Formatting only,
    no wording touched.
- Nothing else mechanical to fix. Re-verified end to end this run: all 19 folders have
  `spec.md` + `log.md`; all `Status:`/`Class:` values valid (16 shipped, 011 proposed,
  018 ready, 019 blocked) and all agree with `gh pr list` — #16–#29 merged, **#13 remains the
  only open PR (still DRAFT)**, no state changes since #29. Dashboard ↔ folders 1:1
  (001–019), no orphans. LEARNINGS refs live (`lib/server-fetchers.ts`, `lib/validation/*`,
  `lib/supabase-{browser,server}.ts`, `lib/triage.ts` all present); no dupes, **no
  contradictions** — nothing to supersede. Both `auto/*` remote branches map to shipped
  folders (005, 014). No `backlog/PAUSED`. Nothing `building`/`discussing` → no builder race.

## Needs John

### New this run
- **`CLAUDE.md` has the same dead `/api/cron/*` reference** the learnings entry had (under
  "Tech Stack": _"API routes run on the edge runtime, except `/api/cron/*` and `/api/mcp/*`"_).
  Same verified fact — that route group is gone. Left it alone deliberately: `CLAUDE.md` is
  yours and sits outside `backlog/`, so it's not the steward's to rewrite. One-line fix when
  you want it, or say the word and a future run can take it.

### Standing (unchanged from prior runs — no push sent; nothing new)

- **011 search — 54 days untouched** (intake 2026-06-07, still only the original entry in
  `log.md`). Re-triage flag, not auto-close. Reply "go" for a Phase-1 pitch (docs/notes
  search), narrow the scope, or park another cycle.

- **018 and 019 — 50 days since last `log.md` activity** (2026-06-11). Not neglect — both are
  actively blocked on the same known prerequisite (019 needs the Plaid account + 4-table
  migration; 018 is gated behind 019 by design). No new information this run; flagging
  continues per the stale-item rule.

- **[Draft PR #13](https://github.com/j0hnegan/today/pull/13) "Native iOS app shell (Capacitor) [WIP]"**
  (`feat/ios-capacitor`) — **61 days open** (since 2026-05-31), 1 commit ahead of main. No
  backlog folder. Three options:
  1. **Track it** — create a backlog folder seeded from the PR description.
  2. **Park it** — minimal folder, `status: blocked` (needs Xcode/signing to proceed).
  3. **Close it** — close the PR if on indefinite hold.
  (The untracked `ios/` folder in the working tree correlates with this branch — left
  untouched; it's app code, not backlog's to touch.)

- **`feature/task-triage-v2`** — local branch, 1 commit (2026-06-21, **40 days**), no PR filed,
  no backlog folder. Options: file a PR, create a backlog folder via `/backlog`, or merge/close
  if it was a one-off.

- **`origin/claude/fix-task-categorization-j8nuy`** — old bug-fix branch (~91 days,
  2026-05-01), 1 commit ahead of main, no PR ever filed. Previously diffed against
  `feature/task-triage-v2`: the latter is a much larger rewrite (163 files touched) that
  includes its own task-categorization changes plus migrations, config, and tooling churn —
  not a clean superset, so can't confirm it fully subsumes the older branch without a closer
  read. Worth a look before closing either.

## Healthy
- All 19 folders have `spec.md` + `log.md`. All `Status:`/`Class:` values valid.
- Every `Status:` agrees with GitHub: #16–#29 merged → shipped; 011/018/019 have no
  branch/PR → consistent. #13 is the only open PR (draft).
- Dashboard ↔ folders are 1:1 (001–019). No orphans.
- LEARNINGS.md clean after this run's fixes — no contradictions, no dead refs, no dupes.
- Nothing `building`/`discussing` → no builder race.
- No `backlog/PAUSED` kill switch present.
- Working tree clean after this commit (only untracked `ios/`) — clean branch-offs unblocked.
- Active features last touched: 011 (54 days — flagged above), 018 (50), 019 (50).

## Cleanup candidates (not the steward's to delete)
- Local branches `claude/wonderful-einstein`, `claude/wonderful-goodall`, `ios-app` — re-verified
  0 commits ahead of main, safe to delete. `feat/responsive-mobile` shows 2 commits by hash not
  on main (upstream gone), previously verified: content is fully redundant (squash-merged as
  PR #12; both remaining commits' changes are already present on main byte-for-byte) — safe to delete.
- Remote branch `origin/claude/task-duplication-bug-Mrona` — re-verified 0 commits ahead of main,
  fully merged. Safe to delete.
- Remote stale `origin/auto/005-step2b-code`, `origin/auto/014-carryover-empty-guard` — PRs
  merged (#28, #25), harmless leftovers.
- Untracked `ios/` folder in working tree — Capacitor build artifact from `feat/ios-capacitor`.
