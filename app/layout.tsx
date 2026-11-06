import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import NativeAuth from "@/components/native/NativeAuth";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Today",
  description: "Energy-aware personal task manager",
  robots: "noindex, nofollow",
  icons: {
    icon: { url: "/icon.svg", type: "image/svg+xml" },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Today",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Render under the iOS status bar / home indicator so the bottom nav can
  // pad itself with env(safe-area-inset-*). Zoom stays enabled for a11y.
  viewportFit: "cover",
  themeColor: "#101012",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <head>
        {supabaseUrl && (
          <>
            <link rel="preconnect" href={supabaseUrl} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={supabaseUrl} />
          </>
        )}
        {/* Apply the persisted Today panel split BEFORE first paint so a
            resized layout doesn't flash 50/50 then jump (same trick as the
            theme script). The divider drag writes this var directly. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var s=parseFloat(localStorage.getItem('focus-today-split'));if(!isNaN(s)&&s>0&&s<1)document.documentElement.style.setProperty('--task-basis',(s*100).toFixed(2)+'%')}catch(e){}",
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          storageKey="focus-theme"
        >
          {children}
          <NativeAuth />
        </ThemeProvider>
      </body>
    </html>
  );
}
