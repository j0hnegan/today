# Health — steward snapshot

_Last run: 2026-08-01 (steward, 2nd run today). Overwritten each run; latest state only._

## Status counts (19 features)
- ✅ **shipped:** 16 — 001–010, 012–017 (all merged, #16–#29)
- 🤔 **proposed (your go/no-go):** 1 — 011 (search, scope is the open question)
- 📥 **ready (builder's queue):** 1 — 018 (Finance tab, gated behind 019 by design)
- 🚧 **blocked (needs you):** 1 — 019 (Plaid→Chase sync; 4-table migration + Plaid account/env vars)
- 🏗 building / 💬 discussing / 👀 preview / 🔁 iterating: 0

**Waiting on you:** 2 (011 proposal + 019 unblock). **In flight:** 0. **Queued for builder:** 1.
**Shipped this week (loop):** 0 (last merge was #29 on 2026-06-10). **Shipped by hand:** the `/day` view today.

## Changed since last run
- **You shipped the Day view** — `df9f9d4` "Add Day view: pull-based daily doc with live task
  blocks (`/day`)", committed straight to `main` at 18:02 today. 21 files, +1939 lines: new
  `/day` route, `components/day/*` (Tiptap doc, slash commands, live task blocks, task picker,
  due-today tray), partial-update `PATCH /api/notes`, plus `TODAY-DOC-VISION.md` at the repo root.
  Live session, not the loop — no rules broken, but it's now the largest surface in the app
  with no backlog folder behind it.
- **Board otherwise unchanged.** No builder run since this morning; no new branches, PRs, or merges.
- Working tree still clean apart from the untracked `ios/` folder.

## Fixed this run
- **Nothing needed fixing.** Re-verified against the new commit, all green:
  - All 19 folders have `spec.md` + `log.md`. All `Status:`/`Class:` values valid
    (16 shipped, 011 `proposed`, 018 `ready`, 019 `blocked`).
  - Every status still agrees with GitHub (`gh pr list`): #16–#29 merged; **#13 is still the
    only open PR** (draft); 011/018/019 have no branch or PR, consistent with their statuses.
  - Dashboard ↔ folders 1:1 (001–019). No orphan folders, no orphan dashboard rows.
  - `LEARNINGS.md`: no dupes, **no contradictions** (nothing to supersede), no dead refs.
    Re-checked every referenced path against the post-`/day` tree — `lib/server-fetchers.ts`,
    `lib/validation/*`, `lib/triage.ts`, `components/shared/ServerSWR.tsx`, `lib/hooks.ts`,
    `app/api/mcp/`, next-themes all still present and accurate.
  - **The new `/day` code obeys the learnings** — `app/(main)/day/page.tsx` prefetches via
    `fetchNote`/`fetchTasks` and hydrates through `ServerSWR`, exactly the documented pattern.
    Nothing to add or amend in `LEARNINGS.md`.
  - Nothing `building`/`discussing` → no builder race. No `backlog/PAUSED`.

## Needs John

_One new item this run (011 vs. `/day` overlap) — push sent. The rest is carried forward unchanged._

- **🆕 011 search may have been overtaken by `/day`.** The `/add` picker you just shipped already
  does substring search across task title + description + tag names, with tag/destination filters.
  011 has sat `proposed` for 55 days asking essentially "what's the scope of search?" — the answer
  moved. Worth a re-triage decision: **narrow 011 to docs/notes search only** (the part `/day`
  doesn't cover), **close it** as absorbed, or leave it parked. `TODAY-DOC-VISION.md` also lands
  on the same question — it notes v1 search is substring and that embeddings/LLM are a
  "decide later if substring isn't enough."

- **🆕 `/day` has no backlog folder, and its vision doc holds real un-backlogged work.**
  `TODAY-DOC-VISION.md` "Later / bigger ideas" contains four things that are genuine features,
  not notes: Linear-style custom vault views (user-defined grouping, saved views), retiring
  auto-triage / `on_deck` as a destination, MCP doc read/write tools as the doc's remote control
  (plus your gripe that MCP "takes useless initiative"), and in-doc context intelligence
  (highlight → add to task description). None are in `backlog/`. If you want the loop to pick any
  up, they need folders — `/backlog` each one. Same for `/day` itself if it should be tracked
  rather than stay a hand-built experiment.

- **011 search — 55 days untouched** (intake 2026-06-07, still only the original entry in
  `log.md`). See the re-triage note above.

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
  backlog folder. Note the vision doc now argues auto-triage should eventually go away entirely,
  which may make this branch moot — worth a look before investing in it. File a PR, create a
  folder via `/backlog`, or drop it.

- **`origin/claude/fix-task-categorization-j8nuy`** — old bug-fix branch (~92 days,
  2026-05-01), 1 commit ahead of main, no PR ever filed. Previously diffed against
  `feature/task-triage-v2`: that branch is a much larger rewrite (163 files) that includes
  its own task-categorization changes plus migrations and tooling churn — not a clean
  superset, so it can't be confirmed to subsume this one without a closer read. Worth a
  look before closing either.

- **`CLAUDE.md` still has the dead `/api/cron/*` reference** (line 15: _"API routes run on the
  edge runtime, except `/api/cron/*` and `/api/mcp/*`"_). Re-verified against the current tree:
  `app/api/` holds automation, cashflow, checkins, dates-with-content, docs, goals, mcp, notes,
  settings, tags, tasks, uploads — no `cron/`. Left alone deliberately: `CLAUDE.md` is yours and
  sits outside `backlog/`. Separately, `CLAUDE.md` doesn't mention `components/day/*` or the
  `/day` route yet — worth a line under "Key directories" so the builder knows it exists.
  One-line fixes when you want them, or say the word and a future run takes them.

## Healthy
- All 19 folders have `spec.md` + `log.md`; all `Status:`/`Class:` values valid.
- Every `Status:` agrees with GitHub. #13 is the only open PR (draft).
- Dashboard ↔ folders 1:1 (001–019). No orphans.
- `LEARNINGS.md` clean — no contradictions, no dead refs, no dupes; new `/day` code conforms to it.
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
  (#28, #25), harmless squash-merge leftovers.
- Untracked `ios/` folder — Capacitor build artifact from `feat/ios-capacitor`.
