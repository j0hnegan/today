"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface WeeklyNudgeProps {
  nudgeDay: string;
  onReview: () => void;
}

export function WeeklyNudge({ nudgeDay, onReview }: WeeklyNudgeProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const today = new Date()
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
    const alreadyDismissed = sessionStorage.getItem("weekly_nudge_dismissed");
    setDismissed(today !== nudgeDay || alreadyDismissed === "true");
  }, [nudgeDay]);

  if (dismissed) return null;

  function handleDismiss() {
    sessionStorage.setItem("weekly_nudge_dismissed", "true");
    setDismissed(true);
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-[10px] border border-border bg-accent/30 px-4 py-3 mb-4">
      <p className="text-sm">
        Weekly check-in: anything in Someday become real?
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onReview}>
          Review Someday tasks
        </Button>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
