import { describe, expect, it } from "vitest";
import { pickRatesForDate, rebaseRates, toDateKey } from "./rates-history";

describe("rebaseRates", () => {
	// USD-based: 1 USD = 0.9 EUR = 0.8 GBP.
	const usd = { EUR: 0.9, GBP: 0.8 };

	it("returns rates unchanged (plus base=1) when bases match", () => {
		expect(rebaseRates(usd, "USD", "USD")).toEqual({ EUR: 0.9, GBP: 0.8, USD: 1 });
	});

	it("rebases to another currency so base and target are 1", () => {
		const eur = rebaseRates(usd, "USD", "EUR");
		expect(eur.EUR).toBe(1);
		// 1 EUR = (1/0.9) USD ≈ 1.111
		expect(eur.USD).toBeCloseTo(1 / 0.9, 10);
		// 1 EUR = 0.8/0.9 GBP
		expect(eur.GBP).toBeCloseTo(0.8 / 0.9, 10);
	});

	it("returns {} when the target currency has no pivot rate", () => {
		expect(rebaseRates(usd, "USD", "JPY")).toEqual({});
	});

	it("uppercases bases", () => {
		expect(rebaseRates(usd, "usd", "usd")).toEqual({ EUR: 0.9, GBP: 0.8, USD: 1 });
	});
});

describe("pickRatesForDate", () => {
	const byDate = {
		"2026-06-01": { EUR: 0.9 },
		"2026-06-10": { EUR: 0.92 },
		"2026-06-20": { EUR: 0.95 },
	};

	it("picks the exact-day snapshot", () => {
		expect(pickRatesForDate(byDate, "2026-06-10")).toEqual({ EUR: 0.92 });
	});

	it("picks the newest snapshot on or before the date", () => {
		expect(pickRatesForDate(byDate, "2026-06-15")).toEqual({ EUR: 0.92 });
		expect(pickRatesForDate(byDate, "2026-06-25T12:00:00Z")).toEqual({ EUR: 0.95 });
	});

	it("falls back to the earliest when the date predates all snapshots", () => {
		expect(pickRatesForDate(byDate, "2026-01-01")).toEqual({ EUR: 0.9 });
	});

	it("returns {} when there are no snapshots", () => {
		expect(pickRatesForDate({}, "2026-06-10")).toEqual({});
	});

	it("uses caller-supplied sorted keys, matching the unsorted path", () => {
		const keys = Object.keys(byDate).sort();
		for (const d of ["2026-06-05", "2026-06-10", "2026-06-25", "2026-01-01"]) {
			expect(pickRatesForDate(byDate, d, keys)).toEqual(
				pickRatesForDate(byDate, d),
			);
		}
	});
});

describe("toDateKey", () => {
	it("returns the UTC day", () => {
		expect(toDateKey(new Date("2026-06-15T23:30:00Z"))).toBe("2026-06-15");
	});
});
