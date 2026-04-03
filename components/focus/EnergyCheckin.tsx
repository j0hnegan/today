"use client";

import { Button } from "@/components/ui/button";
import type { EnergyLevel } from "@/lib/types";

interface EnergyCheckinProps {
  userName: string;
  onSelect: (energy: EnergyLevel) => void;
}

export function EnergyCheckin({ userName, onSelect }: EnergyCheckinProps) {
  async function handleSelect(energy: EnergyLevel) {
    await fetch("/api/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ energy }),
    });
    localStorage.setItem(
      "focus_last_checkin_at",
      new Date().toISOString()
    );
    onSelect(energy);
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center space-y-8 max-w-md">
        <div className="space-y-2">
          <h2 className="text-2xl font-medium tracking-tight">
            Hey {userName}, how&apos;s your energy looking today?
          </h2>
        </div>
        <div className="flex gap-4 justify-center">
          <Button
            variant="outline"
            size="lg"
            className="px-8 py-6 text-base hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400"
            onClick={() => handleSelect("low")}
          >
            Low
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="px-8 py-6 text-base hover:bg-yellow-500/10 hover:border-yellow-500/40 hover:text-yellow-400"
            onClick={() => handleSelect("medium")}
          >
            Medium
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="px-8 py-6 text-base hover:bg-green-500/10 hover:border-green-500/40 hover:text-green-400"
            onClick={() => handleSelect("high")}
          >
            High
          </Button>
        </div>
      </div>
    </div>
  );
}
