import { describe, expect, it } from "vitest";
import { addUnit, expandRecurrence } from "./recurrence";

const days = (ds: Date[]) => ds.map((d) => d.toISOString().slice(0, 10));
const times = (ds: Date[]) => ds.map((d) => d.toISOString().slice(0, 16));

describe("expandRecurrence", () => {
	it("returns [start] for a non-recurring event in the window", () => {
		const start = new Date("2026-07-06T09:00:00Z");
		expect(
			expandRecurrence(
				start,
				"none",
				null,
				new Date("2026-07-01T00:00:00Z"),
				new Date("2026-07-31T00:00:00Z"),
			),
		).toEqual([start]);
	});

	it("returns [] for a non-recurring event outside the window", () => {
		expect(
			expandRecurrence(
				new Date("2026-08-06T09:00:00Z"),
				"none",
				null,
				new Date("2026-07-01T00:00:00Z"),
				new Date("2026-07-31T00:00:00Z"),
			),
		).toEqual([]);
	});

	it("steps weekly and preserves time-of-day", () => {
		const due = expandRecurrence(
			new Date("2026-07-06T09:30:00Z"),
			"weekly",
			null,
			new Date("2026-07-01T00:00:00Z"),
			new Date("2026-07-31T23:59:59Z"),
		);
		expect(times(due)).toEqual([
			"2026-07-06T09:30",
			"2026-07-13T09:30",
			"2026-07-20T09:30",
			"2026-07-27T09:30",
		]);
	});

	it("fast-forwards a daily series that began long before the window", () => {
		const due = expandRecurrence(
			new Date("2020-01-01T08:00:00Z"),
			"daily",
			null,
			new Date("2026-07-06T00:00:00Z"),
			new Date("2026-07-08T23:59:59Z"),
		);
		expect(days(due)).toEqual(["2026-07-06", "2026-07-07", "2026-07-08"]);
	});

	it("clamps the day-of-month for monthly (Jan 31 → Feb 28)", () => {
		const due = expandRecurrence(
			new Date("2026-01-31T12:00:00Z"),
			"monthly",
			null,
			new Date("2026-01-01T00:00:00Z"),
			new Date("2026-04-30T23:59:59Z"),
		);
		expect(days(due)).toEqual([
			"2026-01-31",
			"2026-02-28",
			"2026-03-31",
			"2026-04-30",
		]);
	});

	it("clamps yearly across a leap day (Feb 29 → Feb 28)", () => {
		const due = expandRecurrence(
			new Date("2024-02-29T00:00:00Z"),
			"yearly",
			null,
			new Date("2024-01-01T00:00:00Z"),
			new Date("2027-12-31T23:59:59Z"),
		);
		expect(days(due)).toEqual([
			"2024-02-29",
			"2025-02-28",
			"2026-02-28",
			"2027-02-28",
		]);
	});

	it("caps occurrences at `until` (inclusive by day)", () => {
		const due = expandRecurrence(
			new Date("2026-07-06T09:00:00Z"),
			"weekly",
			new Date("2026-07-15T00:00:00Z"),
			new Date("2026-07-01T00:00:00Z"),
			new Date("2026-12-31T00:00:00Z"),
		);
		expect(days(due)).toEqual(["2026-07-06", "2026-07-13"]);
	});
});

describe("addUnit", () => {
	it("is a no-op for `none`", () => {
		const d = new Date("2026-07-06T09:00:00Z");
		expect(addUnit(d, "none", 5).toISOString()).toBe(d.toISOString());
	});
});
