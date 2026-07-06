import { describe, expect, it } from "vitest";
import {
	DAY_HORIZON,
	type ForecastInput,
	MONTH_HORIZON,
	projectForecast,
} from "./forecast";

// Identity conversion: amounts stay in their own currency (base == currency).
const identity = (amount: number) => amount;

// A mid-month "now" keeps renewal dates comfortably inside their month buckets,
// so the test is robust to the runtime timezone (a ±14h shift never moves a
// mid-month occurrence into a different month).
const NOW = new Date("2026-07-15T00:00:00Z");

function base(over: Partial<ForecastInput> = {}): ForecastInput {
	return {
		now: NOW,
		unit: "month",
		subscriptions: [],
		recurring: [],
		monthlyTaxAvg: 0,
		convert: identity,
		...over,
	};
}

const sumExpense = (b: { expense: number }[]) =>
	b.reduce((s, x) => s + x.expense, 0);
const sumIncome = (b: { income: number }[]) =>
	b.reduce((s, x) => s + x.income, 0);

describe("projectForecast horizons", () => {
	it("emits 3 monthly buckets for month-unit", () => {
		expect(projectForecast(base({ unit: "month" }))).toHaveLength(MONTH_HORIZON);
	});

	it("emits 14 daily buckets for day-unit", () => {
		expect(projectForecast(base({ unit: "day" }))).toHaveLength(DAY_HORIZON);
	});
});

describe("projectForecast subscriptions", () => {
	it("projects each future monthly renewal as expense", () => {
		// Start in the past; renewals land on the 10th → Aug/Sep/Oct within window.
		const b = projectForecast(
			base({
				subscriptions: [
					{ price: 10, period: "monthly", startDate: "2026-01-10", currency: "USD" },
				],
			}),
		);
		expect(sumExpense(b)).toBeCloseTo(30, 6);
		expect(sumIncome(b)).toBe(0);
	});

	it("excludes a renewal that falls today (strictly after today only)", () => {
		// Day-unit +14d window; a monthly renewal on the 15th == today, and the
		// next (Aug 15) is outside the 14-day window ⇒ nothing projected.
		const b = projectForecast(
			base({
				unit: "day",
				subscriptions: [
					{ price: 10, period: "monthly", startDate: "2026-06-15", currency: "USD" },
				],
			}),
		);
		expect(sumExpense(b)).toBe(0);
	});

	it("converts the price to base currency at the occurrence date", () => {
		const b = projectForecast(
			base({
				subscriptions: [
					{ price: 10, period: "monthly", startDate: "2026-01-10", currency: "EUR" },
				],
				convert: (amount, from) => (from === "EUR" ? amount * 0.9 : amount),
			}),
		);
		expect(sumExpense(b)).toBeCloseTo(27, 6); // 3 × (10 × 0.9)
	});
});

describe("projectForecast recurring transactions", () => {
	it("routes income and expense by type", () => {
		const b = projectForecast(
			base({
				recurring: [
					{
						amount: 100,
						type: "income",
						period: "monthly",
						startDate: "2026-01-05",
						endDate: null,
						currency: "USD",
					},
					{
						amount: 20,
						type: "expense",
						period: "monthly",
						startDate: "2026-01-05",
						endDate: null,
						currency: "USD",
					},
				],
			}),
		);
		expect(sumIncome(b)).toBeCloseTo(300, 6); // 3 × 100
		expect(sumExpense(b)).toBeCloseTo(60, 6); // 3 × 20
	});

	it("caps recurring occurrences at endDate", () => {
		// Window Aug–Oct; endDate 2026-09-01 ⇒ only the Aug 5 charge survives.
		const b = projectForecast(
			base({
				recurring: [
					{
						amount: 20,
						type: "expense",
						period: "monthly",
						startDate: "2026-01-05",
						endDate: "2026-09-01",
						currency: "USD",
					},
				],
			}),
		);
		expect(sumExpense(b)).toBeCloseTo(20, 6);
	});
});

describe("projectForecast tax estimate", () => {
	it("repeats the monthly average across each month bucket", () => {
		const b = projectForecast(base({ unit: "month", monthlyTaxAvg: 90 }));
		expect(b.every((x) => x.expense === 90)).toBe(true);
		expect(sumExpense(b)).toBeCloseTo(270, 6); // 3 × 90
	});

	it("prorates the monthly average per day for day-unit", () => {
		const b = projectForecast(base({ unit: "day", monthlyTaxAvg: 90 }));
		expect(b.every((x) => x.expense === 3)).toBe(true); // 90 / 30
		expect(sumExpense(b)).toBeCloseTo(42, 6); // 14 × 3
	});
});
