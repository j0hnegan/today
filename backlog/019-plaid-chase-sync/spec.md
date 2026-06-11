# Plaid → Chase bank sync (live balance + transactions for Finance)

## What
Connect John's Chase account via **Plaid** so the Finance tab (018) shows his
*real* bank balance and recent activity, updated automatically — instead of a
hand-typed `starting_balance`. John chose Plaid over Teller/SimpleFIN/manual CSV
(decision 2026-06-11).

## Detail

### How it fits 018
018 ships first as a read-only dashboard over `cash_flows` forecasts. This item
layers real data into that page:
- **Balance now** card = live Chase balance (current + available) with a
  "synced 2h ago" timestamp.
- **Projection** starts from the real balance instead of the forecast's
  hand-entered `starting_balance` (keep the forecast's rows as the future
  events; the real balance just replaces the anchor — offer a small toggle or
  just prefer live balance when fresh).
- **Recent activity** — last ~10 synced transactions (nice-to-have, see scope).

### Architecture (keep it personal-app simple)
- **Server SDK:** `plaid` npm package (official). Plaid routes need Node, not
  edge — put them under `app/api/plaid/*` with `export const runtime = "nodejs"`
  (same exception pattern CLAUDE.md describes for `/api/mcp/*`).
- **Client:** load Plaid Link via their script
  (`https://cdn.plaid.com/link/v2/stable/link-initialize.js`) directly — do
  **not** add `react-plaid-link`; one tiny "Connect bank" button + script tag is
  enough for one user. (Server `plaid` package is the only new dependency.)
- **Link flow:** `POST /api/plaid/link-token` (create_link_token) → Plaid Link UI
  in browser → `POST /api/plaid/exchange` (public_token → access_token) →
  persist the item server-side. The **access_token is a secret**: server-only,
  never returned to the client, never logged.
- **Sync:** one route `POST /api/plaid/sync` that refreshes balances
  (`/accounts/balance/get`) and, if in scope, transactions via
  `/transactions/sync` with a stored cursor. Trigger it (a) on demand from a
  refresh button on the Finance page, and (b) on a schedule — add `vercel.json`
  with a daily cron hitting `/api/cron/plaid-sync` (note: **no vercel.json or
  cron routes exist yet** — this is net-new; guard the cron route with
  `CRON_SECRET` per Vercel convention).
- **Env vars (John adds these):** `PLAID_CLIENT_ID`, `PLAID_SECRET`,
  `PLAID_ENV` (`sandbox` → `production`). Build everything to degrade
  gracefully when they're absent (Finance page just shows the 018 forecast view
  with a "Connect bank" prompt).

### Data model — **needs migration** (builder: scaffold, don't run)
New tables, roughly:
- `plaid_items` — id, item_id, access_token, institution_name, transactions
  cursor, created/updated timestamps.
- `bank_accounts` — plaid account_id, item fk, name, mask, type,
  current_balance, available_balance, synced_at.
- `bank_transactions` (only if transactions in scope) — plaid transaction_id,
  account fk, date, name, amount, pending.
Write the migration file under `supabase/migrations/`, match the existing
`cash_flows` migration style (RLS `authenticated`), **but do not run it** — set
`blocked` and hand John the exact steps (below).

### What John must do (the builder should stop and list these when blocked)
1. Create a Plaid account at dashboard.plaid.com; grab client_id + sandbox
   secret. Request limited Production access (needed to link real Chase —
   Chase requires Plaid's OAuth flow, which works in production).
2. Add the env vars to `.env.local` and Vercel.
3. Run the migration (`supabase db push` or dashboard SQL editor).
4. Click "Connect bank" on the Finance page and link Chase.

### Scope
- **v1 (this item):** link flow, `plaid_items`/`bank_accounts`, balance sync
  (cron + manual refresh), Finance page shows live balance + anchors the
  projection on it. Sandbox-tested end to end; production is just env swap.
- **In scope if cheap:** `/transactions/sync` + a "Recent activity" list on the
  Finance page. If it balloons, split it out as a follow-up item.
- **Out of scope:** multiple banks/institutions UI (the schema allows it, the UI
  assumes one item), categorization, budgets, auto-creating forecast rows from
  recurring transactions (good future item), webhooks (daily cron + manual
  refresh is plenty for one user).

## Definition of done
- With sandbox creds: connect a bank via Plaid Link, see balance on the Finance
  page, manual refresh and cron route both update `synced_at`/balances.
- Without creds: app builds and runs cleanly; Finance page shows the 018 view
  plus a "Connect bank" prompt. No secret ever reaches the client or logs.
- Migration file written and documented, **not executed**. Item parks at
  `blocked` with John's 4-step setup list until he runs it and adds keys.
- Typecheck/lint/test/build green.

## Notes
- blocked by: 018 (the Finance page is where all of this surfaces)
- **needs migration? YES** — `plaid_items`, `bank_accounts`, optional
  `bank_transactions`. Builder writes the file, sets `blocked`, pings, stops.
- New env vars + a new `vercel.json` cron — both need John on the Vercel side.
