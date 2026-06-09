import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Dev-only auth bypass — see lib/api-auth.ts for the full rationale.
 * Requires `HUSH_DEV_AUTH=1`, refuses to engage in production, hard-fails on Vercel.
 */
// 60s cache of getUser-validated access tokens (module scope survives warm
// edge invocations; cold starts just re-validate).
const tokenCache = new Map<string, { id: string; ts: number }>();
const TOKEN_CACHE_TTL_MS = 60_000;

const DEV_AUTH_BYPASS =
  process.env.HUSH_DEV_AUTH === "1" &&
  process.env.NODE_ENV !== "production" &&
  !process.env.VERCEL;

if (DEV_AUTH_BYPASS) {
  console.warn("[hush] DEV AUTH BYPASS ACTIVE — never use in production");
}

export async function middleware(request: NextRequest) {
  if (DEV_AUTH_BYPASS) {
    return NextResponse.next({ request });
  }

  // Bot/cron Bearer-token paths handle auth in the route via requireAuth().
  // Skip the cookie-session check so the Authorization header reaches the handler.
  if (
    request.nextUrl.pathname.startsWith("/api/discord/") ||
    request.nextUrl.pathname.startsWith("/api/cron/") ||
    request.nextUrl.pathname.startsWith("/api/mcp/")
  ) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Perf: getUser() is a network round-trip to Supabase Auth on EVERY request
  // (every nav + every SWR revalidation) — the single biggest source of app-wide
  // latency. Cache VALIDATED tokens briefly so repeat requests skip the trip.
  // Safe because only tokens that getUser() has already validated server-side
  // enter the cache (a forged cookie can never get in), keyed by the exact
  // token string; revocation worst-case is the TTL. Expired tokens bypass the
  // cache so the refresh path still runs through getUser().
  let userId: string | null = null;

  const {
    data: { session },
  } = await supabase.auth.getSession(); // local cookie read, no network
  const token = session?.access_token;
  const expMs = (session?.expires_at ?? 0) * 1000;

  if (token && expMs - Date.now() > 60_000) {
    const hit = tokenCache.get(token);
    if (hit && Date.now() - hit.ts < TOKEN_CACHE_TTL_MS) {
      userId = hit.id;
    }
  }

  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && token) {
      if (tokenCache.size > 100) tokenCache.clear();
      tokenCache.set(token, { id: user.id, ts: Date.now() });
    }
    userId = user?.id ?? null;
  }

  // Pass user ID to API routes so requireAuth() can skip the second getUser() call
  if (userId) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-hush-user-id", userId);
    const newResponse = NextResponse.next({ request: { headers: requestHeaders } });
    // Carry over any cookies Supabase set during token refresh
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      newResponse.cookies.set(cookie.name, cookie.value);
    });
    supabaseResponse = newResponse;
  }

  // Not logged in and not on login page → redirect to login (or 401 for API)
  if (!userId && !request.nextUrl.pathname.startsWith("/login") && !request.nextUrl.pathname.startsWith("/auth")) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Logged in and on login page → redirect to app
  if (userId && request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg).*)",
  ],
};
