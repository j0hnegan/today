Status: proposed
Class: discuss
Branch: —
PR: —

## Done
<checklist the builder ticks off>

## Open
- Pitch a concrete page layout + resolve open question #1 (one forecast vs many)
  into a `proposed` pitch before building.

## Decisions / feedback log
- [2026-06-09 /backlog] Intake. John: "integrate with finances to show new
  finance tab — upcoming costs, bank balance, projections etc." Existing
  cash-flow feature is embed-only (forecast tables in notes/docs, `cash_flows`
  table, math in `lib/cashflow.ts`). This adds a standalone Finance page + nav
  item as a view over that data. Tagged `discuss` (fuzzy scope) → builder should
  pre-digest into a `proposed` pitch. No-migration aggregate/list approach
  preferred; a "primary forecast" flag would need a migration → flag if chosen.
- [2026-06-10 builder] Pre-digested into a `proposed` pitch (see spec → Builder
  proposal). Picked open #1 = (b) list + select, no migration — aggregating is
  mathematically wrong (each forecast has its own starting balance/date), and a
  "primary" flag would need a column. Selected forecast id → localStorage.
  Concrete layout + horizon/read-only decisions in spec. No code written; waits
  on John's one-tap verdict.
- [2026-06-11 /backlog] John: the bank integration is required — the page must
  pull live data from Chase, not just hand-entered forecasts. He picked
  **Plaid**; that's now item **019-plaid-chase-sync** (blocked by this one).
  Verdict on the v1 pitch above still pending. When building, leave room in the
  layout for what 019 adds: a "Balance now" card (live Chase balance +
  synced-at) that becomes the projection's anchor, and an optional recent-
  activity list. Don't build any Plaid code here — 019 owns that.
