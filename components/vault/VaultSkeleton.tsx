"use client";

export function VaultSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-6 pt-[80px] pb-8">
      {/* Header: title + filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="skeleton h-5 w-16" />
        <div className="skeleton h-4 w-14" />
      </div>

      <div className="space-y-2">
        {/* On Deck section trigger */}
        <div className="flex items-center gap-2 py-3 px-2">
          <div className="skeleton h-4 w-4" />
          <div className="skeleton h-4 w-20" />
          <div className="skeleton h-5 w-8 rounded-full" />
        </div>

        <div className="h-[1px] w-full bg-border" />

        {/* Someday section trigger */}
        <div className="flex items-center gap-2 py-3 px-2">
          <div className="skeleton h-4 w-4" />
          <div className="skeleton h-4 w-20" />
          <div className="skeleton h-5 w-8 rounded-full" />
        </div>

        <div className="h-[1px] w-full bg-border" />

        {/* Done section trigger */}
        <div className="flex items-center gap-2 py-3 px-2">
          <div className="skeleton h-4 w-4" />
          <div className="skeleton h-4 w-14" />
          <div className="skeleton h-5 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}
