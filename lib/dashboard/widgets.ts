/**
 * Dashboard widget registry: the single source of truth for which widgets the
 * dashboard can show and their default order. The dashboard page renders each
 * widget's content into a slot keyed by `id`; the client grid arranges them
 * according to the user's stored layout (`UserSettings.dashboardLayout`).
 *
 * To add a widget: append an entry here and provide its slot in the dashboard
 * page. `resolveLayout` appends any unknown-to-the-stored-layout ids, so
 * existing users automatically gain new widgets without losing their order.
 */

export const WIDGETS = [
	{ id: "stats", title: "Stat cards" },
	{ id: "income-expense", title: "Income / Expense chart" },
	{ id: "recent-bookmarks", title: "Recent bookmarks" },
	{ id: "recent-tasks", title: "Recent tasks" },
] as const;

export type WidgetId = (typeof WIDGETS)[number]["id"];

export const DEFAULT_ORDER: WidgetId[] = WIDGETS.map((w) => w.id);

const WIDGET_IDS = new Set<string>(DEFAULT_ORDER);

/** Persisted shape stored in `UserSettings.dashboardLayout`. */
export interface DashboardLayout {
	order: string[];
	hidden: string[];
}

/**
 * Merge a stored (possibly null/partial/stale) layout with the registry:
 * drop ids no longer in the registry, append registry ids missing from the
 * stored order, and keep only known hidden ids. Always returns a complete,
 * valid ordering covering every current widget exactly once.
 */
export function resolveLayout(raw: unknown): {
	order: WidgetId[];
	hidden: Set<string>;
} {
	const stored = (raw ?? {}) as Partial<DashboardLayout>;
	const storedOrder = Array.isArray(stored.order) ? stored.order : [];
	const storedHidden = Array.isArray(stored.hidden) ? stored.hidden : [];

	const seen = new Set<string>();
	const order: WidgetId[] = [];

	for (const id of storedOrder) {
		if (WIDGET_IDS.has(id) && !seen.has(id)) {
			seen.add(id);
			order.push(id as WidgetId);
		}
	}
	for (const id of DEFAULT_ORDER) {
		if (!seen.has(id)) {
			seen.add(id);
			order.push(id);
		}
	}

	const hidden = new Set(storedHidden.filter((id) => WIDGET_IDS.has(id)));
	return { order, hidden };
}
