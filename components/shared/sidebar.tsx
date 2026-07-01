"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { X } from "lucide-react";
import {
  LayoutDashboard,
  Bookmark,
  StickyNote,
  CheckSquare,
  Settings,
  Wrench,
  Receipt,
  Calculator,
  Wallet,
  PiggyBank,
  BarChart3,
  Landmark,
  MessageSquare,
  Repeat,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assistant", label: "Assistant", icon: MessageSquare },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/subscriptions", label: "Subscriptions", icon: Receipt },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/expenses", label: "Expenses", icon: Wallet },
  { href: "/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/net-worth", label: "Net Worth", icon: Landmark },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/taxes", label: "Taxes", icon: Calculator },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  /** Mobile-only: when true the sidebar renders as a slide-in drawer.
   *  When false (or on desktop) it renders as a sticky rail. */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  // Close the drawer on route change — clicking a nav item should hide it.
  useEffect(() => {
    if (mobileOpen) onMobileClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Lock body scroll while the drawer is open on mobile.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  // ESC to close on mobile for keyboard users.
  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onMobileClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, onMobileClose]);

  return (
    <>
      {/* Desktop rail (>= lg). On mobile it's hidden; the drawer handles it. */}
      <aside className="hidden lg:flex h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <NavBody pathname={pathname} />
      </aside>

      {/* Mobile drawer overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200 lg:hidden",
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
        onClick={onMobileClose}
        aria-hidden="true"
      />

      {/* Mobile drawer panel */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-200 ease-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        <button
          type="button"
          onClick={onMobileClose}
          aria-label="Close navigation"
          className="absolute right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] inline-flex h-10 w-10 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        <NavBody pathname={pathname} />
      </aside>
    </>
  );
}

function NavBody({ pathname }: { pathname: string }) {
  return (
    <>
      {/* min-h + pt-safe so the iOS status-bar / Dynamic Island inset expands
          this row (a fixed h-16 border-box would clip the padding). Applies to
          both the desktop rail and the mobile drawer since both render NavBody. */}
      <div className="flex min-h-16 items-center border-b border-sidebar-border px-6 pt-safe">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <LayoutDashboard className="h-4 w-4" />
          </div>
          <span className="text-base font-semibold tracking-tight">Dashboard</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}