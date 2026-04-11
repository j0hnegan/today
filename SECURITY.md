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

### 2026-04-11 — Drop `'unsafe-eval'` from the production CSP
**What:**
- `next.config.mjs` now branches the `script-src` directive on `NODE_ENV`. Production: `script-src 'self' 'unsafe-inline'`. Dev: `script-src 'self' 'unsafe-inline' 'unsafe-eval'` (Next.js HMR needs eval).

**Why:**
- `'unsafe-eval'` lets attackers turn arbitrary strings into executable code via `eval()`, `new Function(...)`, etc. Three.js compiles WebGL shaders via the GPU driver, and Next.js's production bundle doesn't use eval — so production has no legitimate use for it.
- Considered nonce-based CSP (would also drop `'unsafe-inline'`) but it required ~50 lines of middleware/layout machinery and a per-request nonce-tagging dance through `next-themes`. The marginal benefit over just dropping eval is small for a single-user app behind Google OAuth + email allowlist + (now) input validation. Skipped.

**Don't undo:**
- The `isProd` branch in `next.config.mjs`. If you ever set `NODE_ENV=development` in prod (don't), you'd silently re-enable eval.

### 2026-04-11 — CSP additions, dev auth lockdown, email PII drop
**What:**
- Appended `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` to the global CSP in `next.config.mjs`.
- Replaced the implicit `NODE_ENV === "development"` auth bypass in `lib/api-auth.ts` and `middleware.ts` with an explicit `HUSH_DEV_AUTH=1` env var. The bypass also refuses to engage in production builds or on Vercel (`VERCEL=1`). Local dev now requires `HUSH_DEV_AUTH=1` in `.env.local`.
- Removed the rejected user's email from the auth-callback redirect URL — `app/auth/callback/route.ts` now redirects to `/login?error=unauthorized` only. `LoginErrorMessage` shows a single generic message.

**Why:**
- The three CSP additions close XSS amplification paths: injected `<base href>` retargeting, `<object>`/`<embed>` plugin content, and attacker-controlled `<form action>` posts.
- The old `NODE_ENV === "development"` check meant a single misconfigured env var anywhere in the deploy pipeline would have completely unlocked the app. The new flag is impossible to trigger on Vercel even with `HUSH_DEV_AUTH=1` set, because Vercel always sets `VERCEL=1`.
- The rejected email was leaking PII into browser history, server access logs, and Referer headers to any third-party resource the login page loaded.

**Don't undo:**
- The `HUSH_DEV_AUTH` flag in `lib/api-auth.ts` and `middleware.ts` (going back to `NODE_ENV` is the foot-gun we just removed).
- The Vercel guard (`!process.env.VERCEL`) — that's the deploy-safety net.
- The generic error message on `/login`. Don't add the email back to the URL.

## Manual operations

### Revoking a session
Supabase dashboard → Authentication → Users → click your user → "Sign out user." This invalidates the cookie everywhere immediately.

### Adding a new allowed email
Edit `lib/allowlist.ts` (add to `ALLOWED_EMAILS`), commit, deploy. There's no runtime allowlist UI by design — keeping it source-controlled means every change is reviewable in git.
