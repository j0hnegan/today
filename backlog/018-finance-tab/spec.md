# Finance tab — upcoming costs, balance & projections

## What
A new top-level **Finance** page (sidebar nav item) that turns the existing
cash-flow forecast data into an at-a-glance money dashboard: current/projected
bank balance, upcoming costs, and a balance-over-time projection. Today the
cash-flow feature only exists as forecast tables embedded inside notes/docs —
this gives it a home of its own.

## Detail

### What exists today (read this — don't reinvent)
- Cash-flow forecasts are **embed-only**: a `<CashFlowTable>` inserted as a block
  into a note/doc via slash command, each with a random `id`, persisted to the
  `cash_flows` table (`app/api/cashflow/[id]/route.ts`).
- The math already lives in `lib/cashflow.ts`: `sortRows`, `runningBalances`,
  `lowestPoint`, `endingBalance`, `formatMoney`, `formatDate`, `addDays`.
  **Reuse these** — the Finance page is a new *view* over the same data, not new
  forecasting logic.
- There is currently **no way to list all forecasts** — no `fetchCashFlows`, no
  `GET /api/cashflow` list route. The table has no `user_id` (single-user app,
  RLS is just `authenticated`).

### Build it the Hush way
- New read shape goes in `lib/server-fetchers.ts` as `fetchCashFlows(supabase)`
  (single source of truth). Add a thin `GET /api/cashflow` list route that calls
  it + a `useCashFlows()` hook in `lib/hooks.ts`. Server Component prefetches and
  hydrates via `ServerSWR`, same pattern as Docs/Vault.
- New route under `app/(main)/finance/` + add a `Finance` entry to `navItems` in
  `components/shared/Sidebar.tsx` (pick a Lucide icon — e.g. `Wallet` or
  `TrendingUp` — give it a token-ish accent color like the others, and set
  `preloadKeys: ["/api/cashflow"]`). Also wire it into `MobileNav.tsx`.
- **Projection chart: no new dependency.** There is no chart lib in the project
  and we don't want one for a personal app — render a lightweight inline **SVG
  sparkline/area** of the running balance over time. Keep it simple.
- Design tokens only (bg-panel, border-border, text-muted-foreground, the same
  red-for-negative treatment `CashFlowTable` already uses). Must look right in
  **both light and dark**.

### Suggested page content (the builder should propose a concrete layout)
- **Balance now / projected ending balance** — big number, red when negative,
  plus the **lowest projected point** (the "will I dip below zero" warning), all
  straight from the existing helpers.
- **Upcoming costs** — the next N dated outflow rows (`amount_out > 0`) ahead of
  today, sorted by date, with running balance after each.
- **Projection** — SVG line/area of running balance from `starting_date` forward.

### Open design questions (this is why it's `discuss` — pitch a proposal first)
1. **One forecast or many?** Forecasts are scattered across notes with no
   "primary" concept. Options: (a) aggregate across *all* forecasts, (b) show a
   list and let John pick/pin one, (c) designate a primary. Aggregating or
   listing needs **no migration**; a persisted "primary/pinned" flag **does** —
   if you go that route, stop and flag (see Notes). Lean toward the
   no-migration option for v1.
2. How far forward does the projection run / how many upcoming costs to show.
3. Is this read-only (a dashboard over forecasts edited in notes), or can John
   edit here too? v1 = read-only dashboard is fine; deep-link to the note/doc
   that owns a forecast if cheap.

## Definition of done
- A **Finance** item appears in the sidebar (and mobile nav) and routes to a new
  page that loads via the server-fetcher → ServerSWR → hook pattern.
- The page shows, from real `cash_flows` data: a balance/ending-balance summary
  with lowest-point warning, an upcoming-costs list, and an SVG balance
  projection — all reusing `lib/cashflow.ts`, no new chart dependency.
- Correct and good-looking in light + dark; typecheck/lint/test/build green.
- Empty state when there are no forecasts yet (points John to add one in a note).

## Notes
- **needs migration?** Only if a "primary/pinned forecast" is chosen in #1 above
  (new column on `cash_flows`). Default to the no-migration aggregate/list
  approach. If a migration is genuinely needed → set `blocked`, ping, stop.
- Class `discuss` because the page scope is fuzzy ("upcoming costs… projections,
  etc"). Pre-digest into a `proposed` pitch with a concrete layout + a pick on
  question #1; most likely a 10-second "go" from there.
