import { describe, expect, it } from "vitest";
import {
	type CumulativeEntry,
	type CumulativeNetInput,
	cumulativeNet,
} from "./cumulative-net";

// Identity conversion: amounts stay in their own currency (base == currency).
const identity = (amount: number) => amount;

// A mid-month "now" keeps entry dates comfortably inside their month buckets, so
// the test is robust to the runtime timezone (a ±14h shift never moves a
// mid-month date into a different month) — same reasoning as forecast.test.ts.
const NOW = new Date("2026-07-15T00:00:00Z");

function base(over: Partial<CumulativeNetInput> = {}): CumulativeNetInput {
	return {
		now: NOW,
		unit: "month",
		count: 12,
		income: [],
		expense: [],
		convert: identity,
		...over,
	};
}

const inc = (date: string, amount: number, currency = "USD"): CumulativeEntry => ({
	date,
	amount,
	currency,
});

function pt<T extends { label: string }>(points: T[], label: string): T {
	const p = points.find((x) => x.label === label);
	if (!p) throw new Error(`no point labelled ${label}`);
	return p;
}

describe("cumulativeNet", () => {
	it("accumulates running totals within the window (worked example)", () => {
		const points = cumulativeNet(
			base({
				income: [inc("2026-05-15", 112000), inc("2026-06-15", 102000)],
				expense: [inc("2026-05-15", 30000), inc("2026-06-15", 24000)],
			}),
		);
		expect(points).toHaveLength(12);

		const may = pt(points, "May");
		const jun = pt(points, "Jun");
		expect(may.income).toBe(112000);
		expect(may.expense).toBe(30000);
		expect(jun.income).toBe(214000);
		expect(jun.expense).toBe(54000);

		// The current month (Jul) has no activity → the totals carry forward flat.
		const jul = pt(points, "Jul");
		expect(jul.income).toBe(214000);
		expect(jul.expense).toBe(54000);
	});

	it("resets at the window start, dropping entries older than the window", () => {
		const withAncient = cumulativeNet(
			base({
				income: [
					inc("2020-01-15", 999999), // years before the 12-month window
					inc("2026-05-15", 112000),
					inc("2026-06-15", 102000),
				],
			}),
		);
		// The ancient row finds no bucket, so the first in-window total is unchanged.
		expect(pt(withAncient, "May").income).toBe(112000);
		expect(pt(withAncient, "Jun").income).toBe(214000);
		// Grand total excludes the dropped row.
		expect(withAncient.at(-1)?.income).toBe(214000);
	});

	it("keeps zero-activity buckets flat and always numeric", () => {
		const points = cumulativeNet(
			base({
				// May active, June empty, July active → June must hold May's total.
				income: [inc("2026-05-15", 100), inc("2026-07-10", 50)],
			}),
		);
		expect(pt(points, "Jun").income).toBe(100);
		expect(pt(points, "Jul").income).toBe(150);
		for (const p of points) {
			expect(Number.isFinite(p.income)).toBe(true);
			expect(Number.isFinite(p.expense)).toBe(true);
		}
	});

	it("buckets by day for day-unit windows", () => {
		const points = cumulativeNet(
			base({
				unit: "day",
				count: 7,
				// Within the trailing 7 days of NOW (Jul 15): Jul 10 and Jul 14.
				income: [inc("2026-07-10", 10), inc("2026-07-14", 5)],
			}),
		);
		expect(points).toHaveLength(7);
		// Last day carries the full cumulative total.
		expect(points.at(-1)?.income).toBe(15);
	});

	it("converts each row at its own currency before accumulating", () => {
		const convert = (amount: number, from: string) =>
			from === "EUR" ? amount * 0.9 : amount;
		const points = cumulativeNet(
			base({
				convert,
				income: [inc("2026-05-15", 1000, "EUR"), inc("2026-06-15", 1000, "USD")],
			}),
		);
		expect(pt(points, "May").income).toBeCloseTo(900);
		expect(pt(points, "Jun").income).toBeCloseTo(1900);
	});
});
