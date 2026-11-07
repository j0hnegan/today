# Health — steward snapshot

_Last run: 2026-11-07 09:55 EST (steward daily). Overwritten each run; latest state only._

> **No change since yesterday.** No commits since the 2026-11-06 19:23 re-run.
> No PR movement (#13 still the only open PR), no branch movement, no edits to `LEARNINGS.md`
> (last touched 2026-07-31), nothing `building`/`discussing`. Audit green. CLAUDE.md leftovers re-checked: still true.

## Status counts (19 features)
- ✅ **shipped:** 16 — 001–010, 012–017 (all merged, #16–#29)
- 🤔 **proposed (your go/no-go):** 1 — 011 (search)
- 📥 **ready (builder's queue):** 1 — 018 (Finance tab, gated behind 019 by design)
- 🚧 **blocked (needs you):** 1 — 019 (Plaid→Chase sync; 4-table migration + Plaid account/env vars)
- 🏗 building / 💬 discussing / 👀 preview / 🔁 iterating: 0

**Waiting on you:** 2 (011 proposal + 019 unblock). **In flight:** 0. **Queued for builder:** 1.
**Shipped this week (loop):** 0 (last loop merge #29, 2026-06-10). **Shipped by hand:** 0 this week (last hand commit 2026-09-23).

## Fixed this run
- **Nothing needed fixing.** Full re-audit, all green:
  - All 19 folders have `spec.md` + `log.md`; all `Status:`/`Class:` values valid.
  - Every status agrees with GitHub: #16–#29 merged; **#13 still the only open PR** (draft);
    011/018/019 have no branch or PR.
  - Dashboard ↔ folders 1:1 (001–019). No orphans.
  - `LEARNINGS.md`: no dupes, no contradictions, no dead refs. Unchanged.
  - No `backlog/PAUSED`. `main` in sync with `origin/main`; untracked `ios/` and
    `Alpine-Night-Loop/` left untouched.
- Dashboard "Last run" line refreshed.

## Needs John

- **🟡 `CLAUDE.md` — three small leftovers** (yours to edit; I don't touch it). Still true 2026-11-07:
  - "Key directories" lists `components/focus/*` as `PagePanel`, `NoteEditor`, **`TaskListPanel`**
    — that file doesn't exist (it's `TaskSidebar.tsx`).
  - `components/day/*` (`TodayLayout`, `DayDoc`, `DayDocPanel`, task pills) isn't in "Key directories".
  - Tech Stack says `/api/cron/*` runs on Node — there's no `app/api/cron/`.
- **🟡 019 still blocked on a migration you'd run by hand.** No `PLAID_*` vars, no `plaid` dep, none of
  the four tables. One migration flips it to `ready` and unblocks 018 behind it.
- **011 search — 153 days untouched.** Task search is covered (keywords, picker, MCP `search_tasks`).
  Narrow to docs/notes-only or close as absorbed.
- **🟡 The Today/day-doc work has no backlog folder.** ~25 hand commits (08-15 → 09-23) the board
  doesn't know exist. One retroactive `/backlog` folder would let the loop iterate on it.

## Stale — re-triage? (>30 days, not auto-closed)

| Item | Untouched | Note |
|---|---|---|
| 011 search | 153 days | Overtaken — narrow or close (above) |
| 018 finance tab | 149 days | Gated on 019 by design |
| 019 Plaid sync | 149 days | Blocked on the migration (above) |
| [Draft PR #13](https://github.com/j0hnegan/today/pull/13) iOS shell | 160 days | `feat/ios-capacitor`, 1 commit, no folder. Track, park, or close. Untracked `ios/` correlates. |
| `feature/task-triage-v2` | 139 days | Local, 1 commit, no PR/folder. Likely moot if auto-triage is retired. |
| `origin/claude/fix-task-categorization-j8nuy` | 190 days | 1 commit, no PR ever filed. |

## Cleanup candidates (not the steward's to delete)
- Local `claude/wonderful-einstein`, `claude/wonderful-goodall`, `ios-app` — 0 commits ahead of main.
  `feat/responsive-mobile` — squash-merged as #12, redundant.
- Remote `origin/claude/task-duplication-bug-Mrona` (0 ahead), `origin/auto/005-step2b-code`,
  `origin/auto/014-carryover-empty-guard` (PRs #28/#25 merged).
