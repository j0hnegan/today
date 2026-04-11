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

### 2026-04-11 — Byte-sniff uploads against their declared MIME type
**What:**
- `app/api/uploads/route.ts` POST and `app/api/uploads/[id]/route.ts` PATCH (thumbnail) now use `file-type` to read the file's magic bytes and reject any upload whose actual content doesn't match the declared `Content-Type`.
- Plain text formats (`text/plain`, `text/csv`, `text/markdown`) have no magic bytes, so they fall through and trust the client header. Defined as `UNSNIFFABLE_TYPES`.

**Why:**
- Without sniffing, an attacker could rename an HTML payload as `evil.png` with `Content-Type: image/png`, the server would store it under `/public/uploads`, and serving it back from that origin would let the HTML execute (despite the CSP, because `/uploads/*` has its own `default-src 'none'` lockdown — but the attack surface still includes things like content-type confusion in download tools, image proxies, or other consumers of the file URL).
- The server already enforces a MIME allowlist (`ALLOWED_TYPES`) but was trusting the client to be honest about which type it was sending.

**Don't undo:**
- The `fileTypeFromBuffer` check in both upload routes.
- The `UNSNIFFABLE_TYPES` carve-out — `file-type` correctly returns `undefined` for plain text, and rejecting them outright would break a real use case.

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

### 2026-04-11 — Re-enable ESLint in builds
**What:**
- Removed `eslint.ignoreDuringBuilds: true` from `next.config.mjs`. `npm run build` now fails on lint errors.
- Cleaned up the dead-code lint errors that had accumulated in `components/focus/BlockEditor.tsx` (unused imports, unused state value, two unreachable `useCallback`s, missing `useCallback` deps). One real bug surfaced as a side effect: the size-filter UI in the task list was computing `filtered` but throwing it away — now wired into the sort.
- Two genuinely-orphaned-but-not-yet-deleted prop pipelines (`onEditTask` plumbing for the dormant PagePanel edit modal) are kept with `eslint-disable-next-line` comments + a note explaining why.
- `<img>` tag in `components/shared/Sidebar.tsx` (Google avatar) gets a single `eslint-disable-next-line @next/next/no-img-element` plus a comment pointing future-us at the matching `img-src` directive in the CSP.

**Why:**
- `ignoreDuringBuilds` silently defeats `eslint-plugin-react`, the Next.js rules, and any future security plugin we add (e.g. `eslint-plugin-security`). A PR that ships an unused-vars warning today is also a PR that could ship `eval()` tomorrow without anyone noticing.
- Re-enabling lint in CI/build means new warnings break the build instead of getting buried in `npm run lint` output that nobody runs.

**Don't undo:**
- Don't re-add `eslint.ignoreDuringBuilds`. If a single rule is genuinely too noisy, disable that *rule* in `.eslintrc`, don't blanket-disable the whole linter.
- Keep the avatar comment in `Sidebar.tsx` — it's the load-bearing reminder that widening the avatar source means widening the CSP `img-src` allowlist in lockstep.

## Manual operations

### Revoking a session
Supabase dashboard → Authentication → Users → click your user → "Sign out user." This invalidates the cookie everywhere immediately.

### Adding a new allowed email
Edit `lib/allowlist.ts` (add to `ALLOWED_EMAILS`), commit, deploy. There's no runtime allowlist UI by design — keeping it source-controlled means every change is reviewable in git.
