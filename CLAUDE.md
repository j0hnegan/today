# Hush — Project Knowledge

## What is this?
A personal task management / daily planner app. The user (John) uses it to manage daily tasks, notes, goals, and documents. Think of it as a personal Notion-like daily page with a focus on tasks.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS, Radix UI, shadcn/ui components, Lucide icons
- **Database**: Migrating from SQLite (better-sqlite3) → Supabase (Postgres)
- **State**: SWR for data fetching, React state for UI
- **Theme**: Dark mode by default (next-themes)

## Migration Status: SQLite → Supabase
**IN PROGRESS** as of April 2026.

### What's done:
- `backup-data.json` — full export of SQLite data (81 records)
- `@supabase/supabase-js` installed
- `.env.local` has Supabase URL + publishable key
- `lib/supabase.ts` — Supabase client utility
- `scripts/supabase-schema.sql` — Postgres schema matching all SQLite tables
- Supabase MCP server connected for direct DB access

### What's left:
- Create tables in Supabase (run schema SQL or use MCP)
- Import data from `backup-data.json` into Supabase
- Rewrite all API routes (`app/api/`) from `db.prepare(...)` sync calls to `supabase.from(...)` async calls
- Test locally against Supabase
- Deploy to Vercel
- Add SSO/auth (Supabase Auth with Google/GitHub OAuth)
- Set up as PWA for mobile home screen access

## Architecture

### Key directories
- `app/api/` — API routes (tasks, notes, goals, categories, etc.)
- `components/focus/` — Today page components (BlockEditor, PagePanel)
- `components/vault/` — Task management views (VaultView, TaskEditModal)
- `components/views/` — Top-level view components
- `components/ui/` — shadcn/ui primitives
- `lib/` — Utilities, types, hooks, DB client

### Data model
- **Tasks** have a `destination` field: `on_deck` (today), `someday`, or `in_progress`
- **Tasks** have a `status`: `active` or `done`
- Auto-triage: if a task's `due_date` is today or past, it auto-moves to `on_deck`
- Tasks can have categories (tags), a consequence level, and a size estimate

### The Block Editor (`components/focus/BlockEditor.tsx`)
The daily page uses a block-based editor (like Notion). Blocks include:
- Text, headings, bullet lists, numbered lists, quotes, dividers
- A special `task-list` block that renders the task list inline
- Typing `- task name` + Enter creates a new task (dash-to-task pattern)
- After creating a task, the block auto-fills with `- ` for rapid task entry
- The dash pattern works with or without a space after the dash

### Task interactions
- **Click check circle** = mark task done
- **Long-press check circle (1.5s)** = move to "In Progress" tab
- **Inline title editing** — click title to edit, blur saves (even empty), Escape cancels
- **Hover actions**: Date picker, Not Today, Delete
- **Tabs**: "Today" and "In Progress" tabs in the task list header
- In Progress tab shows a green count badge when items exist

### Important files
- `lib/db.ts` — SQLite database connection + all migration logic (will be replaced)
- `lib/supabase.ts` — New Supabase client (replacing db.ts)
- `lib/hooks.ts` — SWR hooks (`useTasks`, `useNote`, etc.)
- `lib/types.ts` — TypeScript types for all entities
- `lib/triage.ts` — Auto-triage logic (due date → destination)
- `lib/done-toast.ts` — Task completion toast with undo
- `components/focus/PagePanel.tsx` — Main daily page container
- `components/focus/BlockEditor.tsx` — Block editor + task list rendering

## Design Decisions

### Why SQLite originally?
Simple, zero-config, fast for local dev. But can't deploy to serverless (Vercel) since there's no persistent filesystem.

### Why Supabase?
- Free Postgres hosting
- Built-in auth (SSO with Google/GitHub)
- Works perfectly with Vercel
- The `sb_publishable_` key format is the new Supabase key format (not the legacy `eyJ...` JWT)

### Why not a VPS?
Considered DigitalOcean Droplet + SQLite (no code changes needed), but Supabase + Vercel gives free hosting, built-in auth, and zero server maintenance.

### In Progress feature
Added a third task destination (`in_progress`) for tasks that are started but waiting on something. Long-press the check circle to move a task there. The DB schema CHECK constraint was migrated to include this new value.

## Credentials / Environment
- Supabase URL: stored in `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`
- Supabase key: stored in `.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- SQLite DB: `focus.db` in project root (local only, will be deprecated)

## User Preferences
- John prefers practical, no-BS explanations
- Explain technical concepts in plain language when asked
- Don't over-engineer — keep it simple
- The app is for personal use, not a SaaS product
