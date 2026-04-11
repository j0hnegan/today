"use client";

export function TaskListSkeleton() {
  const rows = [80, 65, 72, 55];
  return (
    <div>
      {/* Header row — matches tab/sort layout */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3" />
          <div className="flex items-center gap-2">
            <div className="skeleton h-4 w-16" />
            <div className="skeleton h-4 w-24" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="skeleton h-6 w-6 rounded-md" />
          <div className="skeleton h-6 w-20 rounded-md" />
        </div>
      </div>
      {/* Task rows */}
      <div className="space-y-0.5">
        {rows.map((w, i) => (
          <div key={i} className="flex items-center gap-2 h-7 px-2">
            <div className="skeleton h-5 w-5 rounded-full" />
            <div className="skeleton h-3" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
