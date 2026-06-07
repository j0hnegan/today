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
