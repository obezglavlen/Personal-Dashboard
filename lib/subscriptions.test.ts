import { describe, expect, it } from "vitest";
import {
	daysUntil,
	nextRenewal,
	renewalsDue,
	upcomingRenewals,
} from "./subscriptions";

const ref = new Date("2026-06-15T00:00:00Z");

describe("nextRenewal", () => {
	it("returns the start date when the subscription starts in the future", () => {
		expect(nextRenewal("2026-07-01", "monthly", ref).toISOString()).toBe(
			"2026-07-01T00:00:00.000Z",
		);
	});

	it("steps a monthly subscription forward to on/after ref", () => {
		// started Jan 10; renewals land on the 10th, so the first on/after Jun 15 is Jul 10.
		expect(nextRenewal("2026-01-10", "monthly", ref).toISOString()).toBe(
			"2026-07-10T00:00:00.000Z",
		);
	});

	it("steps an annual subscription by whole years", () => {
		expect(nextRenewal("2020-03-01", "annual", ref).toISOString()).toBe(
			"2027-03-01T00:00:00.000Z",
		);
	});
});

describe("renewalsDue", () => {
	it("lists monthly renewals after the last-posted date through ref", () => {
		const due = renewalsDue("2026-01-10", "monthly", "2026-04-10", ref);
		expect(due.map((d) => d.toISOString())).toEqual([
			"2026-05-10T00:00:00.000Z",
			"2026-06-10T00:00:00.000Z",
		]);
	});

	it("is idempotent: nothing due when already posted through ref", () => {
		expect(renewalsDue("2026-01-10", "monthly", "2026-06-10", ref)).toEqual([]);
	});

	it("clamps month-end (Jan 31 -> Feb 28 in a non-leap year)", () => {
		const due = renewalsDue(
			"2026-01-31",
			"monthly",
			"2026-01-31",
			new Date("2026-03-01T00:00:00Z"),
		);
		expect(due.map((d) => d.toISOString())).toEqual([
			"2026-02-28T00:00:00.000Z",
		]);
	});
});

describe("daysUntil", () => {
	it("counts whole days; 0 is today, negative is past", () => {
		expect(daysUntil(new Date("2026-06-15"), ref)).toBe(0);
		expect(daysUntil(new Date("2026-06-18"), ref)).toBe(3);
		expect(daysUntil(new Date("2026-06-10"), ref)).toBe(-5);
	});
});

describe("upcomingRenewals", () => {
	const subs = [
		{
			name: "A",
			price: 5,
			period: "monthly" as const,
			startDate: "2026-05-15",
			currency: "USD",
		},
		{
			name: "B",
			price: 9,
			period: "monthly" as const,
			startDate: "2026-05-17",
			currency: "USD",
		},
		{
			name: "C",
			price: 9,
			period: "monthly" as const,
			startDate: "2026-05-25",
			currency: "USD",
		},
	];

	it("includes only renewals within the window, soonest first", () => {
		const up = upcomingRenewals(subs, 3, ref);
		expect(up.map((u) => u.sub.name)).toEqual(["A", "B"]);
		expect(up[0].days).toBe(0);
		expect(up[1].days).toBe(2);
	});
});
