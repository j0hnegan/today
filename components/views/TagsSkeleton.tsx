"use client";

export function TagsSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-6 pt-[80px] pb-8">
      {/* Header: "Goals" */}
      <div className="skeleton h-5 w-16 mb-6" />

      {/* Input placeholder */}
      <div className="mb-8">
        <div className="skeleton h-10 w-full rounded-[10px]" />
      </div>

      {/* Tag rows */}
      <div className="space-y-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-[10px] px-3 py-2.5">
            <div className="skeleton h-3 w-3 rounded-full flex-shrink-0" />
            <div className="skeleton h-4" style={{ width: `${90 + i * 30}px` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
