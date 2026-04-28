// Cache-Control header for read-only API routes that should be served
// stale-while-revalidate at the edge. `private` keeps responses out of
// shared CDN caches (the data is auth-scoped). `max-age=0` forces the
// browser to revalidate on every nav, but `stale-while-revalidate=30`
// lets it render the stale response instantly while the revalidation
// runs in the background.
export const SWR_HEADERS = {
  "Cache-Control": "private, max-age=0, stale-while-revalidate=30",
} as const;
