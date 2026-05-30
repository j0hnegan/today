"use client";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/cashflow";

interface CashFlowDateButtonProps {
  value: string;
  disabled?: boolean;
  onChange: (date: string) => void;
  className?: string;
}

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function CashFlowDateButton({
  value,
  disabled,
  onChange,
  className,
}: CashFlowDateButtonProps) {
  const selected = value ? new Date(value + "T00:00:00") : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "text-sm text-foreground tabular-nums outline-none transition-colors hover:text-foreground/80 disabled:cursor-default disabled:opacity-70",
            className
          )}
        >
          {value ? formatDate(value) : "Set date"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(day) => {
            if (day) onChange(toDateStr(day));
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
