import { Capacitor } from "@capacitor/core";
import { createClient } from "@/lib/supabase-browser";

// Custom URL scheme Supabase redirects back to after Google consent. Must match
// the CFBundleURLTypes entry in ios/App/App/Info.plist and the Supabase
// project's "Redirect URLs" allowlist.
export const NATIVE_OAUTH_REDIRECT = "hush://auth/callback";

export function isNative(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

// Google refuses OAuth inside an embedded webview, so on native we generate the
// auth URL ourselves and open it in the system browser. supabase-js stores the
// PKCE verifier in the webview here, so the matching exchange in NativeAuth
// (back inside the webview) succeeds and writes the session cookies.
export async function signInWithGoogleNative(): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: NATIVE_OAUTH_REDIRECT,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error("Supabase returned no OAuth URL");

  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url: data.url });
}
