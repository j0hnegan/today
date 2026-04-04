"use client";

import { useState, useEffect } from "react";
import { Eclipse } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

const dayImages = [
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&q=80",
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80",
  "https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=1200&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80",
];

const nightImages = [
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=80",
  "https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=1200&q=80",
  "https://images.unsplash.com/photo-1532978379173-523e16f371f2?w=1200&q=80",
];

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

export default function LoginPage() {
  const [isDay, setIsDay] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [quote, setQuote] = useState(quotes[0]);

  useEffect(() => {
    const hour = new Date().getHours();
    setIsDay(hour >= 6 && hour < 19);
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, []);

  const images = isDay ? dayImages : nightImages;

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [images.length]);

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
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-12">
      {/* Left column — sign in (4/12) */}
      <div className="flex items-center justify-center bg-background lg:col-span-4">
        <div className="w-full max-w-xs space-y-6 px-8 text-center">
          <div className="space-y-2">
            <h1 className="flex items-center justify-center gap-1.5 text-2xl font-bold tracking-tight">
              <Eclipse className="h-5 w-5" />
              Today
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to continue
            </p>
          </div>
          <button
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-md border border-border bg-card px-4 py-3 text-sm font-medium text-card-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
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
        </div>
      </div>

      {/* Right column — image + quote (8/12) */}
      <div className="relative hidden overflow-hidden lg:col-span-8 lg:block">
        {images.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${src})`,
              opacity: i === activeIndex ? 1 : 0,
              transition: "opacity 3s ease-in-out",
            }}
          />
        ))}
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative flex h-full items-center justify-center p-12">
          <blockquote className="max-w-lg space-y-3 text-center">
            <p className="text-xl font-medium leading-relaxed text-white/90 italic">
              &ldquo;{quote.text}&rdquo;
            </p>
            <cite className="block text-sm text-white/60 not-italic">
              {quote.ref}
            </cite>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
