# Health — steward snapshot

_Last run: 2026-08-04 (steward). Overwritten each run; latest state only._

## Status counts (19 features)
- ✅ **shipped:** 16 — 001–010, 012–017 (all merged, #16–#29)
- 🤔 **proposed (your go/no-go):** 1 — 011 (search — overtaken; see below)
- 📥 **ready (builder's queue):** 1 — 018 (Finance tab, gated behind 019 by design)
- 🚧 **blocked (needs you):** 1 — 019 (Plaid→Chase sync; 4-table migration + Plaid account/env vars)
- 🏗 building / 💬 discussing / 👀 preview / 🔁 iterating: 0

**Waiting on you:** 2 (011 proposal + 019 unblock). **In flight:** 0. **Queued for builder:** 1.
**Shipped this week (loop):** 0 (last merge was #29 on 2026-06-10 — 55 days ago). **Shipped by hand:** 1 commit.

## Changed since last run

Four commits on `main` since yesterday's steward run (`c1876bc` → `68afd92`), 3 files, +35/−9.
Three are builder quiet-run doc commits (DISPATCHES + the README "Last run" line). One is real code:

- `24dfd79` — Day doc: text-sized caret beside pills (`components/day/TaskBlockView.tsx`, 16 lines).
  By hand, on the day doc, no backlog folder — same pattern flagged below.

`main` is in sync with `origin/main` (0/0). Working tree clean except the untracked `ios/` folder
(app code — left untouched). Six consecutive quiet builder runs now; nothing is eligible to build.

## Fixed this run
- **Nothing needed fixing.** Full re-audit against the current tree, all green:
  - All 19 folders have `spec.md` + `log.md`. All `Status:`/`Class:` values valid
    (16 shipped, 011 `proposed`, 018 `ready`, 019 `blocked`).
  - Every status agrees with GitHub (`gh pr list`): #16–#29 merged; **#13 is still the only
    open PR** (draft); 011/018/019 have no branch or PR, consistent with their statuses.
  - Dashboard ↔ folders 1:1 (001–019). No orphan folders, no orphan dashboard rows.
  - `LEARNINGS.md`: no dupes, **no contradictions** (nothing to supersede), no dead refs.
    Re-walked every referenced path — `lib/server-fetchers.ts`, `lib/validation/`, `lib/triage.ts`,
    `components/shared/ServerSWR.tsx`, `lib/hooks.ts`, `app/api/mcp/`, `next-themes` — all present.
    The 015 pre-paint learning still points at live code (`app/layout.tsx:60` sets `--task-basis`);
    that path now only serves `/classic`, but the learning is a general no-FOUC principle, so it
    stays as written.
  - Nothing `building`/`discussing` → no builder race. No `backlog/PAUSED`.
- Dashboard "Last run" line refreshed to this run.

## Needs John

- **🔴 `CLAUDE.md` still documents the view you retired — fourth run flagged, nothing changed.**
  The one thing on the board that can actively send the builder to the wrong file. Re-verified
  today against the tree; all four errors still stand:
  - Lines 65–67 "## Today page" describe the two-panel note-editor + task-sidebar layout. That is
    now `/classic` — `app/(main)/page.tsx` redirects `/` to `/day`, and `Sidebar.tsx`'s `navItems`
    links `/day`, `/vault`, `/backlog`, `/docs` — **`/classic` appears in no nav**. A builder told
    to "fix something on Today" edits the dead view.
  - Line 58 names `components/focus/*` as the Today page and cites **`TaskListPanel`, which does
    not exist** — the file is `components/focus/TaskSidebar.tsx`.
  - `components/day/*` (11 files, the app's largest surface) and the `/day` route are absent from
    "Key directories" entirely.
  - Line 15 says `/api/cron/*` runs on Node; there is no `app/api/cron/` (confirmed again today).

  Still left alone deliberately — `CLAUDE.md` is yours and sits outside `backlog/`. **One word and
  the next run patches all four.** Same for a `LEARNINGS.md` entry recording that the day doc is
  the Today surface — that's a preference, so it needs your ratification, not my guess.

- **🟡 The day doc keeps accruing real behavior with no folder.** `24dfd79` is the **10th hand
  commit on `components/day/*` in four days** (2026-08-01 → 08-03) — the whole surface, from
  `df9f9d4` "Add Day view" through the nav swap that made it Today, built outside the loop.
  Two of those commits reimplement carry-over for the day doc, which is what **004** and **014**
  already shipped for `NoteEditor`. Nothing wrong with the work; it just means the loop can't help
  with any of it, and the board understates what's live by an entire feature area.
  A single `/backlog` "day doc" folder — even seeded retroactively from `TODAY-DOC-VISION.md` —
  would give the builder somewhere to pick up the queued items below.

- **🟡 019's blocker is a migration — and you run migrations by hand anyway.** The only reason 019
  has sat `blocked` for 54 days is the loop's hard "never run a migration" rule. Re-verified today:
  no `PLAID_*` vars in `.env.local`, no `plaid` dependency in `package.json`, none of the four
  tables (`plaid_items`, `bank_accounts`, `bank_transactions`, `recurring_streams`). Write that
  migration the way you wrote the last two and 019 flips to `ready`, 018 unblocks behind it — two
  of your three standing items clear at once.

- **011 search — 58 days untouched and overtaken.** Its open question was "whole-app omnisearch vs.
  docs-only." Task search is answered: `keywords text[]`, keyword search in the picker and slash
  menu, `search_tasks` in MCP, hand-editable Tags in the task modal, plus the 7am enrichment
  routine. The honest remaining scope is **docs/notes search only**. Narrow it to that, or close it
  as absorbed — it shouldn't keep occupying a `proposed` slot.

- **Un-backlogged work still queued in `TODAY-DOC-VISION.md`.** Browse-all-tags view under My Tasks
  (needs a categories vs goals vs keywords taxonomy decision), more `/add` picker filters (due date,
  goal), Linear-style custom vault views, retiring auto-triage / `on_deck`, MCP doc read/write
  tools, in-doc context intelligence. `/backlog` each one you actually want the loop to pick up.

- **018 and 019 — 54 days since last `log.md` activity** (2026-06-11). Not neglect; both sit behind
  the same prerequisite. See the migration note.

- **[Draft PR #13](https://github.com/j0hnegan/today/pull/13) "Native iOS app shell (Capacitor) [WIP]"**
  (`feat/ios-capacitor`) — **65 days open** (since 2026-05-31), 1 commit ahead of main, no backlog
  folder. Options: **track it** (folder seeded from the PR description), **park it** (minimal
  folder, `status: blocked` — needs Xcode/signing), or **close it**. The untracked `ios/` folder
  correlates with this branch; left untouched, it's app code.

- **`feature/task-triage-v2`** — local branch, 1 commit (2026-06-21, **44 days**), no PR, no folder.
  The vision doc argues auto-triage should eventually go away entirely, which likely makes this
  branch moot — worth a look before investing in it. File a PR, `/backlog` it, or drop it.

- **`origin/claude/fix-task-categorization-j8nuy`** — old bug-fix branch (**95 days**, 2026-05-01),
  1 commit ahead of main, no PR ever filed. Previously diffed against `feature/task-triage-v2`:
  that branch is a much larger rewrite (163 files) including its own task-categorization changes,
  but not a clean superset — can't confirm it subsumes this one without a closer read.

## Healthy
- All 19 folders have `spec.md` + `log.md`; all `Status:`/`Class:` values valid.
- Every `Status:` agrees with GitHub. #13 is the only open PR (draft).
- Dashboard ↔ folders 1:1 (001–019). No orphans.
- `LEARNINGS.md` clean — no contradictions, no dead refs, no dupes. Unchanged since 2026-06-10.
- Nothing `building`/`discussing` → no builder race. No `backlog/PAUSED` kill switch.
- `main` in sync with `origin/main`.
- Active features last touched: 011 (58 days — flagged), 018 (54), 019 (54).

## Cleanup candidates (not the steward's to delete)
- Local branches `claude/wonderful-einstein`, `claude/wonderful-goodall`, `ios-app` —
  re-verified 0 commits ahead of main, safe to delete. `feat/responsive-mobile` shows 2 commits
  not on main by hash (upstream gone), previously verified as fully redundant (squash-merged as
  PR #12; both commits' changes already on main byte-for-byte) — safe.
- Remote `origin/claude/task-duplication-bug-Mrona` — 0 commits ahead of main, fully merged.
- Remote `origin/auto/005-step2b-code`, `origin/auto/014-carryover-empty-guard` — PRs merged
  (#28, #25), harmless squash-merge leftovers.
- Untracked `ios/` folder — Capacitor build artifact from `feat/ios-capacitor`.
