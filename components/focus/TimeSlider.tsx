"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import type { TimeAvailable } from "@/lib/types";

const SNAP_POINTS: number[] = [0, 33, 67, 100];
const LABELS: { value: number; label: string; time: TimeAvailable }[] = [
  { value: 0, label: "1-15 min", time: "xs" },
  { value: 33, label: "15-30 min", time: "small" },
  { value: 67, label: "30-60 min", time: "medium" },
  { value: 100, label: "60+ min", time: "large" },
];

function snapToNearest(val: number): number {
  let closest = SNAP_POINTS[0];
  let minDist = Math.abs(val - closest);
  for (const p of SNAP_POINTS) {
    const dist = Math.abs(val - p);
    if (dist < minDist) {
      minDist = dist;
      closest = p;
    }
  }
  return closest;
}

interface TimeSliderProps {
  onSelect: (time: TimeAvailable) => void;
}

export function TimeSlider({ onSelect }: TimeSliderProps) {
  const [value, setValue] = useState(33); // default to 15-30 min

  const current = LABELS.find((l) => l.value === value) ?? LABELS[1];

  function handleValueChange(vals: number[]) {
    setValue(snapToNearest(vals[0]));
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center space-y-8 max-w-sm w-full">
        <h2 className="text-xl font-medium tracking-tight">
          How much time do you have?
        </h2>

        <div className="space-y-6 px-2">
          <Slider
            value={[value]}
            onValueChange={handleValueChange}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />

          <div className="flex justify-between text-xs text-muted-foreground">
            {LABELS.map((l) => (
              <button
                key={l.value}
                type="button"
                className={`transition-colors ${
                  l.value === value
                    ? "text-foreground font-medium"
                    : "hover:text-foreground/70"
                }`}
                onClick={() => setValue(l.value)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          size="lg"
          className="px-8"
          onClick={() => onSelect(current.time)}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
