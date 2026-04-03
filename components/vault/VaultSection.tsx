"use client";

import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface VaultSectionProps {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
}

export function VaultSection({
  title,
  count,
  defaultOpen = true,
  children,
  headerExtra,
}: VaultSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2 py-3 px-2 rounded-[10px] bg-white/5">
        <CollapsibleTrigger className="flex items-center gap-2 flex-1 min-w-0">
          <ChevronRight
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform flex-shrink-0",
              open && "rotate-90"
            )}
          />
          <span className="text-sm font-medium">{title}</span>
          <Badge variant="secondary" className="text-xs font-mono ml-1">
            {count}
          </Badge>
        </CollapsibleTrigger>
        {headerExtra}
      </div>
      <CollapsibleContent>
        <div className="space-y-0.5 pt-1 pb-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
