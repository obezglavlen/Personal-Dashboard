import { afterEach, describe, expect, it, vi } from "vitest";
import { budgetProgress, currentMonthRange, spentForBudget } from "./budget";

const ref = new Date("2026-06-15T12:00:00Z");
// 1 USD = 0.5 EUR, so EUR->USD is amount / 0.5 = amount * 2.
const rates = { EUR: 0.5 };

afterEach(() => vi.unstubAllEnvs());

describe("currentMonthRange", () => {
	it("returns [first-of-month, first-of-next) in UTC", () => {
		const { start, end } = currentMonthRange(ref);
		expect(start.toISOString()).toBe("2026-06-01T00:00:00.000Z");
		expect(end.toISOString()).toBe("2026-07-01T00:00:00.000Z");
	});

	it("uses the viewer's September in Los Angeles when UTC is already October", () => {
		vi.stubEnv("TZ", "America/Los_Angeles");
		const { start, end } = currentMonthRange(new Date("2026-10-01T01:00:00Z"));
		expect(start.toISOString()).toBe("2026-09-01T00:00:00.000Z");
		expect(end.toISOString()).toBe("2026-10-01T00:00:00.000Z");
	});

	it("uses the viewer's October in Auckland when UTC is still September", () => {
		vi.stubEnv("TZ", "Pacific/Auckland");
		const { start, end } = currentMonthRange(new Date("2026-09-30T23:30:00Z"));
		expect(start.toISOString()).toBe("2026-10-01T00:00:00.000Z");
		expect(end.toISOString()).toBe("2026-11-01T00:00:00.000Z");
	});
});

describe("spentForBudget", () => {
	const expenses = [
		{ amount: 10, currency: "USD", date: "2026-06-05", tags: ["food"] },
		{ amount: 20, currency: "USD", date: "2026-06-20", tags: ["FOOD"] }, // tag case-insensitive
		{ amount: 100, currency: "USD", date: "2026-05-31", tags: ["food"] }, // previous month
		{ amount: 5, currency: "EUR", date: "2026-06-10", tags: ["food"] }, // 5 EUR -> 10 USD
		{ amount: 50, currency: "USD", date: "2026-06-10", tags: ["travel"] }, // other tag
	];

	it("sums current-month matching-tag expenses, converted to display currency", () => {
		const budget = { amount: 200, currency: "USD", tags: ["food"] };
		expect(spentForBudget(budget, expenses, "USD", rates, ref)).toBe(40);
	});

	it("treats an empty tag list as matching every current-month expense", () => {
		const budget = { amount: 200, currency: "USD", tags: [] };
		expect(spentForBudget(budget, expenses, "USD", rates, ref)).toBe(90);
	});

	it("counts UTC-midnight calendar dates in the viewer's month near the boundary", () => {
		vi.stubEnv("TZ", "America/Los_Angeles");
		const budget = { amount: 200, currency: "USD", tags: [] };
		const boundaryExpenses = [
			{ amount: 15, currency: "USD", date: "2026-09-30T00:00:00.000Z", tags: [] },
			{ amount: 20, currency: "USD", date: "2026-10-01T00:00:00.000Z", tags: [] },
		];
		expect(spentForBudget(budget, boundaryExpenses, "USD", {}, new Date("2026-10-01T01:00:00Z"))).toBe(15);
	});
});

describe("budgetProgress", () => {
	it("marks a foreign-currency cap unavailable without its rate", () => {
		const budget = { amount: 100, currency: "EUR", tags: [] };
		expect(budgetProgress(budget, [], "USD", {}, ref)).toEqual({
			status: "unavailable",
			missingCurrencies: ["EUR"],
		});
	});

	it("does not report a numeric spent total when a matching expense lacks a rate", () => {
		const budget = { amount: 100, currency: "USD", tags: ["food"] };
		const expenses = [
			{ amount: 12, currency: "USD", date: "2026-06-01T00:00:00.000Z", tags: ["Food"] },
			{ amount: 5, currency: "EUR", date: "2026-06-30T00:00:00.000Z", tags: ["food"] },
		];
		expect(budgetProgress(budget, expenses, "USD", {}, ref)).toEqual({
			status: "unavailable",
			missingCurrencies: ["EUR"],
		});
	});

	it("converts a quoted cap and matching expenses before checking the limit", () => {
		const budget = { amount: 100, currency: "EUR", tags: ["food"] };
		const expenses = [
			{ amount: 40, currency: "USD", date: "2026-06-01", tags: ["food"] },
			{ amount: 90, currency: "EUR", date: "2026-06-30", tags: ["FOOD"] },
		];
		const progress = budgetProgress(budget, expenses, "USD", rates, ref);
		expect(progress).toMatchObject({
			status: "available",
			cap: 200,
			spent: 220,
			over: true,
		});
		if (progress.status === "available") expect(progress.pct).toBeCloseTo(110);
	});

	it("does not require rates for out-of-month or unrelated-tag expenses", () => {
		const budget = { amount: 100, currency: "USD", tags: ["food"] };
		const expenses = [
			{ amount: 35, currency: "USD", date: "2026-06-10", tags: ["FOOD"] },
			{ amount: 50, currency: "EUR", date: "2026-06-10", tags: ["travel"] },
			{ amount: 40, currency: "GBP", date: "2026-05-31", tags: ["food"] },
		];
		expect(budgetProgress(budget, expenses, "USD", {}, ref)).toEqual({
			status: "available",
			cap: 100,
			spent: 35,
			pct: 35,
			over: false,
		});
	});

	it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
		"treats an invalid exchange rate of %s as unavailable",
		(rate) => {
			const budget = { amount: 100, currency: "EUR", tags: [] };
			expect(budgetProgress(budget, [], "USD", { EUR: rate }, ref)).toEqual({
				status: "unavailable",
				missingCurrencies: ["EUR"],
			});
		},
	);
});
