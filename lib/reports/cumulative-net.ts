/**
 * Cumulative income vs expense series for the Reports "Total net" chart. Pure
 * and side-effect-free (inject `now` for tests). Builds contiguous historical
 * buckets ending at `now`, sums each row into its bucket, then walks the buckets
 * oldest → newest accumulating a running total — so each point is the total
 * income / expense *from the window start through that bucket*.
 *
 * Bucket boundaries reuse `bucketKey`/`bucketLabel` from `lib/forecast` so this
 * chart lines up bucket-for-bucket with the Income vs Expense chart. Rows dated
 * before the window find no bucket and are dropped, which is what makes the
 * running total reset at the window's first bucket.
 */

import { bucketKey, bucketLabel } from "@/lib/forecast";

export type CumulativeUnit = "day" | "month";

/**
 * One income or expense row. The caller resolves a non-null amount and a
 * concrete source currency before handing it over.
 */
export interface CumulativeEntry {
	/** ISO date; month-start-UTC for income, arbitrary for expenses. */
	date: string;
	amount: number;
	currency: string;
}

export interface CumulativeNetInput {
	/** "Now" — injected for tests. The window ends at this day/month. */
	now: Date;
	/** "day" → bucket by calendar day; "month" → bucket by month. */
	unit: CumulativeUnit;
	/** Number of contiguous buckets in the window. */
	count: number;
	income: CumulativeEntry[];
	expense: CumulativeEntry[];
	/** Convert `amount` from `from` to base currency at the row's own date. */
	convert: (amount: number, from: string, iso: string) => number;
}

export interface CumulativePoint {
	key: string;
	label: string;
	/** Running total of income from the window start through this bucket. */
	income: number;
	/** Running total of expense from the window start through this bucket. */
	expense: number;
}

/**
 * Cumulative income/expense points, oldest → newest. Every value is numeric
 * (never null/NaN), so zero-activity buckets carry the prior total forward and
 * the rendered line stays continuous and flat across gaps.
 */
export function cumulativeNet(input: CumulativeNetInput): CumulativePoint[] {
	const { now, unit, count, income, expense, convert } = input;
	const byDay = unit === "day";
	const multiYear = !byDay && count > 12;

	// Contiguous buckets ending at the current day/month, matching the Income vs
	// Expense chart's skeleton so both charts agree bucket-for-bucket.
	const points: CumulativePoint[] = [];
	const index = new Map<string, number>();
	for (let i = count - 1; i >= 0; i--) {
		const d = byDay
			? new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
			: new Date(now.getFullYear(), now.getMonth() - i, 1);
		const key = bucketKey(d, byDay);
		index.set(key, points.length);
		points.push({
			key,
			label: bucketLabel(d, byDay, multiYear),
			income: 0,
			expense: 0,
		});
	}

	// Per-bucket sums. Rows outside the window find no slot and are dropped, so
	// accumulation starts fresh at the window's first bucket.
	const bin = (rows: CumulativeEntry[], field: "income" | "expense") => {
		for (const r of rows) {
			if (!Number.isFinite(r.amount)) continue;
			const slot = index.get(bucketKey(new Date(r.date), byDay));
			if (slot == null) continue;
			points[slot][field] += convert(r.amount, r.currency, r.date);
		}
	};
	bin(income, "income");
	bin(expense, "expense");

	// Running totals in chronological order.
	let accIncome = 0;
	let accExpense = 0;
	for (const p of points) {
		accIncome += p.income;
		accExpense += p.expense;
		p.income = accIncome;
		p.expense = accExpense;
	}
	return points;
}
