Status: ready
Class: review
Branch: —
PR: —

## Done
<checklist the builder ticks off>

## Open
- Blocked by 018 (Finance page must exist first).
- Will park at `blocked` mid-build for John: Plaid account + env vars + run the
  migration (exact steps in spec → "What John must do").

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
