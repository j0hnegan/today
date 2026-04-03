# Hush — Roadmap

## Overview

Pre-split plans (both instances), then post-split (personal only). Each plan is self-contained and executed one at a time.

---

## Pre-Split Plans

### Plan 1: Foundation + Categories/Goals + Docs
**Status:** Not started

**Scope:**

**Foundation (DB + Security):**
- Add missing DB indexes (`due_date`, `checkins.created_at`)
- Security headers in `next.config.mjs` (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `X-XSS-Protection`)
- `DB_PATH` env var in `lib/db.ts` (enables both local and hosted deployments)
- `busy_timeout` already set to 1000ms (verified adequate)
- `PRAGMA integrity_check` on startup to catch corruption early
- Foreign key enforcement already enabled (`PRAGMA foreign_keys = ON`)

**Categories/Goals:**
- Rename `tags` → `categories`, add `goals` table under categories
- Update all API routes, types, hooks, and UI (tags→categories, goals view restructure)
- New `documents` table with category/goal linking
- New Docs nav item, directory view, doc editor
- `sort_order` on goals and documents tables

**Key files:** `lib/db.ts`, `lib/types.ts`, `lib/hooks.ts`, `app/api/categories/`, `app/api/goals/`, `app/api/docs/`, `components/views/GoalsView.tsx`, `components/views/DocsView.tsx`, `components/docs/DocEditor.tsx`, `components/shared/CategoryInput.tsx`, `Sidebar.tsx`, `page.tsx`

---

### Plan 2: Multimedia
**Status:** Not started

**Scope:**
- Migrate notes from settings key-value to proper `notes` table
- New `attachments` table for tracking uploaded files
- File upload API (`/api/uploads`) — save to `public/uploads/`, validate types, 10MB max
- Drag-and-drop, paste-from-clipboard, and file picker in notes editor (`PagePanel.tsx`)
- Same upload support in doc editor (`DocEditor.tsx`)
- Same upload support in task descriptions (`TaskEditModal.tsx`) — attach PDFs, images, videos, docs to tasks
- Images render inline, videos render as players, files render as download links
- Migrate existing `today_page_content_*` settings into `notes` table
- New `/api/notes` endpoint (GET by date, PATCH by date) replaces settings-based note storage

**Key files:** `lib/db.ts`, `app/api/uploads/route.ts`, `app/api/notes/route.ts`, `lib/hooks.ts`, `components/focus/PagePanel.tsx`, `components/docs/DocEditor.tsx`, `components/vault/TaskEditModal.tsx`

---

### Plan 3: Global Search
**Status:** Not started

**Scope:**
- Search API (`/api/search?q=keyword`) — queries across tasks (title + description), notes (content), documents (title + content), categories (name), goals (title + description)
- Results include short snippets with match context
- Search bar component in sidebar with `Cmd+/` keyboard shortcut
- Results dropdown grouped by type, clickable to navigate
- Debounced input (300ms)

**Key files:** `app/api/search/route.ts`, `components/shared/SearchBar.tsx`, `components/shared/Sidebar.tsx`, `lib/hooks.ts`, `app/(main)/page.tsx`

---

### → Push to GitHub → Clone to work laptop

---

## Post-Split Plans (personal instance only)

### Plan 4: DigitalOcean + Cloudflare Access
**Status:** Not started

**Scope:**
- Deploy to DO App Platform with persistent volume for SQLite
- Point domain through Cloudflare, enable Cloudflare Access (free, 1 user)
- Policy: only your Google email gets through
- Cost: $5/month DO + free Cloudflare
- Zero code changes (DB_PATH env var already added in Plan 1)

---

### Plan 5: PWA
**Status:** Not started

**Scope:**
- `public/manifest.json` — app name, icons, `display: standalone`
- App icons at 192x192 and 512x512
- Minimal service worker (`public/sw.js`) — cache app shell, network-first for API
- iOS meta tags in `app/layout.tsx`
- Mobile layout: sidebar → bottom tab bar (media query)
- Touch-friendly sizing (44x44px targets)

**Key files:** `public/manifest.json`, `public/sw.js`, `app/layout.tsx`, `components/shared/Sidebar.tsx`

---

## Future (not planned yet)

- **Voice transcription:** Revisit when a local/private option exists
- **Email integration:** Personal instance only, via Resend

---

## Security Summary

| Concern | Personal (DO + Cloudflare) | Work (localhost) |
|---------|---------------------------|------------------|
| Authentication | Cloudflare Access (Google SSO) | Not needed (localhost only) |
| XSS | Low risk, DOMPurify added with multimedia | Same |
| CSRF | Cloudflare same-site cookies | Not applicable |
| Data at rest | `chmod 600 focus.db` | OS disk encryption |
| Data in transit | HTTPS via Cloudflare | localhost only |
| Security headers | Added in Plan 1 | Same |

---

## Work Instance Notes

After cloning:
- `npm install && npm run dev` → localhost:3000
- SQLite on local disk, zero external API calls
- No telemetry, analytics, or third-party scripts
- Safe for confidential work data
- Run as background service via launch agent or `pm2`
