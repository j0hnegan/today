"use client";

import { useState, useEffect, Suspense } from "react";
import { Eclipse } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import dynamic from "next/dynamic";

// Three.js (~140 kB) only draws the decorative background, so load it
// lazily on the client — the login card paints immediately without it.
const Backgrounds = dynamic(() => import("./Backgrounds"), { ssr: false });

const quotes = [
  { text: "Trust in the Lord with all your heart, and do not lean on your own understanding.", ref: "Proverbs 3:5" },
  { text: "The light shines in the darkness, and the darkness has not overcome it.", ref: "John 1:5" },
  { text: "Come to me, all who labor and are heavy laden, and I will give you rest.", ref: "Matthew 11:28" },
  { text: "Commit your work to the Lord, and your plans will be established.", ref: "Proverbs 16:3" },
  { text: "I am the way, and the truth, and the life.", ref: "John 14:6" },
  { text: "The fear of the Lord is the beginning of wisdom.", ref: "Proverbs 9:10" },
  { text: "Peace I leave with you; my peace I give to you.", ref: "John 14:27" },
  { text: "A gentle answer turns away wrath, but a harsh word stirs up anger.", ref: "Proverbs 15:1" },
];


function LoginErrorMessage() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");

  const errorMessage =
    errorCode === "unauthorized"
      ? "That email isn't authorized to access this app."
      : errorCode === "auth"
        ? "Sign-in failed. Please try again."
        : null;

  if (!errorMessage) return null;
  return (
    <p role="alert" className="text-xs text-red-300/90 leading-snug px-1">
      {errorMessage}
    </p>
  );
}

export default function LoginPage() {
  const [quote, setQuote] = useState(quotes[0]);

  useEffect(() => {
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, []);

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
      <Backgrounds />
      <div
        data-login-card
        className="relative z-[2] w-full max-w-sm rounded-2xl p-8 text-center space-y-6"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(25px)",
          WebkitBackdropFilter: "blur(25px)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        <h1 className="flex items-center justify-center gap-1.5 text-2xl font-bold tracking-tight text-white">
          <Eclipse className="h-5 w-5" />
          Today
        </h1>

        <blockquote className="space-y-1.5">
          <p className="text-sm leading-relaxed text-white/70 italic">
            &ldquo;{quote.text}&rdquo;
          </p>
          <cite className="block text-xs text-white/40 not-italic">
            {quote.ref}
          </cite>
        </blockquote>

        <div className="space-y-2">
          <button
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-md border border-white/5 bg-white/5 px-4 py-3 text-sm font-medium text-accent-foreground shadow-sm transition-colors hover:bg-white/[0.08]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>
          <Suspense fallback={null}>
            <LoginErrorMessage />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
