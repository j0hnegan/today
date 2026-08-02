# Health — steward snapshot

_Last run: 2026-08-02 (steward). Overwritten each run; latest state only._

## Status counts (19 features)
- ✅ **shipped:** 16 — 001–010, 012–017 (all merged, #16–#29)
- 🤔 **proposed (your go/no-go):** 1 — 011 (search — see the re-triage note, it's now clearly overtaken)
- 📥 **ready (builder's queue):** 1 — 018 (Finance tab, gated behind 019 by design)
- 🚧 **blocked (needs you):** 1 — 019 (Plaid→Chase sync; 4-table migration + Plaid account/env vars)
- 🏗 building / 💬 discussing / 👀 preview / 🔁 iterating: 0

**Waiting on you:** 2 (011 proposal + 019 unblock). **In flight:** 0. **Queued for builder:** 1.
**Shipped this week (loop):** 0 (last merge was #29 on 2026-06-10). **Shipped by hand:** 5 commits of Day-doc work.

## Changed since last run

**You promoted the Day doc to the main Today view.** Five commits on `main` since yesterday's
steward run (`f1b8095` → `70ccb79`), 19 files, +664/−161:

- `70ccb79` — **the nav swap**: `app/(main)/page.tsx` is now a `redirect("/day")`, and the original
  two-panel Today page (`PagePanel` + `NoteEditor` + `TaskSidebar`) is stashed at
  `app/(main)/classic/page.tsx`, **unlinked from the nav**. Plus pill interactions.
- `06b1f86` — live cross-device sync for the day doc (`useDayDocRealtime.ts`).
- `66b7f4b` / `21bc7a6` — inline task pills, multi-select bar, caret + save-loss fixes.
- `f1b8095` — keyword search, bulk + dynamic slash commands.

**Two migrations were authored and run by hand:** `20260801000000_add_task_keywords.sql`
(hidden `keywords text[]` on tasks) and `20260802000000_enable_realtime_documents.sql`.
No rule broken — the "never run a migration" rule binds the loops, not you — but see the 019 note below.

**Board otherwise unchanged.** No builder run since 2026-07-31; no new branches, PRs, or merges.
Working tree has your in-progress `components/vault/TaskEditModal.tsx` edit and the untracked
`ios/` folder — both left untouched (app code).

## Fixed this run
- **Nothing needed fixing.** Re-verified everything against the post-swap tree, all green:
  - All 19 folders have `spec.md` + `log.md`. All `Status:`/`Class:` values valid
    (16 shipped, 011 `proposed`, 018 `ready`, 019 `blocked`).
  - Every status still agrees with GitHub (`gh pr list`): #16–#29 merged; **#13 is still the
    only open PR** (draft); 011/018/019 have no branch or PR, consistent with their statuses.
  - Dashboard ↔ folders 1:1 (001–019). No orphan folders, no orphan dashboard rows.
  - `LEARNINGS.md`: no dupes, **no contradictions** (nothing to supersede), no dead refs.
    Re-checked every referenced path — `lib/server-fetchers.ts`, `lib/validation/*`,
    `lib/triage.ts`, `components/shared/ServerSWR.tsx`, `lib/hooks.ts`, `app/api/mcp/`,
    next-themes all still present. The 015 pre-paint `--task-basis` learning still points at
    live code (`app/layout.tsx:61`, `components/focus/PagePanel.tsx`) — that code now only
    serves `/classic`, but the learning is a general no-FOUC principle, so it stays as-is.
  - Nothing `building`/`discussing` → no builder race. No `backlog/PAUSED`.

## Needs John

_One item escalated hard this run (CLAUDE.md now actively misleads the builder). Everything else carried forward._

- **🔴 `CLAUDE.md` now documents a view you retired — this can send the builder to the wrong file.**
  This stopped being cosmetic when `/` became a redirect. Three concrete problems:
  - Line 65–67 "## Today page" describes the two-panel note-editor + task-sidebar layout. That is
    now `/classic`, **unlinked**. A builder told to "fix something on Today" will edit the dead view.
  - Line 58 names `components/focus/*` as the Today page and cites **`TaskListPanel`, which does not
    exist** (the file is `components/focus/TaskSidebar.tsx`). Dead ref, predates the swap.
  - `components/day/*` and the `/day` route are still absent from "Key directories" entirely — the
    app's largest surface is invisible to anyone reading the project doc.
  - Line 15 still says `/api/cron/*` runs on Node; there is no `app/api/cron/`. (Carried from prior runs.)

  Left alone deliberately — `CLAUDE.md` is yours and sits outside `backlog/`. **Say the word and the
  next run patches all four.** Same for a matching `LEARNINGS.md` entry recording that the day doc
  is the Today surface — that's a preference, so it needs your ratification, not my guess.

- **🟡 019's blocker is a migration — and you just ran two by hand.** The only reason 019 has sat
  `blocked` for 52 days is the loop's hard "never run a migration" rule. You authored and ran
  `add_task_keywords` and `enable_realtime_documents` yourself in the last two days, so the
  mechanism clearly isn't the obstacle. Re-verified this run: still no `PLAID_*` vars in
  `.env.local`, and none of the four tables (`plaid_items`, `bank_accounts`, `bank_transactions`,
  `recurring_streams`) exist. If you write that migration the same way, 019 flips to `ready` and
  018 unblocks behind it — two of your three standing items clear at once.

- **011 search — 56 days untouched, and now clearly overtaken.** Yesterday's flag was that `/add`
  did substring search. Since then you shipped a `keywords text[]` column, keyword search in the
  picker and slash menu, and `search_tasks` over it in MCP. 011's open question was "whole-app
  omnisearch vs. docs-only" — task search is answered. The honest remaining scope is
  **docs/notes search only**. Suggest: narrow it to that, or close it as absorbed. It shouldn't
  keep occupying a `proposed` slot asking a question that's been answered around it.

- **`/day` still has no backlog folder, and the vision doc keeps growing un-backlogged work.**
  `TODAY-DOC-VISION.md` gained a new item this run: a **scheduled Claude session that enriches task
  keywords via MCP `update_task`** (the doc notes the app has no Anthropic API key, so enrichment
  runs as an out-of-app routine). That overlaps **002-agentic-task-research**, which is marked
  `shipped` as the personal-agent routine — worth deciding whether keyword enrichment is a job for
  that existing routine or its own item. Still un-backlogged from before: Linear-style custom vault
  views, retiring auto-triage / `on_deck`, MCP doc read/write tools, in-doc context intelligence.
  `/backlog` each one you actually want the loop to pick up.

- **018 and 019 — 52 days since last `log.md` activity** (2026-06-11). Not neglect; both sit behind
  the same prerequisite. See the migration note above.

- **[Draft PR #13](https://github.com/j0hnegan/today/pull/13) "Native iOS app shell (Capacitor) [WIP]"**
  (`feat/ios-capacitor`) — **63 days open** (since 2026-05-31), 1 commit ahead of main, no backlog
  folder. Options: **track it** (folder seeded from the PR description), **park it** (minimal folder,
  `status: blocked` — needs Xcode/signing), or **close it**. The untracked `ios/` folder correlates
  with this branch; left untouched, it's app code.

- **`feature/task-triage-v2`** — local branch, 1 commit (2026-06-21, **42 days**), no PR, no folder.
  The vision doc argues auto-triage should eventually go away entirely, which likely makes this
  branch moot — worth a look before investing in it. File a PR, `/backlog` it, or drop it.

- **`origin/claude/fix-task-categorization-j8nuy`** — old bug-fix branch (~93 days, 2026-05-01),
  1 commit ahead of main, no PR ever filed. Previously diffed against `feature/task-triage-v2`:
  that branch is a much larger rewrite (163 files) including its own task-categorization changes,
  but not a clean superset — can't confirm it subsumes this one without a closer read. Worth a
  look before closing either.

## Healthy
- All 19 folders have `spec.md` + `log.md`; all `Status:`/`Class:` values valid.
- Every `Status:` agrees with GitHub. #13 is the only open PR (draft).
- Dashboard ↔ folders 1:1 (001–019). No orphans.
- `LEARNINGS.md` clean — no contradictions, no dead refs, no dupes.
- Nothing `building`/`discussing` → no builder race. No `backlog/PAUSED` kill switch.
- Active features last touched: 011 (56 days — flagged), 018 (52), 019 (52).

## Cleanup candidates (not the steward's to delete)
- Local branches `claude/wonderful-einstein`, `claude/wonderful-goodall`, `ios-app` —
  re-verified 0 commits ahead of main, safe to delete. `feat/responsive-mobile` shows 2 commits
  not on main by hash (upstream gone), previously verified as fully redundant (squash-merged as
  PR #12; both commits' changes already on main byte-for-byte) — safe.
- Remote `origin/claude/task-duplication-bug-Mrona` — 0 commits ahead of main, fully merged.
- Remote `origin/auto/005-step2b-code`, `origin/auto/014-carryover-empty-guard` — PRs merged
  (#28, #25), harmless squash-merge leftovers.
- Untracked `ios/` folder — Capacitor build artifact from `feat/ios-capacitor`.
