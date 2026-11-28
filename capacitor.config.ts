import type { CapacitorConfig } from "@capacitor/cli";

// Hush is a server-rendered Next.js app, so it can't be shipped as a static
// export bundled inside the .app. Instead the native WKWebView loads the live
// Vercel deployment (`server.url`). `webDir` is required by the CLI but its
// contents are unused at runtime in this mode.
const config: CapacitorConfig = {
  appId: "io.johnegan.hush",
  appName: "Today",
  webDir: "public",
  server: {
    // Your Vercel production URL. Override per-build with HUSH_APP_URL.
    url: process.env.HUSH_APP_URL ?? "https://hush.vercel.app",
    cleartext: false,
  },
};

export default config;
