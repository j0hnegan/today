import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
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

export async function requireAuth() {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return { supabase, user };
}
