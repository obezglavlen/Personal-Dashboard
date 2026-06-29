"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "./sidebar";

interface AppShellProps {
  headerRight: React.ReactNode;
  children: React.ReactNode;
}

/**
 * AppShell wraps the authenticated layout: sidebar (rail on desktop,
 * drawer on mobile) + top bar (hamburger + page header right side) + main.
 *
 * Kept separate from app/(dashboard)/layout.tsx because the latter is a
 * server component (it calls getServerSession), and the drawer state has
 * to live in a client component.
 */
export function AppShell({ headerRight, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground lg:h-screen lg:flex-row lg:overflow-hidden">
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex flex-1 flex-col lg:overflow-hidden">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-safe lg:h-16 lg:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="-ml-2"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="text-sm font-semibold tracking-tight">Dashboard</span>
          </div>
          {/* On desktop this headerRight takes the full right side */}
          <div className="flex items-center justify-end gap-2 lg:ml-auto">
            {headerRight}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4 pb-safe sm:px-6 sm:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}