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

export type BudgetProgress =
	| {
			status: "available";
			cap: number;
			spent: number;
			pct: number;
			over: boolean;
	}
	| { status: "unavailable"; missingCurrencies: string[] };

/**
 * UTC-midnight calendar-day bounds for the local month containing `ref`.
 * Expense dates are stored as UTC-midnight *days*, not local instants.
 */
export function currentMonthRange(ref: Date = new Date()): {
	start: Date;
	end: Date;
} {
	const start = new Date(Date.UTC(ref.getFullYear(), ref.getMonth(), 1));
	const end = new Date(
		Date.UTC(ref.getFullYear(), ref.getMonth() + 1, 1),
	);
	return { start, end };
}

function matchingExpenses(
	budget: BudgetLike,
	expenses: ExpenseLike[],
	ref: Date,
): ExpenseLike[] {
	const { start, end } = currentMonthRange(ref);
	const tagSet = new Set(budget.tags.map((t) => t.toLowerCase()));
	return expenses.filter((e) => {
		// Expense dates encode a picked calendar day at UTC midnight, not an
		// instant to translate into the viewer's local calendar day.
		const d = new Date(e.date);
		return (
			d >= start &&
			d < end &&
			(tagSet.size === 0 || e.tags.some((t) => tagSet.has(t.toLowerCase())))
		);
	});
}

/**
 * Sum of the current month's expenses that count toward `budget`, expressed in
 * `displayCurrency`. Tag matching is case-insensitive; an empty budget tag list
 * matches every expense. Kept for existing digest callers: `convertToBase`
 * leaves missing-rate currencies unchanged. Use `budgetProgress` for UI totals.
 */
export function spentForBudget(
	budget: BudgetLike,
	expenses: ExpenseLike[],
	displayCurrency: string,
	rates: Record<string, number>,
	ref: Date = new Date(),
): number {
	return matchingExpenses(budget, expenses, ref).reduce(
		(sum, e) => sum + convertToBase(e.amount, e.currency, displayCurrency, rates),
		0,
	);
}

/** Strict budget conversion for UI: never treat a missing FX rate as 1:1. */
export function budgetProgress(
	budget: BudgetLike,
	expenses: ExpenseLike[],
	displayCurrency: string,
	rates: Record<string, number>,
	ref: Date = new Date(),
): BudgetProgress {
	const relevant = matchingExpenses(budget, expenses, ref);
	const missingCurrencies = [
		...new Set([budget.currency, ...relevant.map((e) => e.currency)]),
	].filter(
		(currency) =>
			currency !== displayCurrency &&
			!(Number.isFinite(rates[currency]) && rates[currency] > 0),
	);
	if (missingCurrencies.length > 0) {
		return { status: "unavailable", missingCurrencies };
	}
	const cap = convertToBase(budget.amount, budget.currency, displayCurrency, rates);
	const spent = relevant.reduce(
		(sum, e) => sum + convertToBase(e.amount, e.currency, displayCurrency, rates),
		0,
	);
	return {
		status: "available",
		cap,
		spent,
		pct: cap > 0 ? (spent / cap) * 100 : 0,
		over: spent > cap,
	};
}
