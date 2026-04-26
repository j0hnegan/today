"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { mutate } from "swr";
import { Sidebar } from "@/components/shared/Sidebar";
import { RightRail } from "@/components/shared/RightRail";
import { QuickAddModal } from "@/components/shared/QuickAddModal";
import { AutomationRunner } from "@/components/shared/AutomationRunner";
import { Toaster } from "@/components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLatestCheckin } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { EnergyLevel } from "@/lib/types";

const ENERGY_OPTIONS: {
  value: EnergyLevel;
  label: string;
  color: string;
  hoverClass: string;
}[] = [
  {
    value: "low",
    label: "Low",
    color: "#ef4444",
    hoverClass:
      "hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400",
  },
  {
    value: "medium",
    label: "Medium",
    color: "#f59e0b",
    hoverClass:
      "hover:bg-yellow-500/10 hover:border-yellow-500/40 hover:text-yellow-400",
  },
  {
    value: "high",
    label: "High",
    color: "#22c55e",
    hoverClass:
      "hover:bg-green-500/10 hover:border-green-500/40 hover:text-green-400",
  },
];

function showRailFor(pathname: string): boolean {
  if (pathname === "/") return false;
  if (pathname === "/vault" || pathname.startsWith("/vault/")) return false;
  return true;
}

export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const [energy, setEnergy] = useState<EnergyLevel | null>(null);
  const [energyModalOpen, setEnergyModalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { data: latestCheckin } = useLatestCheckin();

  useEffect(() => {
    const saved = localStorage.getItem("focus-sidebar-collapsed");
    if (saved === "true") setSidebarCollapsed(true);
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((prev) => {
      localStorage.setItem("focus-sidebar-collapsed", String(!prev));
      return !prev;
    });
  }

  useEffect(() => {
    if (latestCheckin && !energy) {
      setEnergy(latestCheckin.energy);
    }
  }, [latestCheckin, energy]);

  async function handleEnergyUpdate(level: EnergyLevel) {
    await fetch("/api/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ energy: level }),
    });
    localStorage.setItem("focus_last_checkin_at", new Date().toISOString());
    setEnergy(level);
    setEnergyModalOpen(false);
    mutate(
      (key: unknown) =>
        typeof key === "string" && key.startsWith("/api/checkins")
    );
  }

  const railVisible = showRailFor(pathname);

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />
      <div className="flex-1 min-w-0 relative flex">
        <div className="absolute top-4 right-6 z-10 flex items-center gap-[24px]">
          {energy && (
            <button
              onClick={() => setEnergyModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
            >
              Energy:{" "}
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  backgroundColor:
                    energy === "low"
                      ? "#ef4444"
                      : energy === "medium"
                        ? "#f59e0b"
                        : "#22c55e",
                }}
              />
              <span className="capitalize">{energy}</span> —{" "}
              <span className="underline">update</span>
            </button>
          )}
          <button
            onClick={() => {
              document.dispatchEvent(
                new KeyboardEvent("keydown", {
                  key: "k",
                  metaKey: true,
                  bubbles: true,
                })
              );
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-accent/50 hover:bg-accent transition-colors pl-[8px] pr-[4px] py-[4px] text-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Add task
            <kbd className="ml-1 text-[10px] font-mono text-muted-foreground bg-muted rounded px-1 py-0.5">
              ⌘K
            </kbd>
          </button>
        </div>
        <main
          className={cn(
            "overflow-auto",
            railVisible ? "flex-[8]" : "flex-1"
          )}
        >
          {children}
        </main>
        {railVisible && (
          <div className="flex-[4] min-w-0">
            <RightRail />
          </div>
        )}
      </div>

      <Dialog open={energyModalOpen} onOpenChange={setEnergyModalOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="text-center">
              How&apos;s your energy?
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-3 justify-center py-4">
            {ENERGY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleEnergyUpdate(opt.value)}
                className={`flex flex-col items-center gap-2 rounded-lg border border-border px-6 py-4 text-sm font-medium transition-colors ${opt.hoverClass} ${energy === opt.value ? "border-foreground/30 bg-accent" : ""}`}
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: opt.color }}
                />
                {opt.label}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <QuickAddModal />
      <AutomationRunner />
      <Toaster />
    </div>
  );
}
