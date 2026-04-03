"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Task } from "@/lib/types";
import { mutate } from "swr";

interface SnoozeModalProps {
  task: Task;
  open: boolean;
  onClose: () => void;
  onSnoozed: () => void;
}

const snoozeReasons = [
  { key: "out_of_energy", label: "Out of energy", days: 1 },
  { key: "waiting", label: "Waiting on something", days: 3 },
  { key: "deadline_moved", label: "Deadline moved", days: 7 },
  { key: "dont_want_to", label: "Just don't want to", days: 1 },
] as const;

export function SnoozeModal({
  task,
  open,
  onClose,
  onSnoozed,
}: SnoozeModalProps) {
  async function handleSnooze(reason: string, days: number) {
    const snoozedUntil = new Date();
    snoozedUntil.setDate(snoozedUntil.getDate() + days);
    snoozedUntil.setHours(9, 0, 0, 0);

    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        snooze_reason: reason,
        snoozed_until: snoozedUntil.toISOString(),
      }),
    });

    mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/tasks"));
    onSnoozed();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Why not now?</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          {snoozeReasons.map((reason) => (
            <Button
              key={reason.key}
              variant="outline"
              className="w-full justify-start text-left"
              onClick={() => handleSnooze(reason.key, reason.days)}
            >
              {reason.label}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
