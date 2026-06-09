# App-wide nav speedup — middleware auth-token cache (003 follow-up)

The middleware ran supabase.auth.getUser() — a network round trip — on every request
(every nav + every SWR revalidation): the systemic "app feels sluggish" cause. Fix:
cache getUser-validated tokens (exact-token key, 60s TTL, near-expiry bypass so refresh
still works, 100-entry cap). Forged cookies can never enter the cache. PR #27.
