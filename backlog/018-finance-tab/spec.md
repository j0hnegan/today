# Finance tab — upcoming charges, recurring costs & forecast modal

## What
A new top-level **Finance** page (sidebar nav item) built like the Today screen:
**two swappable, resizable panels** over live Chase data (synced by 019).
- **Left — Upcoming:** a chronological, month-by-month projection of what's
  about to hit the account — recurring charges *and* paydays — with the live
  bank balance as the anchor and a running balance after each event.
- **Right — Monthly costs:** a non-chronological list of active recurring
  monthly costs (subscriptions, bills) with a monthly-burn total.
- **Forecast modal:** a button opens the existing `CashFlowTable` seeded from
  reality, where John can drag, edit, and add hypothetical expenses to play out
  scenarios — sandbox on top of the fixed reality view.

> Redesigned 2026-06-11 in live session. This **supersedes the 2026-06-10
> builder pitch** (read-only dashboard over hand-made cash-flow forecasts).
> The page is now driven by Plaid data; hand-made forecasts survive as the
> engine of the Forecast modal.

## Detail

### Depends on 019 (build that first)
All data comes from the 019 Plaid sync: live balance (`bank_accounts`) and
recurring streams (`recurring_streams`, from Plaid's
`/transactions/recurring/get` — inflow and outflow streams with average amount
and predicted next date). 018 consumes them via the standard fetcher → route →
hook pattern; 019 defines those read shapes. Until the bank is connected, the
page shows 019's "Connect bank" prompt.

### Layout — reuse the Today-screen panel mechanics
`components/focus/PagePanel.tsx` already implements everything the shell needs:
equal-width panels, drag-a-panel-to-swap-sides, resizable divider, localStorage
persistence (`focus-today-swapped`, `focus-today-split`), mobile stacking.
Follow that pattern (extract/adapt rather than copy-paste if it's clean to do;
three similar lines beat a premature abstraction — judgment call). Use
finance-specific localStorage keys.

### Left panel — Upcoming (chronological, month by month)
- Header: **live bank balance** (current/available from `bank_accounts`) with a
  "synced Xh ago" timestamp and a manual refresh button (hits 019's sync route).
- Below: predicted events from recurring streams, sorted by predicted date,
  **grouped under month headers** (June, July, …), horizon ≈ through the end of
  next month.
- Each row: date · name · amount (outflows red, inflows/paydays green) ·
  **running balance after the event**, anchored on the live balance
  (`runningBalances` from `lib/cashflow.ts` — same math, real inputs).
- If the running balance dips below zero anywhere, make it loud (same
  red treatment + lowest-point callout as `CashFlowTable`).

### Right panel — Monthly costs (the burn list)
- Active recurring **outflow** streams only, non-chronological — sort by amount
  descending. Row: name · average monthly amount · maybe frequency badge if not
  monthly (weekly/annual normalized to a monthly figure).
- Footer/total: **monthly burn** — the sum, big and readable.

### Forecast modal — reuse what we built
- A "Forecast" button (page header or left panel) opens a modal containing the
  existing **`CashFlowTable`** — drag to reorder, edit amounts, add rows: all
  already built.
- Seeded from reality: starting balance = live balance, rows = the upcoming
  events from the left panel. Persist it as a normal `cash_flows` row (no
  migration) with a well-known id or title, so the scenario survives reloads.
  One persisted scenario + a "Reset to reality" action that re-seeds it. Multiple
  scenarios = later, only if John asks.
- Existing note/doc-embedded forecasts are untouched; this is just another
  consumer of the same table + API.

### Build it the Hush way
- Read shapes in `lib/server-fetchers.ts`, thin routes, hooks in `lib/hooks.ts`,
  Server Component prefetch + `ServerSWR` hydrate (Docs/Vault pattern). 019
  will have created the fetchers for balance/streams — reuse, don't duplicate.
- `Finance` entry in `navItems` (`components/shared/Sidebar.tsx`) — `Wallet`
  icon, accent color in line with the others, preload the finance read keys.
  Wire `MobileNav.tsx` too; mobile stacks panels like Today does.
- Design tokens only; red-for-negative / green-for-inflow consistent with
  `CashFlowTable`. Must look right in **light and dark**.
- All money math from `lib/cashflow.ts`; no chart dependency. (The old pitch's
  SVG balance sparkline is no longer required — the running tally covers it.
  Add later only if John asks.)

## Definition of done
- Finance appears in sidebar + mobile nav; page loads via the standard
  fetcher/SWR pattern with two panels that swap (drag or button) and resize,
  persisted across reloads, stacking on mobile.
- Left panel: live balance + synced-at + refresh, month-grouped upcoming
  charges/paydays with running balance, sub-zero warning.
- Right panel: recurring monthly costs sorted by amount with a monthly-burn
  total.
- Forecast button opens a modal with an editable `CashFlowTable` seeded from
  the live balance + upcoming events, persisted, with "Reset to reality".
- Unconnected state falls back to 019's "Connect bank" prompt; light + dark
  both right; typecheck/lint/test/build green.

## Notes
- blocked by: 019 (live balance + recurring streams power both panels)
- **needs migration?** No — forecast scenario persists as a normal `cash_flows`
  row; panel layout prefs in localStorage. 019 owns all new tables.
