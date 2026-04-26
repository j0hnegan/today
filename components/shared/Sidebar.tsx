"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { CircleCheck, ListTodo, Target, Eclipse, FileText, PanelLeftClose, PanelLeft, Sun, Moon, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

const navItems: { href: string; label: string; icon: typeof CircleCheck; color: string }[] = [
  { href: "/", label: "Today", icon: CircleCheck, color: "#22c55e" },
  { href: "/vault", label: "My Tasks", icon: ListTodo, color: "#a855f7" },
  { href: "/tags", label: "Goals", icon: Target, color: "#f59e0b" },
  { href: "/docs", label: "Docs", icon: FileText, color: "#06b6d4" },
];

function isActiveRoute(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function UserAvatar({ user, size = 32 }: { user: User | null; size?: number }) {
  const avatarUrl =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    user?.identities?.[0]?.identity_data?.avatar_url ||
    user?.identities?.[0]?.identity_data?.picture;
  const name = user?.user_metadata?.full_name || user?.email || "";
  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const [imgFailed, setImgFailed] = useState(false);

  // The avatar URL comes from Supabase session metadata (Google OAuth) and is
  // contained by `img-src 'self' data: blob: https://*.googleusercontent.com`
  // in the global CSP. If you ever widen this to other providers, update the
  // CSP allowlist in `next.config.mjs` in lockstep. Plain <img> is fine here:
  // it's a single 24-32px avatar, next/image gives no real LCP benefit.
  if (avatarUrl && !imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-medium"
      style={{ width: size, height: size }}
    >
      {initials || "?"}
    </div>
  );
}

function UserMenu({ user, collapsed, theme, setTheme }: { user: User | null; collapsed: boolean; theme: string | undefined; setTheme: (theme: string) => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const name = user?.user_metadata?.full_name || user?.email || "User";

  if (collapsed) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center justify-center w-9 h-9 rounded-[10px] hover:bg-accent/50 transition-colors"
          title={name}
        >
          <UserAvatar user={user} size={28} />
        </button>
        {open && (
          <div className="absolute bottom-full left-0 mb-1 w-40 rounded-lg border border-border bg-popover p-1 shadow-lg z-50">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
      >
        <UserAvatar user={user} size={24} />
        <span className="truncate">{name}</span>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-full rounded-lg border border-border bg-popover p-1 shadow-lg z-50">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname() ?? "/";
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

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
            const isActive = isActiveRoute(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
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
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col items-center gap-2 pb-4">
          <UserMenu user={user} collapsed theme={theme} setTheme={setTheme} />
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
            const isActive = isActiveRoute(item.href, pathname);
            const isHovered = hoveredHref === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onMouseEnter={() => setHoveredHref(item.href)}
                  onMouseLeave={() => setHoveredHref(null)}
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
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="px-3 pb-4">
        <UserMenu user={user} collapsed={false} theme={theme} setTheme={setTheme} />
      </div>
    </aside>
  );
}
