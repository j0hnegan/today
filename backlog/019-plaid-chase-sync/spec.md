# Plaid → Chase bank sync (balance, transactions & recurring streams)

## What
Connect John's Chase account via **Plaid** and keep three things synced into
Supabase: **live balance**, **transactions**, and **recurring streams**
(detected recurring charges + paydays). This is the data backbone of the
Finance tab — 018's redesign (2026-06-11) made both of its panels Plaid-driven,
so **this item now ships first** and 018 is blocked by it.

John chose Plaid over Teller/SimpleFIN/manual CSV (decision 2026-06-11).

## Detail

### What 018 needs from this item
- **Live balance** (current + available, with synced-at) — left-panel anchor.
- **Recurring streams** — upcoming charges *and* upcoming pay with predicted
  next dates and average amounts (left panel), plus the set of active recurring
  outflows (right panel's monthly-burn list).
- Don't hand-roll recurring detection from raw transactions: Plaid's
  **`/transactions/recurring/get`** returns inflow/outflow streams with
  frequency, average amount, last date, and **predicted next date** — exactly
  the "look at the last couple months and find the recurring stuff" John asked
  for. (Requires the Transactions product on the Plaid item.)

### Architecture (keep it personal-app simple)
- **Server SDK:** `plaid` npm package (official). Plaid routes need Node, not
  edge — `app/api/plaid/*` with `export const runtime = "nodejs"` (same
  exception pattern as `/api/mcp/*`).
- **Client:** load Plaid Link via their script
  (`https://cdn.plaid.com/link/v2/stable/link-initialize.js`) directly — do
  **not** add `react-plaid-link`. One "Connect bank" button + script tag.
  (Server `plaid` package is the only new dependency.)
- **Link flow:** `POST /api/plaid/link-token` (create_link_token, products:
  transactions) → Plaid Link UI → `POST /api/plaid/exchange` (public_token →
  access_token) → persist the item server-side. The **access_token is a
  secret**: server-only, never returned to the client, never logged.
- **Sync:** one route `POST /api/plaid/sync` that updates:
  1. balances (`/accounts/balance/get`),
  2. transactions (`/transactions/sync` with stored cursor),
  3. recurring streams (`/transactions/recurring/get`).
  Triggered (a) on demand (the Finance page refresh button) and (b) daily —
  add `vercel.json` with a cron hitting `/api/cron/plaid-sync` (note: **no
  vercel.json or cron routes exist yet** — net-new; guard with `CRON_SECRET`
  per Vercel convention).
- **Reads the Hush way:** `fetchBankAccounts` / `fetchRecurringStreams` (and a
  transactions fetcher if 018 ends up listing recent activity) in
  `lib/server-fetchers.ts`, thin GET routes, hooks in `lib/hooks.ts`. 018
  consumes these — define the shapes here so 018 doesn't duplicate.
- **Env vars (John adds):** `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`
  (`sandbox` → `production`). Everything degrades gracefully when absent.
- **Minimal UI in this item:** a bare `/finance` page stub — "Connect bank"
  button (→ Link flow) and, once connected, the raw balance + last-synced +
  refresh button. Just enough to prove the pipeline end to end; 018 replaces
  the stub with the real two-panel page.

### Data model — **needs migration** (builder: scaffold, don't run)
Match the existing `cash_flows` migration style (RLS `authenticated`):
- `plaid_items` — id, item_id, access_token, institution_name, transactions
  cursor, created/updated.
- `bank_accounts` — plaid account_id, item fk, name, mask, type,
  current_balance, available_balance, synced_at.
- `bank_transactions` — plaid transaction_id, account fk, date, name, amount,
  pending.
- `recurring_streams` — plaid stream_id, account fk, direction (inflow/
  outflow), description/merchant, frequency, average_amount, last_date,
  predicted_next_date, is_active, raw JSONB for anything 018 turns out to need.
Write the migration under `supabase/migrations/`, **do not run it** — set
`blocked` and hand John the steps below.

### What John must do (builder: stop and list these when blocked)
1. Create a Plaid account at dashboard.plaid.com; grab client_id + sandbox
   secret. Request limited Production access (real Chase links require Plaid's
   OAuth flow, which works in production).
2. Add the env vars to `.env.local` and Vercel.
3. Run the migration (`supabase db push` or dashboard SQL editor).
4. Click "Connect bank" on the Finance page and link Chase.

### Scope
- **v1 (all required — 018's panels depend on it):** link flow, all four
  tables, sync of balances + transactions + recurring streams (cron + manual),
  read fetchers/hooks, the connect-button stub page. Sandbox-tested end to
  end; production is an env swap.
- **Out of scope:** multiple banks/institutions UI (schema allows it, UI
  assumes one), categorization/budgets, auto-creating forecast rows from
  streams (future item), webhooks (daily cron + manual refresh is plenty).

## Definition of done
- With sandbox creds: connect a bank via Plaid Link; balances, transactions,
  and recurring streams land in their tables; manual refresh and the cron route
  both update `synced_at` and the cursor.
- `fetchBankAccounts` / `fetchRecurringStreams` + routes + hooks exist and are
  what the stub page renders from (018 will consume the same).
- Without creds: app builds and runs cleanly; `/finance` shows the "Connect
  bank" prompt. No secret ever reaches the client or logs.
- Migration file written and documented, **not executed**. Item parks at
  `blocked` with John's 4-step setup list until he runs it and adds keys.
- Typecheck/lint/test/build green.

## Notes
- **needs migration? YES** — `plaid_items`, `bank_accounts`,
  `bank_transactions`, `recurring_streams`. Builder writes the file, sets
  `blocked`, pings, stops.
- New env vars + a new `vercel.json` cron — both need John on the Vercel side.
- 018 is blocked by this item (dependency flipped 2026-06-11; it used to be the
  other way around).
