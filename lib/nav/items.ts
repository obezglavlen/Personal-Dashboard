import {
	BarChart3,
	Bookmark,
	Calculator,
	CalendarDays,
	CheckSquare,
	Coins,
	Landmark,
	LayoutDashboard,
	type LucideIcon,
	MessageSquare,
	PiggyBank,
	Receipt,
	Repeat,
	Settings,
	StickyNote,
	Wallet,
	Wrench,
} from "lucide-react";

/**
 * Sidebar nav registry: the single source of truth for the app's navigation
 * items and their default order. `href` doubles as each item's stable id in the
 * user's stored ordering (`UserSettings.navLayout`).
 *
 * To add a nav item: append an entry here. `resolveNavOrder` appends any
 * unknown-to-the-stored-order hrefs, so existing users automatically gain new
 * items at the end without losing their custom order.
 */
export interface NavItem {
	href: string;
	label: string;
	icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
	{ href: "/", label: "Dashboard", icon: LayoutDashboard },
	{ href: "/assistant", label: "Assistant", icon: MessageSquare },
	{ href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
	{ href: "/notes", label: "Notes", icon: StickyNote },
	{ href: "/tasks", label: "Tasks", icon: CheckSquare },
	{ href: "/calendar", label: "Calendar", icon: CalendarDays },
	{ href: "/subscriptions", label: "Subscriptions", icon: Receipt },
	{ href: "/recurring", label: "Recurring", icon: Repeat },
	{ href: "/expenses", label: "Expenses", icon: Wallet },
	{ href: "/budgets", label: "Budgets", icon: PiggyBank },
	{ href: "/net-worth", label: "Net Worth", icon: Landmark },
	{ href: "/reports", label: "Reports", icon: BarChart3 },
	{ href: "/income", label: "Income", icon: Coins },
	{ href: "/taxes", label: "Taxes", icon: Calculator },
	{ href: "/tools", label: "Tools", icon: Wrench },
	{ href: "/settings", label: "Settings", icon: Settings },
];

export const DEFAULT_NAV_ORDER: string[] = NAV_ITEMS.map((i) => i.href);

const NAV_HREFS = new Set(DEFAULT_NAV_ORDER);

/** Persisted shape stored in `UserSettings.navLayout`. */
export interface NavLayout {
	order: string[];
}

/**
 * Merge a stored (possibly null/partial/stale) nav order with the registry:
 * drop hrefs no longer in the registry, append registry hrefs missing from the
 * stored order. Always returns a complete ordering covering every current nav
 * item exactly once.
 */
export function resolveNavOrder(raw: unknown): string[] {
	const stored = (raw ?? {}) as Partial<NavLayout>;
	const storedOrder = Array.isArray(stored.order) ? stored.order : [];

	const seen = new Set<string>();
	const order: string[] = [];

	for (const href of storedOrder) {
		if (NAV_HREFS.has(href) && !seen.has(href)) {
			seen.add(href);
			order.push(href);
		}
	}
	for (const href of DEFAULT_NAV_ORDER) {
		if (!seen.has(href)) {
			seen.add(href);
			order.push(href);
		}
	}
	return order;
}
