"use client";

import { Card, CardContent } from "@/components/ui/card";

export function FocusCardSkeleton() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-5 pt-8 pb-8 px-8">
          {/* Title */}
          <div className="skeleton h-6 w-3/4" />
          {/* Description lines */}
          <div className="space-y-2 mt-3">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-2/3" />
          </div>
          {/* Meta row */}
          <div className="flex items-center gap-3 mt-5">
            <div className="skeleton h-5 w-16 rounded-full" />
            <div className="skeleton h-4 w-20" />
          </div>
          {/* Buttons */}
          <div className="flex gap-3 pt-3">
            <div className="skeleton h-10 flex-1" style={{ borderRadius: "10px" }} />
            <div className="skeleton h-10 flex-1" style={{ borderRadius: "10px" }} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
