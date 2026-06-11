Status: blocked
Class: review
Branch: —
PR: —

## Done
<checklist the builder ticks off>

## Open
- **BLOCKED — needs a DB migration + John setup before the builder can build.**
  The whole feature (link flow, sync, stub reads) writes to / reads from four
  net-new tables, so there's nothing buildable-and-testable without them. Per
  the loop's hard rule the builder never writes or runs a migration → parked
  here for John. John's prerequisites (from spec → "What John must do"):
  1. Create a Plaid account (dashboard.plaid.com); grab client_id + sandbox
     secret; request limited Production access for real Chase links.
  2. Add `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` to `.env.local` + Vercel.
  3. The migration (`plaid_items`, `bank_accounts`, `bank_transactions`,
     `recurring_streams`) must be authored + run. Builder won't author it; either
     John writes/runs it, or he green-lights a live session to do the schema work
     and then flips this back to `ready` for the builder to wire up the routes.
- 018 stays gated on this item.

## Decisions / feedback log
- [2026-06-11 /backlog] Intake. John flagged that 018 was missing the actual
  bank integration: "we need that so it automatically updates and pulls in data
  from chase." Chase has no public personal API → aggregator required. John
  picked **Plaid** (over Teller, SimpleFIN, manual CSV). Scoped as a separate
  item layered on 018: link flow + balance sync (cron + manual refresh), live
  balance anchors the 018 projection; transactions/recent-activity in scope if
  cheap. Needs migration (plaid_items / bank_accounts) → builder scaffolds,
  never runs; class `review` since the design is settled and the rounds are
  John-setup steps, not taste.
- [2026-06-11 /backlog] 018 redesigned in live session → both Finance panels
  are Plaid-driven, so the dependency flipped: **this item builds first**, 018
  is blocked by it. Scope hardened: transactions + recurring streams
  (`/transactions/recurring/get`) are now **required** (they power 018's
  upcoming-charges and monthly-costs panels), `recurring_streams` table added
  to the migration, and this item ships a minimal `/finance` stub (Connect
  button + raw balance + refresh) that 018 later replaces. Spec rewritten.
- [2026-06-11 builder] Picked this up as first-in-line. Spec requires a net-new
  DB migration (4 tables) and the feature has no meaningful build-and-verify
  surface without it — every route persists to or reads from those tables. The
  builder loop's hard rule forbids writing/running migrations, so per §4.2 I'm
  **not** building or scaffolding it: status → `blocked`, pinging John with the
  prerequisite list above. No branch opened. 018 remains gated on this item.
