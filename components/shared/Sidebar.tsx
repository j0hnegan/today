"use client";

import { useState } from "react";
import { CircleCheck, ListTodo, Target, Eclipse, FileText, PanelLeftClose, PanelLeft, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import type { View } from "@/lib/types";

const navItems: { view: View; label: string; icon: typeof CircleCheck; color: string }[] = [
  { view: "focus", label: "Today", icon: CircleCheck, color: "#22c55e" },
  { view: "vault", label: "My Tasks", icon: ListTodo, color: "#a855f7" },
  { view: "tags", label: "Goals", icon: Target, color: "#f59e0b" },
  { view: "docs", label: "Docs", icon: FileText, color: "#06b6d4" },
];

interface SidebarProps {
  view: View;
  onNavigate: (view: View) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ view, onNavigate, collapsed, onToggleCollapse }: SidebarProps) {
  const [hoveredView, setHoveredView] = useState<View | null>(null);
  const { theme, setTheme } = useTheme();

  if (collapsed) {
    return (
      <aside className="flex h-screen w-[52px] flex-col items-center bg-card">
        <div className="px-0 py-6 flex flex-col items-center gap-1" style={{ paddingLeft: "14px", paddingRight: "14px" }}>
          <Eclipse className="h-5 w-5 text-foreground" />
          <button
            onClick={onToggleCollapse}
            className="flex items-center justify-center w-9 h-9 rounded-[10px] text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors mt-1"
            title="Expand sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 flex flex-col items-center gap-1 pt-8 px-1.5">
          {navItems.map((item) => {
            const isActive = view === item.view;
            return (
              <button
                key={item.view}
                onClick={() => onNavigate(item.view)}
                title={item.label}
                className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-[10px] transition-colors",
                  isActive ? "bg-accent" : "hover:bg-accent/50"
                )}
              >
                <item.icon
                  className="h-4 w-4"
                  style={{ color: isActive ? item.color : "hsl(var(--muted-foreground))" }}
                />
              </button>
            );
          })}
        </nav>
        <div className="flex flex-col items-center gap-2 pb-4">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center justify-center w-9 h-9 rounded-[10px] text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-screen w-[220px] flex-col bg-card">
      <div className="px-5 py-6 flex items-center justify-between">
        <h1 className="flex items-center gap-1 text-lg font-bold text-foreground" style={{ letterSpacing: "-0.5px" }}>
          <Eclipse className="h-5 w-5" />
          Today
        </h1>
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-center w-9 h-9 rounded-[10px] text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>
      <nav className="flex-1 px-3 pt-12 pb-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = view === item.view;
            const isHovered = hoveredView === item.view;
            return (
              <li key={item.view}>
                <button
                  onClick={() => onNavigate(item.view)}
                  onMouseEnter={() => setHoveredView(item.view)}
                  onMouseLeave={() => setHoveredView(null)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <item.icon
                    className="h-4 w-4 transition-colors"
                    style={{ color: isActive || isHovered ? item.color : undefined }}
                  />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="px-3 pb-4 space-y-1">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <p className="px-3 text-xs text-muted-foreground font-mono">
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">
            ⌘K
          </kbd>{" "}
          Quick add
        </p>
      </div>
    </aside>
  );
}
