"use client";

import { useEffect, useState } from "react";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "./command-palette";
import { Sidebar } from "./sidebar";

interface AppShellProps {
  headerRight: React.ReactNode;
  children: React.ReactNode;
  /** Persisted sidebar nav order (hrefs), reconciled against the registry. */
  navOrder?: string[];
}

/**
 * AppShell wraps the authenticated layout: sidebar (rail on desktop,
 * drawer on mobile) + top bar (hamburger + page header right side) + main.
 *
 * Kept separate from app/(dashboard)/layout.tsx because the latter is a
 * server component (it calls getServerSession), and the drawer state has
 * to live in a client component.
 */
export function AppShell({ headerRight, children, navOrder }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Global Cmd/Ctrl+K opens the command palette from anywhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground lg:h-screen lg:flex-row lg:overflow-hidden">
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        initialNavOrder={navOrder}
      />

      <div className="flex flex-1 flex-col lg:overflow-hidden">
        {/* min-h (not fixed h): pt-safe adds env(safe-area-inset-top) padding,
            and with border-box a fixed height would cap the box so the padding
            can't push content below the iOS status bar / Dynamic Island. A
            min-height lets the header grow by the inset instead. */}
        <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between gap-2 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-safe lg:min-h-16 lg:px-6">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaletteOpen(true)}
              className="gap-2 text-muted-foreground"
              aria-label="Open command palette"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden rounded border border-border bg-muted px-1.5 text-xs sm:inline">
                ⌘K
              </kbd>
            </Button>
            {headerRight}
          </div>
        </header>

        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />


        <main className="flex-1 overflow-y-auto px-4 pt-4 pb-[max(env(safe-area-inset-bottom),2rem)] sm:px-6 sm:pt-6 sm:pb-[max(env(safe-area-inset-bottom),2.5rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}