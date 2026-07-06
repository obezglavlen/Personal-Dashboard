import {
	type BudgetLike,
	type ExpenseLike,
	spentForBudget,
} from "@/lib/budget";
import { convertToBase, formatMoney } from "@/lib/format";
import { daysUntil, type Period, upcomingRenewals } from "@/lib/subscriptions";
import { escapeHtml } from "@/lib/telegram";

/**
 * Daily-digest message builder. Pure: every input is passed in and `now` is
 * injected, so the same data always renders the same text and the function is
 * unit-testable with no DB or network. Returns `null` when there is nothing to
 * report, signalling the caller to skip the Telegram send.
 */

export interface DigestSubscription {
	name: string;
	price: number;
	period: Period;
	startDate: string;
	currency: string;
}

export interface DigestBudget extends BudgetLike {
	name: string;
}

export interface DigestTask {
	title: string;
	dueDate: string | null;
	status: string;
}

/** A calendar event whose reminder lead time has been reached (already filtered
 *  by the caller — see {@link import("@/lib/calendar/expand").upcomingReminders}). */
export interface DigestEvent {
	title: string;
	start: string;
	allDay: boolean;
}

export interface DigestPrefs {
	renewals: boolean;
	budgets: boolean;
	tasks: boolean;
	events: boolean;
	/** Fraction of cap (0–1) at/above which a budget is surfaced. */
	budgetThreshold: number;
}

export interface DigestData {
	subscriptions: DigestSubscription[];
	budgets: DigestBudget[];
	/** Current-month expenses (already scoped by the caller). */
	expenses: ExpenseLike[];
	tasks: DigestTask[];
	/** Calendar reminders due today (already filtered by the caller). */
	events: DigestEvent[];
	displayCurrency: string;
	rates: Record<string, number>;
	prefs: DigestPrefs;
}

/** Renewals within this many days are surfaced. */
const RENEWAL_WINDOW_DAYS = 3;
/** Default budget alert threshold (fraction of cap) when none is configured. */
export const DEFAULT_BUDGET_THRESHOLD = 0.8;

function dueLabel(days: number): string {
	if (days <= 0) return "today";
	if (days === 1) return "tomorrow";
	return `in ${days} days`;
}

function overdueLabel(days: number): string {
	if (days === 0) return "due today";
	const n = -days;
	return `overdue by ${n} day${n === 1 ? "" : "s"}`;
}

export function buildDigest(data: DigestData, now: Date): string | null {
	const sections: string[] = [];

	if (data.prefs.renewals) {
		const due = upcomingRenewals(data.subscriptions, RENEWAL_WINDOW_DAYS, now);
		if (due.length > 0) {
			const lines = due.map(
				(r) =>
					`• ${escapeHtml(r.sub.name)} — ${formatMoney(r.sub.price, r.sub.currency)} (${dueLabel(r.days)})`,
			);
			sections.push(`<b>🔁 Renewals</b>\n${lines.join("\n")}`);
		}
	}

	if (data.prefs.budgets) {
		const lines: string[] = [];
		for (const b of data.budgets) {
			const cap = convertToBase(
				b.amount,
				b.currency,
				data.displayCurrency,
				data.rates,
			);
			if (cap <= 0) continue;
			const spent = spentForBudget(
				b,
				data.expenses,
				data.displayCurrency,
				data.rates,
				now,
			);
			const pct = spent / cap;
			if (pct < data.prefs.budgetThreshold) continue;
			const icon = pct > 1 ? "⚠️" : "🟡";
			lines.push(
				`${icon} ${escapeHtml(b.name)}: ${formatMoney(spent, data.displayCurrency)} / ${formatMoney(cap, data.displayCurrency)} (${Math.round(pct * 100)}%)`,
			);
		}
		if (lines.length > 0) {
			sections.push(`<b>💰 Budgets</b>\n${lines.join("\n")}`);
		}
	}

	if (data.prefs.tasks) {
		const due = data.tasks
			.filter((t) => t.dueDate && t.status !== "done")
			.map((t) => ({
				t,
				days: daysUntil(new Date(t.dueDate as string), now),
			}))
			.filter((x) => x.days <= 0)
			.sort((a, b) => a.days - b.days);
		if (due.length > 0) {
			const lines = due.map(
				(x) => `• ${escapeHtml(x.t.title)} (${overdueLabel(x.days)})`,
			);
			sections.push(`<b>✅ Tasks</b>\n${lines.join("\n")}`);
		}
	}

	if (data.prefs.events && data.events.length > 0) {
		const lines = data.events
			.slice(0, 8)
			.map(
				(e) =>
					`• ${escapeHtml(e.title)} (${dueLabel(daysUntil(new Date(e.start), now))})`,
			);
		sections.push(`<b>📅 Events</b>\n${lines.join("\n")}`);
	}

	if (sections.length === 0) return null;

	return `<b>🏠 Home Dashboard — daily digest</b>\n\n${sections.join("\n\n")}`;
}
