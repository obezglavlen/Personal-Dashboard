import { describe, expect, it } from "vitest";
import { netWorthInBase, sumBalancesByCurrency } from "./snapshot-math";

describe("sumBalancesByCurrency", () => {
	it("groups balances by currency, keeping negatives", () => {
		expect(
			sumBalancesByCurrency([
				{ balance: 1000, currency: "USD" },
				{ balance: 200, currency: "USD" },
				{ balance: 500, currency: "EUR" },
				{ balance: -300, currency: "USD" },
			]),
		).toEqual({ USD: 900, EUR: 500 });
	});

	it("returns {} for no accounts", () => {
		expect(sumBalancesByCurrency([])).toEqual({});
	});
});

describe("netWorthInBase", () => {
	// rates[X] = units of X per 1 USD.
	const usd = { EUR: 0.9, GBP: 0.8, USD: 1 };

	it("converts each currency into the base and sums", () => {
		// 1000 USD + 900 EUR(=1000 USD) = 2000 USD.
		expect(netWorthInBase({ USD: 1000, EUR: 900 }, "USD", usd)).toBeCloseTo(2000, 6);
	});

	it("leaves a currency unconverted when its rate is missing", () => {
		// JPY has no rate → counted at face value (matches convertToBase fallback).
		expect(netWorthInBase({ USD: 100, JPY: 50 }, "USD", usd)).toBe(150);
	});

	it("returns 0 for an empty map", () => {
		expect(netWorthInBase({}, "USD", usd)).toBe(0);
	});
});
