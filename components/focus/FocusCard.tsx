"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TagBadge } from "@/components/shared/TagBadge";
import { Check } from "lucide-react";
import { normalizeConsequence } from "@/lib/types";
import { linkifyText } from "@/lib/linkify";
import type { Task } from "@/lib/types";

interface FocusCardProps {
  task: Task;
  onDone: () => void;
  onSnooze: () => void;
  onEdit?: () => void;
}

const sizeLabels = {
  xs: "1-15 min",
  small: "15-30 min",
  medium: "30-60 min",
  large: "60+ min",
};

function isDueSoon(task: Task): boolean {
  if (!task.due_date) return false;
  const due = new Date(task.due_date + "T23:59:59");
  const twoDaysFromNow = new Date();
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
  return due <= twoDaysFromNow && normalizeConsequence(task.consequence) === "hard";
}

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) return "Due today";
  if (date.getTime() === tomorrow.getTime()) return "Due tomorrow";
  if (date < today) return "Overdue";

  return `Due ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

export function FocusCard({ task, onDone, onSnooze, onEdit }: FocusCardProps) {
  const dueSoon = isDueSoon(task);
  const hasConsequence = normalizeConsequence(task.consequence) === "hard";

  return (
    <div className="flex flex-1 items-center justify-center p-8 animate-fade-in-up">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-5 pt-8 pb-8 px-8">
          {/* Clickable content area — opens edit modal */}
          <div
            className={onEdit ? "cursor-pointer" : undefined}
            onClick={onEdit}
            role={onEdit ? "button" : undefined}
            tabIndex={onEdit ? 0 : undefined}
            onKeyDown={
              onEdit
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onEdit();
                    }
                  }
                : undefined
            }
          >
            <h2 className="text-xl font-semibold tracking-tight">
              {task.title}
            </h2>

            {task.description && (
              <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                {linkifyText(task.description)}
              </p>
            )}

            <div className="flex items-center gap-3 text-sm mt-5">
              {hasConsequence && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
                    <span className="text-muted-foreground">
                      Has consequences
                    </span>
                  </div>
                  <span className="text-muted-foreground/40">·</span>
                </>
              )}
              <Badge variant="secondary" className="font-normal text-xs">
                {sizeLabels[task.size]}
              </Badge>
              {task.due_date && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span
                    className={`font-mono text-xs ${
                      dueSoon ? "text-red-400" : "text-muted-foreground"
                    }`}
                  >
                    {formatDueDate(task.due_date)}
                  </span>
                </>
              )}
            </div>

            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-5">
                {task.tags.map((tag) => (
                  <TagBadge key={tag.id} tag={tag} />
                ))}
              </div>
            )}
          </div>

          {/* Action buttons — outside clickable area */}
          <div className="flex gap-3 pt-3">
            <Button onClick={onDone} className="flex-1">
              <Check className="mr-2 h-4 w-4" />
              Done
            </Button>
            <Button variant="ghost" onClick={onSnooze} className="flex-1">
              Not right now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
