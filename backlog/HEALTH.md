# Health — steward snapshot

_Last run: 2026-08-09 (steward). Overwritten each run; latest state only._

## Status counts (19 features)
- ✅ **shipped:** 16 — 001–010, 012–017 (all merged, #16–#29)
- 🤔 **proposed (your go/no-go):** 1 — 011 (search — overtaken; see below)
- 📥 **ready (builder's queue):** 1 — 018 (Finance tab, gated behind 019 by design)
- 🚧 **blocked (needs you):** 1 — 019 (Plaid→Chase sync; 4-table migration + Plaid account/env vars)
- 🏗 building / 💬 discussing / 👀 preview / 🔁 iterating: 0

**Waiting on you:** 2 (011 proposal + 019 unblock). **In flight:** 0. **Queued for builder:** 1.
**Shipped this week (loop):** 0 (last merge was #29 on 2026-06-10 — 60 days ago). **Shipped by hand:** 0 this run.

## Changed since last run

**Nothing. Zero commits** — `git log cd2972c..origin/main` is empty. No builder run, no hand commit,
no branch movement since yesterday's run. `main` is in sync with `origin/main` (0/0); working tree
clean except the untracked `ios/` folder (app code — left untouched). Sixth straight day the board
hasn't moved.

Everything below is a re-verification against the live tree, not a new finding.

## Fixed this run
- **Nothing needed fixing.** Full re-audit, all green:
  - All 19 folders have `spec.md` + `log.md`. All `Status:`/`Class:` values valid
    (16 shipped, 011 `proposed`, 018 `ready`, 019 `blocked`).
  - Every status agrees with GitHub (`gh pr list`): #16–#29 merged; **#13 is still the only
    open PR** (draft, untouched since 2026-05-31); 011/018/019 have no branch or PR, consistent
    with their statuses.
  - Dashboard ↔ folders 1:1 (001–019). No orphan folders, no orphan dashboard rows.
  - `LEARNINGS.md`: no dupes, **no contradictions** (nothing to supersede), no dead refs.
    Re-walked every path it references today — `lib/server-fetchers.ts`, `lib/validation/`,
    `app/api/mcp/` — all present. Content unchanged since the 2026-06-10 entries; file last
    touched 2026-07-31 (steward formatting pass, no entries added or altered).
  - Nothing `building`/`discussing` → no builder race. No `backlog/PAUSED`.
- Dashboard "Last run" line refreshed to this run.

## Needs John

Two items are yours to decide and clear the whole board; the rest is bookkeeping.

- **🔴 `CLAUDE.md` still documents the view you retired — ninth run flagged, nothing changed.**
  The one thing on the board that can actively send the builder to the wrong file. Re-verified
  against the tree today; all four errors still stand:
  - The "## Today page" section describes the two-panel note-editor + task-sidebar layout. That is
    now `/classic` — `app/(main)/page.tsx` redirects `/` to `/day` (its own comment says "The Day
    doc is the Today view now"), and `Sidebar.tsx`'s `navItems` link only `/day`, `/vault`,
    `/backlog`, `/docs` — **`/classic` appears in no nav**. A builder told to "fix something on
    Today" edits the dead view.
  - "Key directories" names `components/focus/*` as the Today page and cites **`TaskListPanel`,
    which does not exist** — confirmed again today; the file is `components/focus/TaskSidebar.tsx`.
  - `components/day/*` (the app's largest surface) and the `/day` route are absent from
    "Key directories" entirely.
  - It says `/api/cron/*` runs on Node; there is no `app/api/cron/` (confirmed again today).

  Still left alone deliberately — `CLAUDE.md` is yours and sits outside `backlog/`, and rewriting
  your instruction file on my own is the exact thing the playbook tells me not to do. **One word
  and the next run patches all four.** Same for a `LEARNINGS.md` entry recording that the day doc
  is the Today surface — that's a preference, so it needs your ratification, not my guess.

- **🟡 019's blocker is a migration — and you run migrations by hand anyway.** The only reason 019
  has sat `blocked` for 59 days is the loop's hard "never run a migration" rule. Re-verified today:
  no `PLAID_*` vars, no `plaid` dependency in `package.json`, none of the four tables
  (`plaid_items`, `bank_accounts`, `bank_transactions`, `recurring_streams`) — newest migration is
  still `20260802000000_enable_realtime_documents.sql`. Write that migration the way you wrote the
  last two and 019 flips to `ready`, 018 unblocks behind it — **two of your three standing items
  clear at once.**

- **011 search — 63 days untouched and overtaken.** Its open question was "whole-app omnisearch vs.
  docs-only." Task search is answered: `keywords text[]`, keyword search in the picker and slash
  menu, `search_tasks` in MCP, hand-editable Tags in the task modal, plus the 7am enrichment
  routine. The honest remaining scope is **docs/notes search only**. Narrow it to that, or close it
  as absorbed — it shouldn't keep occupying a `proposed` slot.

- **🟡 The day doc still has no backlog folder.** `components/day/*` is 13 commits deep since
  2026-08-01 (last touched 2026-08-05) with no folder, and it edits loop-owned shared code
  (`components/shared/LongPressCheck.tsx`, the component **001** extracted), plus two commits
  reimplementing carry-over that **004** and **014** already shipped for `NoteEditor`. Nothing wrong
  with the work — it means the loop can't help with any of it and the board understates what's live
  by an entire feature area. A single `/backlog` "day doc" folder, even seeded retroactively from
  `TODAY-DOC-VISION.md`, would fix that.

- **Un-backlogged work still queued in `TODAY-DOC-VISION.md`.** Browse-all-tags view under My Tasks
  (needs a categories vs goals vs keywords taxonomy decision), more `/add` picker filters (due date,
  goal), Linear-style custom vault views, retiring auto-triage / `on_deck`, MCP doc read/write
  tools, in-doc context intelligence. `/backlog` each one you actually want the loop to pick up.

## Stale — re-triage? (>30 days, not auto-closed)

| Item | Untouched | Note |
|---|---|---|
| 011 search | 63 days | Overtaken — narrow to docs-only or close (above) |
| 018 finance tab | 59 days | Not neglect — gated on 019 by design |
| 019 Plaid sync | 59 days | Blocked on the migration (above) |
| [Draft PR #13](https://github.com/j0hnegan/today/pull/13) iOS shell | 70 days | `feat/ios-capacitor`, 1 commit ahead, no folder. **Track** (seed a folder from the PR body), **park** (folder, `status: blocked` — needs Xcode/signing), or **close**. The untracked `ios/` folder correlates with this branch. |
| `feature/task-triage-v2` | 49 days | Local branch, 1 commit, no PR, no folder. The vision doc argues auto-triage should go away entirely, which likely makes it moot — look before investing. File a PR, `/backlog` it, or drop it. |
| `origin/claude/fix-task-categorization-j8nuy` | 100 days | 1 commit ahead, no PR ever filed. Previously diffed against `feature/task-triage-v2`: that branch is a much larger rewrite (163 files) with its own categorization changes, but not a clean superset — can't confirm it subsumes this one without a closer read. |

## Healthy
- All 19 folders have `spec.md` + `log.md`; all `Status:`/`Class:` values valid.
- Every `Status:` agrees with GitHub. #13 is the only open PR (draft).
- Dashboard ↔ folders 1:1 (001–019). No orphans.
- `LEARNINGS.md` clean — no contradictions, no dead refs, no dupes.
- Nothing `building`/`discussing` → no builder race. No `backlog/PAUSED` kill switch.
- `main` in sync with `origin/main`.

## Cleanup candidates (not the steward's to delete)
- Local branches `claude/wonderful-einstein`, `claude/wonderful-goodall`, `ios-app` —
  re-verified 0 commits ahead of main, safe to delete. `feat/responsive-mobile` shows 2 commits
  not on main by hash (upstream gone), previously verified as fully redundant (squash-merged as
  PR #12; both commits' changes already on main byte-for-byte) — safe.
- Remote `origin/claude/task-duplication-bug-Mrona` — 0 commits ahead of main, fully merged.
- Remote `origin/auto/005-step2b-code`, `origin/auto/014-carryover-empty-guard` — PRs merged
  (#28, #25), harmless squash-merge leftovers.
- Untracked `ios/` folder — Capacitor build artifact from `feat/ios-capacitor`.
