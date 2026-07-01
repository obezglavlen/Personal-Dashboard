import { describe, expect, it } from "vitest";
import { nextRenewal, recurringDueDates, renewalsDue } from "./recurring-dates";

const days = (ds: Date[]) => ds.map((d) => d.toISOString().slice(0, 10));

describe("recurringDueDates", () => {
	it("posts charges after `since` up to `ref` when no end date", () => {
		const due = recurringDueDates(
			"2026-01-15",
			"monthly",
			"2026-01-15",
			null,
			new Date("2026-04-01T00:00:00Z"),
		);
		expect(days(due)).toEqual(["2026-02-15", "2026-03-15"]);
	});

	it("caps at endDate — no charge after the recurrence ends", () => {
		const due = recurringDueDates(
			"2026-01-15",
			"monthly",
			"2026-01-15",
			"2026-02-28",
			new Date("2026-04-01T00:00:00Z"),
		);
		expect(days(due)).toEqual(["2026-02-15"]);
	});

	it("returns nothing when already posted past the end date", () => {
		const due = recurringDueDates(
			"2026-01-15",
			"monthly",
			"2026-03-15",
			"2026-02-28",
			new Date("2026-04-01T00:00:00Z"),
		);
		expect(due).toEqual([]);
	});

	it("steps annually", () => {
		const due = recurringDueDates(
			"2024-05-01",
			"annual",
			"2024-05-01",
			null,
			new Date("2026-06-01T00:00:00Z"),
		);
		expect(days(due)).toEqual(["2025-05-01", "2026-05-01"]);
	});
});

describe("re-exported math still works via recurring-dates", () => {
	it("nextRenewal + renewalsDue behave as before", () => {
		expect(nextRenewal("2026-01-31", "monthly", new Date("2026-02-10T00:00:00Z")).toISOString().slice(0, 10)).toBe("2026-02-28");
		expect(renewalsDue("2026-01-01", "monthly", null, new Date("2026-03-01T00:00:00Z")).length).toBe(3);
	});
});
