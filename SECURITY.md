# Hush — Security Notes

This file records what we've hardened, when, and **why** — so we don't accidentally rip out a defense in a future refactor without understanding what it was protecting against.

## Threat model
Single-user personal app behind Google OAuth + a hard-coded email allowlist (`lib/allowlist.ts`). Deployed on Vercel against hosted Supabase. Realistic attackers: someone trying random Google accounts against the public URL, scanners hitting endpoints, or anyone who gets read access to logs / browser history. **Not** in scope: nation-state actors, supply-chain attacks against npm.

The single-user model is load-bearing for these defenses. If a second user is ever added, revisit RLS scoping (especially on the `settings` table) before opening it up.

## Hardening log

### 2026-04-11 — Input validation across all API routes
**What:**
- Added [`zod`](https://zod.dev) to validate every API request body and search-param. Validators live in `lib/validation/` (one file per resource).
- `app/api/settings` PATCH now enforces an explicit allowlist of writable keys (`WRITABLE_SETTINGS_KEYS` in `lib/validation/settings.ts`). Any other key is rejected with 400.
- Route `[id]` params now go through `parseIdParam()` so non-numeric / negative IDs return 400 instead of leaking `NaN` into Supabase queries.

**Why:**
- Without this, every POST/PATCH was destructuring untrusted JSON straight into a Supabase upsert. The settings route in particular was a textbook **mass-assignment** vulnerability — a caller could write arbitrary keys, replace any existing setting, or insert garbage. (`/api/settings PATCH {"any_key": "x"}` would have succeeded.)
- Query enums (`destination`, `status`, `entity_type`) were passed straight to `.eq()` with no validation, so unknown values silently returned empty arrays and got logged in Supabase. Now we 400 with a clear message.
- Title/description fields had no length cap, so a single POST could insert a multi-MB row.

**Don't undo:**
- The validation helpers in `lib/validation/helpers.ts` (`validateBody`, `validateSearchParams`, `parseIdParam`).
- The per-resource schemas under `lib/validation/`.
- The `WRITABLE_SETTINGS_KEYS` allowlist — if you add a new setting, add the key to that list AND seed it in `scripts/supabase-schema.sql`.

## Manual operations

### Revoking a session
Supabase dashboard → Authentication → Users → click your user → "Sign out user." This invalidates the cookie everywhere immediately.

### Adding a new allowed email
Edit `lib/allowlist.ts` (add to `ALLOWED_EMAILS`), commit, deploy. There's no runtime allowlist UI by design — keeping it source-controlled means every change is reviewable in git.
