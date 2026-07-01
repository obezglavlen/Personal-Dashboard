import { convertToBase, formatMoney } from "@/lib/format";
import { escapeHtml } from "@/lib/telegram";

/**
 * Pure helpers for the monthly spending insight. No DB/network so they are
 * unit-testable; the server orchestration (fetch + LLM + send) lives in
 * `monthly-insight-run.ts`.
 */

export interface InsightExpense {
	amount: number;
	currency: string;
	tags: string[];
}

export interface SpendingSummary {
	total: number;
	priorTotal: number;
	delta: number;
	/** Percent change vs the prior month, or null when the prior month was 0. */
	deltaPct: number | null;
	byCategory: { name: string; value: number }[];
}

const MONTHS_LONG = [
	"January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December",
];

/** The last full calendar month before `ref` as `[start, end)` (UTC). */
export function previousMonthRange(ref: Date = new Date()): {
	start: Date;
	end: Date;
} {
	const y = ref.getUTCFullYear();
	const m = ref.getUTCMonth();
	return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
}

/** The month before {@link previousMonthRange} (for the comparison figure). */
export function monthBeforeRange(ref: Date = new Date()): {
	start: Date;
	end: Date;
} {
	const y = ref.getUTCFullYear();
	const m = ref.getUTCMonth();
	return {
		start: new Date(Date.UTC(y, m - 2, 1)),
		end: new Date(Date.UTC(y, m - 1, 1)),
	};
}

/** Human label for the month a range starts in, e.g. "June 2026". */
export function monthLabel(start: Date): string {
	return `${MONTHS_LONG[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
}

/** Aggregate a month's spending (with prior-month comparison), all in `base`. */
export function summarizeSpending(
	current: InsightExpense[],
	prior: InsightExpense[],
	base: string,
	rates: Record<string, number>,
): SpendingSummary {
	const sum = (xs: InsightExpense[]) =>
		xs.reduce((s, e) => s + convertToBase(e.amount, e.currency, base, rates), 0);
	const total = sum(current);
	const priorTotal = sum(prior);

	const cats = new Map<string, number>();
	for (const e of current) {
		const cat = e.tags[0] ?? "Untagged";
		cats.set(cat, (cats.get(cat) ?? 0) + convertToBase(e.amount, e.currency, base, rates));
	}
	const byCategory = [...cats.entries()]
		.map(([name, value]) => ({ name, value }))
		.sort((a, b) => b.value - a.value);

	return {
		total,
		priorTotal,
		delta: total - priorTotal,
		deltaPct: priorTotal > 0 ? ((total - priorTotal) / priorTotal) * 100 : null,
		byCategory,
	};
}

/**
 * Templated Telegram HTML insight — the deterministic fallback used when no LLM
 * is configured (or the LLM call fails). Returns null when there is nothing to
 * report (no spending this month or last).
 */
export function buildInsightMessage(
	summary: SpendingSummary,
	label: string,
	base: string,
): string | null {
	if (summary.total === 0 && summary.priorTotal === 0) return null;

	const lines: string[] = [
		`<b>📊 ${escapeHtml(label)} — spending insight</b>`,
		"",
		`Total spent: <b>${formatMoney(summary.total, base)}</b>`,
	];

	if (summary.deltaPct === null) {
		lines.push("No spending recorded the previous month to compare.");
	} else {
		const dir = summary.delta >= 0 ? "up" : "down";
		lines.push(
			`That's ${dir} ${Math.abs(Math.round(summary.deltaPct))}% vs the previous month (${formatMoney(summary.priorTotal, base)}).`,
		);
	}

	if (summary.byCategory.length > 0) {
		lines.push("", "<b>Top categories</b>");
		for (const c of summary.byCategory.slice(0, 3)) {
			lines.push(`• ${escapeHtml(c.name)}: ${formatMoney(c.value, base)}`);
		}
	}

	return lines.join("\n");
}
