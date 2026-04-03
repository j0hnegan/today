"use client";

import { Button } from "@/components/ui/button";

interface CompletionScreenProps {
  isLowEnergyDone: boolean;
  onContinue: () => void;
  onRest: () => void;
}

export function CompletionScreen({
  isLowEnergyDone,
  onContinue,
  onRest,
}: CompletionScreenProps) {
  if (isLowEnergyDone) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-6 max-w-sm">
          <h2 className="text-xl font-medium tracking-tight">
            That was the only critical one. You&apos;re done. Rest.
          </h2>
          <Button variant="ghost" onClick={onRest}>
            Got it
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center space-y-6 max-w-sm">
        <h2 className="text-xl font-medium tracking-tight">
          Nice work. That&apos;s one less thing.
        </h2>
        <p className="text-muted-foreground">Ready for another one?</p>
        <div className="flex gap-4 justify-center">
          <Button onClick={onContinue}>Yes, keep going</Button>
          <Button variant="ghost" onClick={onRest}>
            No, I&apos;m good
          </Button>
        </div>
      </div>
    </div>
  );
}
