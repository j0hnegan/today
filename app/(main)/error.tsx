"use client";

// Catches failures thrown while a route's Server Component prefetches data
// (see lib/server-fetchers.ts). Renders a quiet retry instead of an empty
// page so a transient DB hiccup is visible and recoverable in one click.
export default function MainError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-6 pt-[80px] pb-8">
      <h1 className="text-lg font-semibold tracking-tight">
        Couldn&apos;t load this page
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Something went wrong reaching the database. This is usually temporary.
      </p>
      <button
        onClick={reset}
        className="mt-4 inline-flex items-center rounded-md border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent"
      >
        Try again
      </button>
    </div>
  );
}
