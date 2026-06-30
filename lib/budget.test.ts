import { describe, expect, it } from "vitest";
import { currentMonthRange, spentForBudget } from "./budget";

const ref = new Date("2026-06-15T12:00:00Z");
// 1 USD = 0.5 EUR, so EUR->USD is amount / 0.5 = amount * 2.
const rates = { EUR: 0.5 };

describe("currentMonthRange", () => {
	it("returns [first-of-month, first-of-next) in UTC", () => {
		const { start, end } = currentMonthRange(ref);
		expect(start.toISOString()).toBe("2026-06-01T00:00:00.000Z");
		expect(end.toISOString()).toBe("2026-07-01T00:00:00.000Z");
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
});
