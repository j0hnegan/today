# Health — steward snapshot

_Last run: 2026-08-03 (steward). Overwritten each run; latest state only._

## Status counts (19 features)
- ✅ **shipped:** 16 — 001–010, 012–017 (all merged, #16–#29)
- 🤔 **proposed (your go/no-go):** 1 — 011 (search — now clearly overtaken, see below)
- 📥 **ready (builder's queue):** 1 — 018 (Finance tab, gated behind 019 by design)
- 🚧 **blocked (needs you):** 1 — 019 (Plaid→Chase sync; 4-table migration + Plaid account/env vars)
- 🏗 building / 💬 discussing / 👀 preview / 🔁 iterating: 0

**Waiting on you:** 2 (011 proposal + 019 unblock). **In flight:** 0. **Queued for builder:** 1.
**Shipped this week (loop):** 0 (last merge was #29 on 2026-06-10). **Shipped by hand:** 4 commits.

## Changed since last run

Four commits on `main` since yesterday's steward run (`c6e36f4` → `feb9f02`), 7 files, +305/−16.
All day-doc polish, all by hand:

- `feb9f02` — carry-over now offered on **first open of a new day**, not just at midnight
  (the midnight watcher only fired in an already-open tab). "Start fresh" is remembered per day
  in localStorage.
- `4e83883` — hover menu follows the cursor; even pill-line spacing.
- `bab6b9d` — selection sweeps pills, text-sized caret.
- `8595a82` — collapsed **Tags** section in `TaskEditModal` for hand-editing search keywords.

**Keyword enrichment shipped as its own routine.** Last run flagged an un-backlogged vision-doc
item — a scheduled session enriching task keywords via MCP — and asked whether it belonged to
002's personal-agent routine. You answered it by shipping: `hush-keyword-enrichment` runs daily
at 7am and fills empty keyword lists via Supabase REST. Item closed, no backlog folder needed.

**Board otherwise unchanged.** No builder run since 2026-07-31; no new branches, PRs, or merges.
Working tree is clean except the untracked `ios/` folder — left untouched (app code).

## Fixed this run
- **Nothing needed fixing.** Re-verified the whole structure against the current tree, all green:
  - All 19 folders have `spec.md` + `log.md`. All `Status:`/`Class:` values valid
    (16 shipped, 011 `proposed`, 018 `ready`, 019 `blocked`).
  - Every status agrees with GitHub (`gh pr list`): #16–#29 merged; **#13 is still the only
    open PR** (draft); 011/018/019 have no branch or PR, consistent with their statuses.
  - Dashboard ↔ folders 1:1 (001–019). No orphan folders, no orphan dashboard rows.
  - `LEARNINGS.md`: no dupes, **no contradictions** (nothing to supersede), no dead refs.
    Re-walked every referenced path — `lib/server-fetchers.ts`, `lib/validation/*`,
    `lib/triage.ts`, `components/shared/ServerSWR.tsx`, `lib/hooks.ts`, `app/api/mcp/`,
    next-themes — all present. The 015 pre-paint learning still points at live code
    (`app/layout.tsx:61` sets `--task-basis`); that path now only serves `/classic`, but the
    learning is a general no-FOUC principle, so it stays as written.
  - Nothing `building`/`discussing` → no builder race. No `backlog/PAUSED`.

## Needs John

- **🔴 `CLAUDE.md` still documents the view you retired — third run flagged, nothing changed.**
  This is the one thing on the board that can actively send the builder to the wrong file, and it
  has now survived two escalations. Four concrete errors:
  - Line 65–67 "## Today page" describes the two-panel note-editor + task-sidebar layout. That is
    now `/classic`, **unlinked from nav**. A builder told to "fix something on Today" edits the dead view.
  - Line 58 names `components/focus/*` as the Today page and cites **`TaskListPanel`, which does
    not exist** — the file is `components/focus/TaskSidebar.tsx`.
  - `components/day/*` (11 files, the app's largest surface) and the `/day` route are absent from
    "Key directories" entirely.
  - Line 15 says `/api/cron/*` runs on Node; there is no `app/api/cron/` (confirmed again today).

  Still left alone deliberately — `CLAUDE.md` is yours and sits outside `backlog/`. **One word and
  the next run patches all four.** Same for a `LEARNINGS.md` entry recording that the day doc is
  the Today surface — that's a preference, so it needs your ratification, not my guess.

- **🟡 You are hand-rebuilding shipped loop features on the new surface.** `feb9f02` + `bab6b9d`
  reimplement day-doc carry-over — which is what **004** (carry over notes on a new day) and
  **014** (only prompt when the previous day has real notes) already shipped for `NoteEditor`.
  Nothing wrong with it, but it means the day doc is accumulating real behavior with no folder,
  no spec, and no log, so the loop can't help with any of it and the board understates what's live.
  A single `/backlog` "day doc" folder — even seeded retroactively from `TODAY-DOC-VISION.md` —
  would give the builder somewhere to pick up the queued items below.

- **🟡 019's blocker is a migration — and you keep running migrations by hand.** The only reason
  019 has sat `blocked` for 53 days is the loop's hard "never run a migration" rule. Re-verified
  today: still no `PLAID_*` vars in `.env.local`, and none of the four tables (`plaid_items`,
  `bank_accounts`, `bank_transactions`, `recurring_streams`) exist. Write that migration the way
  you wrote the last two and 019 flips to `ready`, 018 unblocks behind it — two of your three
  standing items clear at once.

- **011 search — 57 days untouched and overtaken.** Its open question was "whole-app omnisearch
  vs. docs-only." Task search is answered: `keywords text[]`, keyword search in the picker and
  slash menu, `search_tasks` in MCP, hand-editable Tags in the task modal, plus the 7am enrichment
  routine. The honest remaining scope is **docs/notes search only**. Narrow it to that, or close
  it as absorbed — it shouldn't keep occupying a `proposed` slot.

- **Un-backlogged work still queued in `TODAY-DOC-VISION.md`.** Today's additions: a browse-all-tags
  view under My Tasks (flagged there as needing a categories vs goals vs keywords taxonomy
  decision) and more `/add` picker filters (due date, goal). Still open from before: Linear-style
  custom vault views, retiring auto-triage / `on_deck`, MCP doc read/write tools, in-doc context
  intelligence. `/backlog` each one you actually want the loop to pick up.

- **018 and 019 — 53 days since last `log.md` activity** (2026-06-11). Not neglect; both sit
  behind the same prerequisite. See the migration note.

- **[Draft PR #13](https://github.com/j0hnegan/today/pull/13) "Native iOS app shell (Capacitor) [WIP]"**
  (`feat/ios-capacitor`) — **64 days open** (since 2026-05-31), 1 commit ahead of main, no backlog
  folder. Options: **track it** (folder seeded from the PR description), **park it** (minimal
  folder, `status: blocked` — needs Xcode/signing), or **close it**. The untracked `ios/` folder
  correlates with this branch; left untouched, it's app code.

- **`feature/task-triage-v2`** — local branch, 1 commit (2026-06-21, **43 days**), no PR, no folder.
  The vision doc argues auto-triage should eventually go away entirely, which likely makes this
  branch moot — worth a look before investing in it. File a PR, `/backlog` it, or drop it.

- **`origin/claude/fix-task-categorization-j8nuy`** — old bug-fix branch (~94 days, 2026-05-01),
  1 commit ahead of main, no PR ever filed. Previously diffed against `feature/task-triage-v2`:
  that branch is a much larger rewrite (163 files) including its own task-categorization changes,
  but not a clean superset — can't confirm it subsumes this one without a closer read.

## Healthy
- All 19 folders have `spec.md` + `log.md`; all `Status:`/`Class:` values valid.
- Every `Status:` agrees with GitHub. #13 is the only open PR (draft).
- Dashboard ↔ folders 1:1 (001–019). No orphans.
- `LEARNINGS.md` clean — no contradictions, no dead refs, no dupes.
- Nothing `building`/`discussing` → no builder race. No `backlog/PAUSED` kill switch.
- Active features last touched: 011 (57 days — flagged), 018 (53), 019 (53).

## Cleanup candidates (not the steward's to delete)
- Local branches `claude/wonderful-einstein`, `claude/wonderful-goodall`, `ios-app` —
  re-verified 0 commits ahead of main, safe to delete. `feat/responsive-mobile` shows 2 commits
  not on main by hash (upstream gone), previously verified as fully redundant (squash-merged as
  PR #12; both commits' changes already on main byte-for-byte) — safe.
- Remote `origin/claude/task-duplication-bug-Mrona` — 0 commits ahead of main, fully merged.
- Remote `origin/auto/005-step2b-code`, `origin/auto/014-carryover-empty-guard` — PRs merged
  (#28, #25), harmless squash-merge leftovers.
- Untracked `ios/` folder — Capacitor build artifact from `feat/ios-capacitor`.
