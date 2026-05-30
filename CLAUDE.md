# Hush — Project Knowledge

## What is this?
A personal daily planner for one user (John). A Notion-like **Today** page (a
freeform note plus a task sidebar), a task **vault**, **docs**, **goals**, and a
**cash-flow** planner. It also exposes a read/write **MCP** server. Personal
use — not a SaaS.

## Tech Stack
- **Next.js 14** (App Router), React 18
- **Supabase** — Postgres + Auth (Google OAuth) + Storage
- **SWR** on the client; Server Components prefetch and hydrate the SWR cache
- **Tailwind + Radix + shadcn/ui**, Lucide icons; dark mode (next-themes)
- **Zod** validation at every API boundary (`lib/validation/*`)
- API routes run on the **edge** runtime, except `/api/cron/*` and `/api/mcp/*` (Node)

> The SQLite → Supabase migration is **complete**. There is no `lib/db.ts` /
> `focus.db` anymore; `scripts/*.ts` that reference SQLite are one-off legacy
> exporters. Supabase clients live in `lib/supabase-browser.ts` and
> `lib/supabase-server.ts`.

## Data architecture (read this first)
`lib/server-fetchers.ts` is the **single source of truth** for every read shape.
Each `fetchX(supabase, …)`:
- is called by **Server Components** to prefetch data and hydrate SWR
  (`components/shared/ServerSWR.tsx`), and
- is called by the matching **`GET /api/*` route** for client revalidation.

So each query/shape is defined exactly once. Read routes are thin:
`requireAuth → validate → fetchX → NextResponse.json(…, SWR_HEADERS)`. They
re-throw DB errors as 500 so SWR retries; `app/(main)/error.tsx` is the SSR
fallback. Client hooks (`useTasks`, `useNote`, …) are in `lib/hooks.ts`; the
localStorage SWR cache is set up in `components/shared/SWRProvider.tsx`.

When changing a read endpoint, edit the fetcher — the route and SSR both follow.

## Auth
- `middleware.ts` validates the Supabase session and forwards `x-hush-user-id`
  so routes can skip a second `getUser()` round-trip.
- `lib/api-auth.ts` `requireAuth()` also accepts a bot Bearer token
  (`HUSH_BOT_TOKEN`, uses the service role) and a guarded dev bypass
  (`HUSH_DEV_AUTH=1`; refuses to run in production / on Vercel).

## Data model
- **Task** — `destination`: `on_deck` (Today) | `upcoming` | `someday` |
  `in_progress`; `status`: `active` | `done`; plus `consequence`, `size`,
  `due_date`, `sort_order`, and tags (categories).
- **Auto-triage** (`lib/triage.ts`): a task due today or earlier moves to `on_deck`.
- **Note** — one row per date (`date` is UNIQUE); freeform HTML `content` plus
  optional `blocks` JSON. Attachments are polymorphic (`entity_type`/`entity_id`),
  so they have no FK to notes and must be fetched as a separate query.
- **Document**, **Goal**, **Category/Tag**, **CheckIn**, **CashFlow**.

## Key directories
- `app/api/*` — route handlers (reads delegate to server-fetchers)
- `lib/server-fetchers.ts` — all read queries (single source of truth)
- `lib/validation/*` — zod schemas per entity
- `components/focus/*` — Today page (`PagePanel`, `NoteEditor`, `TaskListPanel`)
- `components/vault/*` + `components/views/VaultView.tsx` — task management
- `components/docs/*`, `components/cashflow/*`
- `lib/mcp/*` + `app/api/mcp/[token]` — MCP server (read + task tools)
- `app/login/Backgrounds.tsx` — Three.js WebGL background, lazy-loaded via
  `next/dynamic` so the login card paints without waiting on the 3D engine

## Today page
Freeform note editor (`NoteEditor`) on the left; task sidebar (`TaskListPanel`)
on the right with **Today** and **In Progress** tabs.
- Click the check circle = mark done; long-press (1.5s) = move to In Progress.
- Click a title to edit inline (blur saves, Escape cancels).
- Hover actions: date picker, Not Today, delete.

## Environment (`.env.local`)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `HUSH_BOT_TOKEN`,
`MCP_BEARER_TOKEN`, `HUSH_DEV_AUTH` (dev only). Deployed on Vercel (`vercel.json`).

## Working preferences
- Practical, no-BS explanations; plain language for technical concepts.
- Keep it simple — match complexity to a personal app, don't over-engineer.
