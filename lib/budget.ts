import { convertToBase } from "@/lib/format";

/**
 * Budget math shared by the Budgets page and the dashboard widget. A budget is
 * a monthly spending cap; "spent" is the sum of the current month's expenses
 * whose tags intersect the budget's tags (an empty tag list tracks *all*
 * expenses), converted into a single display currency so mixed-currency
 * expenses compare against one cap.
 */

export interface BudgetLike {
	amount: number;
	currency: string;
	tags: string[];
}

export interface ExpenseLike {
	amount: number;
	currency: string;
	date: string;
	tags: string[];
}

/** UTC `[start, end)` for the month containing `ref` (defaults to now). */
export function currentMonthRange(ref: Date = new Date()): {
	start: Date;
	end: Date;
} {
	const start = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1));
	const end = new Date(
		Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 1),
	);
	return { start, end };
}

/**
 * Sum of the current month's expenses that count toward `budget`, expressed in
 * `displayCurrency`. Tag matching is case-insensitive; an empty budget tag list
 * matches every expense.
 */
export function spentForBudget(
	budget: BudgetLike,
	expenses: ExpenseLike[],
	displayCurrency: string,
	rates: Record<string, number>,
	ref: Date = new Date(),
): number {
	const { start, end } = currentMonthRange(ref);
	const tagSet = new Set(budget.tags.map((t) => t.toLowerCase()));
	return expenses.reduce((sum, e) => {
		const d = new Date(e.date);
		if (d < start || d >= end) return sum;
		if (tagSet.size > 0 && !e.tags.some((t) => tagSet.has(t.toLowerCase()))) {
			return sum;
		}
		return sum + convertToBase(e.amount, e.currency, displayCurrency, rates);
	}, 0);
}
