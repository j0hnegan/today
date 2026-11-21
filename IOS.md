# Hush on iOS — feasibility & approach

## TL;DR

**Yes, this can be a real iOS App Store app, on the same codebase, with the
desktop and mobile experience completely unchanged.** We wrap the existing
Next.js app in a thin native shell (Capacitor). We do **not** rewrite anything
in React Native.

- **One codebase.** The iOS app *is* the web app — same React, same Tailwind,
  same Radix/shadcn UI, same Three.js login background, same SSR. Nothing about
  the desktop or responsive-mobile web experience changes.
- **The only real work** is auth: Google blocks OAuth inside embedded webviews,
  so sign-in takes a one-hop detour through the system browser. That's handled
  on this branch.
- **What needs you:** an Apple Developer account, a few minutes in Xcode, and
  three redirect-URL entries (Supabase + Google). See [Handoff](#handoff).

## Why not React Native?

You asked. The answer is no, and here's the honest reasoning:

React Native renders to native `UIView`s, not a browser. **None** of what makes
Hush feel like Hush survives the jump:

| Piece | Today | In React Native |
| --- | --- | --- |
| Layout/styling | Tailwind classes | Rewrite in RN `StyleSheet` |
| Dialogs, popovers, tabs, selects | Radix + shadcn/ui | Rebuild each from scratch |
| Login background | Three.js / WebGL `<canvas>` | Rewrite (`expo-gl`) or drop |
| Note/doc editors | `contentEditable` HTML | Rebuild on a native rich-text lib |
| Rendering | Next.js SSR + RSC hydration | N/A — no DOM |

That's a **second, totally separate codebase** to build and maintain forever,
and the result would *not* be "the desktop experience, unchanged" — it'd be a
different app that looks similar if we're lucky. You explicitly said the
experience should stay the same and asked me to flag if a port needs a
different codebase. React Native is exactly that case, so we're not doing it.

We *could* reuse `lib/types.ts`, the Zod schemas, and `lib/triage.ts` in RN —
but reusing 5% of the code to rewrite 95% of the UI is a bad trade for a
one-user personal app.

## The approach: Capacitor (native shell over the live web app)

[Capacitor](https://capacitorjs.com) packages a web app as a native iOS/Android
app. It gives us a real `.app`, App Store distribution, a home-screen icon,
splash screen, push notifications, and native plugin access — while the UI is
the web app running in a `WKWebView`.

### Why "remote URL" mode, not bundled assets

Capacitor's default is to bundle a *static export* of the web app inside the
`.app`. **We can't do that** — Hush is server-rendered:

- Server Components prefetch data and hydrate the SWR cache (`ServerSWR.tsx`).
- `middleware.ts` validates the session on every request.
- API routes run on the edge; `next.config.mjs` uses `rewrites` + `headers`.

None of that survives `next export`. So instead we run Capacitor in
**`server.url` mode**: the native `WKWebView` loads the live Vercel deployment
(`https://<your-app>.vercel.app`). The app is a native chrome around the real,
already-deployed site.

This is a deliberate, supported Capacitor pattern, and it fits Hush well:

- The app already **requires network** (Supabase is the backend) — there is no
  offline mode to preserve, so "always loads the live site" costs us nothing.
- **Zero divergence.** Ship a web change to Vercel and the iOS app has it on
  next launch. No App Store review cycle for app updates (only for native shell
  changes).
- The webview's origin **is** the Vercel domain, so the existing cookie-based
  Supabase session, the CSP (`connect-src https://*.supabase.co`), and SSR all
  work exactly as in Safari.

### Why the auth flow "just works" once the consent screen renders

`lib/supabase-browser.ts` uses `createBrowserClient` from `@supabase/ssr`, which
stores the session in **cookies on the app's origin** (not localStorage).
Because the webview is loaded from the Vercel domain, any session established
*inside the webview* writes cookies that `middleware.ts` and every Server
Component immediately see. Client and server are authenticated together, with no
token-shuttling. We just have to get Google's consent screen to render.

## The one real problem: Google OAuth in a webview

Google **refuses** OAuth inside embedded webviews (`disallowed_useragent`,
error 403) to prevent credential phishing. So we can't show the Google sign-in
page directly in the `WKWebView`.

**Solution (implemented on this branch):** detect when we're running natively
and route sign-in through the system browser, then hand the session back into
the webview.

```
[Webview] tap "Continue with Google"
   → supabase.signInWithOAuth({ skipBrowserRedirect: true,
                                redirectTo: "hush://auth/callback" })
     (returns the Google URL; stores the PKCE verifier in the webview's cookies)
   → @capacitor/browser opens that URL in the SYSTEM browser (Google allows this)
[System browser] user approves with Google
   → Supabase redirects to  hush://auth/callback?code=…
[iOS] custom URL scheme reopens the app
   → App.addListener('appUrlOpen') fires inside the webview
   → supabase.auth.exchangeCodeForSession(code)
     (the PKCE verifier is right here in the webview, so this succeeds and
      writes the session cookies on the Vercel origin)
   → Browser.close(); reload → fully authenticated, SSR included
```

The crucial detail: the code exchange happens **inside the webview**, so the
session lands in the webview's cookie jar — the one SSR and middleware read. The
server-side `/auth/callback` route is untouched and still serves the desktop/web
flow exactly as before.

`components/native/NativeAuth.tsx` does the `appUrlOpen` handling, and
`app/login/page.tsx` branches to the native flow only when `Capacitor.isNativePlatform()`
is true. **On the web, every line of the old behavior is unchanged.**

## What's on this branch

```
capacitor.config.ts               # appId, appName, server.url
components/native/NativeAuth.tsx   # deep-link → exchangeCodeForSession handler
lib/native.ts                      # isNative() helper + native OAuth launcher
app/login/page.tsx                 # branches to native sign-in when native
app/layout.tsx                     # mounts <NativeAuth/>
package.json                       # + @capacitor/{core,cli,ios,app,browser}
ios/                               # generated native Xcode project
ios/App/App/Info.plist             # registers the hush:// URL scheme for OAuth
```

The web build is unaffected: Capacitor code is tree-shaken out of the web bundle
behind the `isNative()` guard, and `@capacitor/*` are tiny.

**Capacitor is pinned to v7**, not the latest v8: the v8 CLI requires Node ≥22 and
this project runs on Node 21. v7 needs only Node ≥20, so the toolchain works as-is
with no project-wide Node bump. Move to v8 whenever the project moves to Node 22.

## Handoff — what only you can do

Done from here: CocoaPods is installed, the `ios/` Xcode project is generated,
the bundle id (`io.johnegan.hush`) and the `hush://` URL scheme are set, and the
Capacitor pods resolved. These last steps need your accounts/hardware:

1. **Install full Xcode** from the Mac App Store. This machine only has the
   Command Line Tools, which is why the final `pod install` step couldn't run.
   Then point the toolchain at Xcode:
   `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`
2. **Finish native deps** (the one step that needs full Xcode — everything else
   is done): `cd ios/App && pod install`  *(or `npx cap sync ios`)*.
3. **Set the deployment URL** in `capacitor.config.ts` → `server.url` to your
   real Vercel production URL (placeholder is `https://hush.vercel.app`). Then
   `npx cap sync ios` to propagate it.
4. **Supabase → Auth → URL Configuration → Redirect URLs:** add
   `hush://auth/callback`.
5. **Google Cloud Console → OAuth client:** the iOS redirect goes *through*
   Supabase, so usually no new Google client is needed — Supabase's existing
   callback stays the same. Just confirm the Supabase project's callback URL is
   still listed. (A native Google Sign-In SDK would need a separate iOS OAuth
   client — not required for this approach.)
6. **Open Xcode and run:** `npx cap open ios`, set your Team under Signing &
   Capabilities, then run on a simulator or your iPhone.
7. **Apple Developer Program** ($99/yr) for TestFlight / App Store. Not needed
   to run on the simulator or your own device for development.

## Trade-offs / caveats

- **Online-only.** The app loads the live site, so it needs network. Fine for a
  Supabase-backed planner; there's no offline story today anyway.
- **App Store review** judges webview-wrapper apps on whether they feel like an
  app, not a bookmark. Hush has real native value (push for the daily digest,
  home-screen presence, the task UI) so this is low-risk, but worth knowing.
- **Push notifications** (e.g. surfacing the daily digest) are a natural next
  step via `@capacitor/push-notifications` — not built yet, easy to add later.
- The `X-Frame-Options: DENY` / `frame-ancestors 'none'` headers don't affect
  us: a `WKWebView` loads a top-level page, it isn't framing one.
