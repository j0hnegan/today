# Health — steward snapshot

_Last run: 2026-11-01 12:46 EST (steward daily run). Overwritten each run; latest state only._

> **No change since the 2026-10-31 runs.** No commits on `main`, no PR movement (#13 still the
> only open PR), no edits to `LEARNINGS.md`, nothing `building`/`discussing`. Audit still green;
> stale-day counts bumped by one. Everything below is still accurate.

## Status counts (19 features)
- ✅ **shipped:** 16 — 001–010, 012–017 (all merged, #16–#29)
- 🤔 **proposed (your go/no-go):** 1 — 011 (search)
- 📥 **ready (builder's queue):** 1 — 018 (Finance tab, gated behind 019 by design)
- 🚧 **blocked (needs you):** 1 — 019 (Plaid→Chase sync; 4-table migration + Plaid account/env vars)
- 🏗 building / 💬 discussing / 👀 preview / 🔁 iterating: 0

**Waiting on you:** 2 (011 proposal + 019 unblock). **In flight:** 0. **Queued for builder:** 1.
**Shipped this week (loop):** 0 (last loop merge #29, 2026-06-10). **Shipped by hand:** 0 this week (last hand commit 2026-09-23).

## Changed since last run (2026-08-10 → 2026-10-31)

- **The loops went dark for 82 days.** No builder or steward commit since 2026-08-10. If that wasn't
  intentional, check the `hush-builder` / `hush-steward` schedules.
- **You shipped 10 code commits by hand, none backlogged:**
  - 08-15/16 — day doc: realtime recovery, cross-device rollover (+ 2 migrations:
    `add_day_rollover_decision`, `optimize_app_database`), immediate rollover prompt, inline task pills.
  - 09-21→09-23 — `/day` now `TodayLayout`: `DayDocPanel` + `TaskSidebar` side by side, animated
    section tabs, inline task entry, compact date actions, drag tasks into notes, ⌘Z completion undo.
- **`CLAUDE.md` was rewritten alongside (09-21/23)** — the "Today page" section now matches `/day`.
  That clears most of the 🔴 item flagged ten runs running. Three leftovers below.
- `main` in sync with `origin/main`. Untracked: `ios/` (as before) and a new `Alpine-Night-Loop/`
  (video/`.tsrct` assets) — both left untouched.

## Fixed this run
- **Nothing needed fixing.** Full re-audit, all green:
  - All 19 folders have `spec.md` + `log.md`; all `Status:`/`Class:` values valid.
  - Every status agrees with GitHub: #16–#29 merged; **#13 still the only open PR** (draft);
    011/018/019 have no branch or PR.
  - Dashboard ↔ folders 1:1 (001–019). No orphans.
  - `LEARNINGS.md`: no dupes, no contradictions, no dead refs (`lib/server-fetchers.ts`,
    `lib/validation/`, `app/api/mcp/` all present). Unchanged.
  - Nothing `building`/`discussing` → no builder race. No `backlog/PAUSED`.
- Dashboard "Last run" line refreshed.

## Needs John

- **🟡 `CLAUDE.md` — three small leftovers** (yours to edit; I don't touch it):
  - "Key directories" still lists `components/focus/*` as `PagePanel`, `NoteEditor`, **`TaskListPanel`**
    — that file doesn't exist (it's `TaskSidebar.tsx`).
  - `components/day/*` (`TodayLayout`, `DayDoc`, `DayDocPanel`, task pills) still isn't in "Key directories".
  - Tech Stack says `/api/cron/*` runs on Node — there's no `app/api/cron/`.
- **🟡 019 still blocked on a migration you'd run by hand.** No `PLAID_*` vars, no `plaid` dep, none of
  the four tables. You've written two migrations by hand since (08-15) — one more for 019 flips it to
  `ready` and unblocks 018 behind it.
- **011 search — 147 days untouched.** Task search is covered (keywords, picker, MCP `search_tasks`).
  Narrow to docs/notes-only or close as absorbed.
- **🟡 The Today/day-doc work has no backlog folder.** ~25 hand commits across two feature areas the
  board doesn't know exist. One retroactive `/backlog` folder would let the loop iterate on it.

## Stale — re-triage? (>30 days, not auto-closed)

| Item | Untouched | Note |
|---|---|---|
| 011 search | 147 days | Overtaken — narrow or close (above) |
| 018 finance tab | 143 days | Gated on 019 by design |
| 019 Plaid sync | 143 days | Blocked on the migration (above) |
| [Draft PR #13](https://github.com/j0hnegan/today/pull/13) iOS shell | 154 days | `feat/ios-capacitor`, 1 commit, no folder. Track, park, or close. Untracked `ios/` correlates. |
| `feature/task-triage-v2` | 133 days | Local, 1 commit, no PR/folder. Likely moot if auto-triage is retired. |
| `origin/claude/fix-task-categorization-j8nuy` | 184 days | 1 commit, no PR ever filed. |

## Cleanup candidates (not the steward's to delete)
- Local `claude/wonderful-einstein`, `claude/wonderful-goodall`, `ios-app` — 0 commits ahead of main.
  `feat/responsive-mobile` — squash-merged as #12, redundant.
- Remote `origin/claude/task-duplication-bug-Mrona` (0 ahead), `origin/auto/005-step2b-code`,
  `origin/auto/014-carryover-empty-guard` (PRs #28/#25 merged).
