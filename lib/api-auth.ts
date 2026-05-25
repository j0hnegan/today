import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Dev-only auth bypass. Requires the explicit `HUSH_DEV_AUTH=1` opt-in,
 * refuses to engage in production builds, and hard-fails on Vercel
 * (which always sets `VERCEL=1`). Without all three guards, an accidentally
 * deployed `NODE_ENV=development` would have unlocked the entire app.
 */
const DEV_AUTH_BYPASS =
  process.env.HUSH_DEV_AUTH === "1" &&
  process.env.NODE_ENV !== "production" &&
  !process.env.VERCEL;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function requireAuth() {
  const botToken = process.env.HUSH_BOT_TOKEN;
  if (botToken) {
    const authHeader = headers().get("authorization") ?? "";
    if (authHeader.startsWith("Bearer ")) {
      const presented = authHeader.slice("Bearer ".length);
      if (timingSafeEqual(presented, botToken)) {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceKey) {
          return NextResponse.json(
            { error: "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY missing" },
            { status: 500 }
          );
        }
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
        return { supabase, user: { id: "bot" } };
      }
    }
  }

  if (DEV_AUTH_BYPASS) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    return { supabase, user: { id: "dev" } };
  }

  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — ignore.
          }
        },
      },
    }
  );

  // Middleware already validated the session and forwarded the user ID.
  // Skip the second getUser() network round-trip when the header is present.
  const middlewareUserId = headers().get("x-hush-user-id");
  if (middlewareUserId) {
    return { supabase, user: { id: middlewareUserId } };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return { supabase, user };
}
