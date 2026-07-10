"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, LayoutDashboard, Pencil, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiPut } from "@/lib/api-client";
import { DEFAULT_NAV_ORDER, NAV_ITEMS, type NavItem } from "@/lib/nav/items";
import { cn } from "@/lib/utils";

const BY_HREF: Record<string, NavItem> = Object.fromEntries(
  NAV_ITEMS.map((i) => [i.href, i]),
);

interface SidebarProps {
  /** Mobile-only: when true the sidebar renders as a slide-in drawer.
   *  When false (or on desktop) it renders as a sticky rail. */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  /** Persisted nav order (hrefs), already reconciled against the registry. */
  initialNavOrder?: string[];
}

export function Sidebar({
  mobileOpen = false,
  onMobileClose,
  initialNavOrder,
}: SidebarProps) {
  const pathname = usePathname();
  const base = initialNavOrder ?? DEFAULT_NAV_ORDER;

  // Reorder state lives here (a single Sidebar instance renders both the
  // desktop rail and the mobile drawer, so they share one order/edit state).
  // `saved` is the last-persisted order Cancel reverts to.
  const [order, setOrder] = useState<string[]>(base);
  const [saved, setSaved] = useState<string[]>(base);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrder((prev) =>
        arrayMove(
          prev,
          prev.indexOf(active.id as string),
          prev.indexOf(over.id as string),
        ),
      );
    }
  }

  async function save() {
    setSaving(true);
    try {
      await apiPut("/api/settings", { navLayout: { order } });
      setSaved(order);
      setEditing(false);
      toast.success("Navigation saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setOrder(saved);
    setEditing(false);
  }

  const nav = (
    <NavBody
      pathname={pathname}
      order={order}
      editing={editing}
      saving={saving}
      sensors={sensors}
      onDragEnd={handleDragEnd}
      onEdit={() => setEditing(true)}
      onCancel={cancel}
      onReset={() => setOrder(DEFAULT_NAV_ORDER)}
      onSave={save}
    />
  );

  return (
    <>
      {/* Desktop rail (>= lg). On mobile it's hidden; the drawer handles it. */}
      <aside className="hidden lg:flex h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        {nav}
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
        {nav}
      </aside>
    </>
  );
}

interface NavBodyProps {
  pathname: string;
  order: string[];
  editing: boolean;
  saving: boolean;
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (event: DragEndEvent) => void;
  onEdit: () => void;
  onCancel: () => void;
  onReset: () => void;
  onSave: () => void;
}

function NavBody({
  pathname,
  order,
  editing,
  saving,
  sensors,
  onDragEnd,
  onEdit,
  onCancel,
  onReset,
  onSave,
}: NavBodyProps) {
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
        {editing ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              {order.map((href) => {
                const item = BY_HREF[href];
                if (!item) return null;
                return <SortableNavRow key={href} item={item} />;
              })}
            </SortableContext>
          </DndContext>
        ) : (
          order.map((href) => {
            const item = BY_HREF[href];
            if (!item) return null;
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
          })
        )}
      </nav>

      {/* Reorder controls */}
      <div className="border-t border-sidebar-border p-3">
        {editing ? (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={onCancel}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={onSave}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-sidebar-foreground/70"
              onClick={onReset}
              disabled={saving}
            >
              Reset to default
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4 shrink-0" />
            Reorder
          </Button>
        )}
      </div>
    </>
  );
}

function SortableNavRow({ item }: { item: NavItem }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.href });
  const Icon = item.icon;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md bg-sidebar-accent/40 px-2 py-2 text-sm font-medium text-sidebar-foreground"
    >
      <button
        type="button"
        aria-label={`Drag to reorder ${item.label}`}
        className="cursor-grab touch-none text-sidebar-foreground/60 hover:text-sidebar-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Icon className="h-4 w-4 shrink-0 text-sidebar-foreground/70" />
      <span className="truncate">{item.label}</span>
    </div>
  );
}
