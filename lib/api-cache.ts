// Cache-Control header for read-only API routes. `private` keeps responses
// out of shared CDN caches (the data is auth-scoped). `max-age=0` +
// `must-revalidate` forces a fresh fetch on every request rather than serving
// a stale copy first. We deliberately dropped `stale-while-revalidate`: the
// task lists are kept live by Supabase Realtime (lib/useTaskRealtime.ts), so a
// stale window only produced the "refresh, wait, then it updates" lag.
export const SWR_HEADERS = {
  "Cache-Control": "private, max-age=0, must-revalidate",
} as const;
