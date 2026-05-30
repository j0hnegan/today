"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Plus, Sun, Moon, LogOut } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createClient } from "@/lib/supabase-browser";
import {
  navItems,
  isActiveRoute,
  preloadKeys,
  UserAvatar,
} from "@/components/shared/Sidebar";
import type { EnergyLevel } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

const ENERGY_COLOR: Record<EnergyLevel, string> = {
  low: "#ef4444",
  medium: "#f59e0b",
  high: "#22c55e",
};

function openQuickAdd() {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
  );
}

interface MobileNavProps {
  energy: EnergyLevel | null;
  onEnergyClick: () => void;
}

export function MobileNav({ energy, onEnergyClick }: MobileNavProps) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setUser(data.user));
  }, []);

  async function handleSignOut() {
    await createClient().auth.signOut();
    router.push("/login");
  }

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-card/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {navItems.map((item) => {
        const active = isActiveRoute(item.href, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            onPointerDown={() => preloadKeys(item.preloadKeys)}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[10px] font-medium transition-colors active:bg-accent/50"
          >
            <item.icon
              className="h-[22px] w-[22px]"
              style={{
                color: active ? item.color : "hsl(var(--muted-foreground))",
              }}
            />
            <span className={active ? "text-foreground" : "text-muted-foreground"}>
              {item.label}
            </span>
          </Link>
        );
      })}

      {/* Add task */}
      <button
        type="button"
        onClick={openQuickAdd}
        aria-label="Add task"
        className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[10px] font-medium text-muted-foreground active:bg-accent/50"
      >
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-foreground text-background">
          <Plus className="h-4 w-4" />
        </span>
        Add
      </button>

      {/* Account */}
      <Popover open={accountOpen} onOpenChange={setAccountOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Account"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[10px] font-medium text-muted-foreground active:bg-accent/50"
          >
            <UserAvatar user={user} size={22} />
            Account
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" sideOffset={8} className="w-52 p-1">
          {energy && (
            <button
              type="button"
              onClick={() => {
                setAccountOpen(false);
                onEnergyClick();
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: ENERGY_COLOR[energy] }}
              />
              <span className="capitalize">{energy} energy</span>
              <span className="ml-auto text-xs underline">Update</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </PopoverContent>
      </Popover>
    </nav>
  );
}
