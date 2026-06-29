"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { TaxSidebar } from "./tax-sidebar";

export default function TaxesLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex-1 min-w-0">{children}</div>

      {/* Desktop sidebar — appears on the right at lg+ */}
      <aside className="hidden lg:block">
        <TaxSidebar />
      </aside>

      {/* Mobile collapsible — placed below the table on phones.
          Keeping it at the top of the page on mobile would push records
          below the fold; users add tax types infrequently so the bottom
          accordion is the right trade-off. */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="mobile-tax-sidebar"
          className="flex w-full items-center justify-between rounded-md border border-border bg-card px-4 py-3 text-sm font-medium"
        >
          <span>Manage tax types</span>
          {open ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        {open && (
          <div id="mobile-tax-sidebar" className="mt-3">
            <TaxSidebar />
          </div>
        )}
      </div>
    </div>
  );
}