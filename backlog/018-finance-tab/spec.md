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

## Builder proposal — pitch (2026-06-10)

_Pre-digested per §3. No code written. John: one-tap "go" → demote to `review`
and I build it; or "let's talk" if you want to steer scope first._

**Pick on open question #1 → (b) list + select, no migration.** Each row in
`cash_flows` is a *self-contained* forecast (`starting_balance`, `starting_date`,
its own `rows[]`). Aggregating (option a) is mathematically wrong — summing
balances across forecasts with different starting points yields a meaningless
number. A persisted "primary" (option c) needs a column → migration → out.
So: **show all forecasts, John views one at a time.** Selected forecast id lives
in **localStorage** (client pref, same as our other UI state — no DB, no migration).
Default selection = most-recently-updated forecast (`updated_at` desc).

**Concrete layout** (single `app/(main)/finance/page.tsx`, server-prefetched):

```
┌ Finance ───────────────────────────────────────────────┐
│  [ Forecast ▾ ]  ← dropdown, only if >1 forecast exists  │
│                                                          │
│  Projected ending balance        Lowest point            │
│  $4,820.13                       ⚠ -$310.00 on Jun 24    │  ← red when <0
│  (starting $6,100.00 · Jun 10)                           │
│                                                          │
│  ┌ Balance projection ──────────────────────────────┐   │
│  │   inline SVG area+line of runningBalances()        │   │  ← zero baseline,
│  │   over time, red fill under any sub-zero stretch   │   │     red below 0
│  └────────────────────────────────────────────────────┘   │
│                                                          │
│  Upcoming costs                                          │
│  Jun 14   Rent            -$1,800.00     bal $4,300.00   │  ← next N dated
│  Jun 20   Card payment      -$540.00     bal $3,760.00   │     amount_out rows
│  …        (deep-link each → the note/doc owning it, if cheap)│  ahead of today
└──────────────────────────────────────────────────────────┘
```

**Decisions baked in** (questions #2/#3):
- **#2 horizon:** projection spans the forecast's full row range (no arbitrary
  cutoff — these are hand-curated, bounded). Upcoming costs = **all** dated
  `amount_out > 0` rows with `date >= today`, newest forecasts rarely exceed a
  dozen rows. If it ever feels long, cap later.
- **#3 read-only v1:** dashboard only. Forecasts are still edited in their note's
  `CashFlowTable`. Deep-link if the owning entity is cheap to resolve; if not,
  skip the link for v1 (don't block on it).

**Build plan (the Hush way, all reuse):**
- `fetchCashFlows(supabase)` in `lib/server-fetchers.ts` → `select("*")` ordered
  `updated_at` desc. Thin `GET /api/cashflow` list route + `useCashFlows()` hook.
  Server Component prefetch + `ServerSWR` hydrate (Docs/Vault pattern).
- All numbers from `lib/cashflow.ts` (`sortRows`, `runningBalances`,
  `lowestPoint`, `endingBalance`, `formatMoney`, `formatDate`) — zero new math.
- SVG sparkline: hand-rolled `<svg>`, points mapped from `runningBalances`, zero
  baseline, red stroke/fill for sub-zero segments. No chart dep.
- `Finance` nav entry (`Wallet` icon) in `Sidebar.tsx` + `MobileNav.tsx`,
  `preloadKeys: ["/api/cashflow"]`. Design tokens, light + dark, empty state
  pointing John to add a forecast in a note.

**Scope I'd skip for v1:** editing, multi-forecast aggregation, a date-range
picker, any new column/migration. ~1 fetcher + 1 route + 1 hook + 1 page + 1 nav
entry. Estimate: clean `review`-class build.

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
