"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isNative, NATIVE_OAUTH_REDIRECT } from "@/lib/native";
import { createClient } from "@/lib/supabase-browser";
import { isAllowedEmail } from "@/lib/allowlist";

// Native-only. Completes the Google OAuth round-trip that began in the system
// browser: when Supabase redirects to the custom URL scheme, iOS reopens the
// app and fires `appUrlOpen`. We exchange the code for a session here — inside
// the webview — so the cookies land on the Vercel origin that SSR + middleware
// read. Mirrors the web /auth/callback route, allowlist gate included.
export default function NativeAuth() {
  const router = useRouter();

  useEffect(() => {
    if (!isNative()) return;

    let remove: (() => void) | undefined;

    (async () => {
      const { App } = await import("@capacitor/app");
      const { Browser } = await import("@capacitor/browser");

      const handle = await App.addListener("appUrlOpen", async ({ url }) => {
        if (!url.startsWith(NATIVE_OAUTH_REDIRECT)) return;
        await Browser.close().catch(() => {});

        const code = new URL(url).searchParams.get("code");
        if (!code) {
          router.replace("/login?error=auth");
          return;
        }

        const supabase = createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace("/login?error=auth");
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!isAllowedEmail(user?.email)) {
          await supabase.auth.signOut();
          router.replace("/login?error=unauthorized");
          return;
        }

        router.replace("/");
      });

      remove = () => handle.remove();
    })();

    return () => remove?.();
  }, [router]);

  return null;
}
