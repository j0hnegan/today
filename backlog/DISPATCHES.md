# Dispatches

Append-only run log. `/standup` reads the latest entries.

---

## 2026-06-07 — builder run (manual)
- 🤔 **Proposed** (need John's go/no-go): 002 agentic research (read-only email slice
  first), 005 unify docs+notes (Step 1 presentation-only, no migration).
- 👀 **Ready to preview**: 003 Today task-list lag → PR #17 (server-rendered the rail).
- 📋 **Still queued**: 004 new-day carry-over, 006 highlight→doc, 007 date-clear sync
  (next run; WIP cap of 3 new builds/run reached).
- ✅ Earlier: 001 In Progress sections shipped (PR #16, merged).

## 2026-06-07 — builder run #2 (manual, on John's calls)
- ✅ **Shipped**: 003 task-list lag (PR #17, merged).
- ✅ **007 resolved by 003** — no separate code needed; the shared `/api/tasks` cache
  key from #17 removes the date-clear desync mechanism.
- 👀 **Ready to preview**: 004 new-day note carry-over → PR #18 (rollover trigger best
  confirmed in real use).
- ✅ **005 approved** for Step 1 (presentation unify, no migration) — queued; Step 2
  (the table merge / migration) deferred.
- ⏸ **002 parked** — John will unpack the agentic-research scope later.
- 🆕 **008 filed** (Today screen: swappable panels + drag parity + fix row X) — queued,
  relocated to main after it was created on a feature branch by mistake.
- 📋 **Queued**: 005 (Step 1), 006 highlight→doc, 008.

## 2026-06-07 — builder run #3 (manual)
- 🔧 Hardened /backlog + /standup to operate on main via worktree (any branch).
- 👀 Ready to preview: 006 highlight→add-to-document → PR #19.
- 📋 Queued: 005 Step 1 (presentation unify), 008 (held until 004 merges — shares files with it).

## 2026-06-07 — builder run #4 (manual)
- ✅ Shipped: 006 (#19, merged), 004 earlier (#18).
- 👀 Ready to preview: 008 parts 1+3 (swap panels + Not Today/Trash) → PR #20.
- 🆕 Filed 009 — cross-section drag parity (008 part 2), deferred to its own PR.
- 📋 Queued: 005 Step 1 (presentation unify), 009.

## 2026-06-07 — builder run #5 (manual)
- ✅ Shipped: 008 parts 1+3 (#20, merged).
- 👀 Ready to preview: 005 Step 1 (docs/notes presentation unify) → PR #21.
- 🤔 Proposed: 010 portable build-loop kit (Claude Code plugin + setup prompt).
- ⏳ 009 (cross-section drag) left queued — genuinely needs interactive drag-testing; not safe to build fully blind.

## 2026-06-07 — builder run #6 (manual)
- 👀 Ready to preview: 009 task drag (Today↔In Progress) → PR #22; 012 panel drag-to-swap → PR #23. Both interactive — drag-test on preview.
- 🤔 Awaiting go: 010 (kit-only), 002 (personal-task loop, phased), 011 (search, phased).
