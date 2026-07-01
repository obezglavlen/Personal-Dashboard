import { describe, expect, it } from "vitest";
import {
	buildInsightMessage,
	monthBeforeRange,
	monthLabel,
	previousMonthRange,
	summarizeSpending,
} from "./monthly-insight";

const REF = new Date("2026-07-15T12:00:00Z");
const iso = (d: Date) => d.toISOString();

describe("month ranges", () => {
	it("previousMonthRange is the last full month", () => {
		const r = previousMonthRange(REF);
		expect(iso(r.start)).toBe("2026-06-01T00:00:00.000Z");
		expect(iso(r.end)).toBe("2026-07-01T00:00:00.000Z");
	});

	it("monthBeforeRange is the month before that", () => {
		const r = monthBeforeRange(REF);
		expect(iso(r.start)).toBe("2026-05-01T00:00:00.000Z");
		expect(iso(r.end)).toBe("2026-06-01T00:00:00.000Z");
	});

	it("monthLabel names the month", () => {
		expect(monthLabel(previousMonthRange(REF).start)).toBe("June 2026");
	});
});

describe("summarizeSpending", () => {
	it("totals, delta, and category breakdown (single currency)", () => {
		const s = summarizeSpending(
			[
				{ amount: 100, currency: "USD", tags: ["food"] },
				{ amount: 50, currency: "USD", tags: ["rent"] },
				{ amount: 25, currency: "USD", tags: ["food"] },
			],
			[{ amount: 120, currency: "USD", tags: ["food"] }],
			"USD",
			{},
		);
		expect(s.total).toBe(175);
		expect(s.priorTotal).toBe(120);
		expect(s.delta).toBe(55);
		expect(s.deltaPct).toBeCloseTo((55 / 120) * 100, 6);
		expect(s.byCategory).toEqual([
			{ name: "food", value: 125 },
			{ name: "rent", value: 50 },
		]);
	});

	it("deltaPct is null when the prior month had no spending", () => {
		const s = summarizeSpending(
			[{ amount: 10, currency: "USD", tags: [] }],
			[],
			"USD",
			{},
		);
		expect(s.priorTotal).toBe(0);
		expect(s.deltaPct).toBeNull();
	});
});

describe("buildInsightMessage", () => {
	it("returns null when nothing was spent this month or last", () => {
		const s = summarizeSpending([], [], "USD", {});
		expect(buildInsightMessage(s, "June 2026", "USD")).toBeNull();
	});

	it("renders total, delta, and top categories", () => {
		const s = summarizeSpending(
			[{ amount: 150, currency: "USD", tags: ["food"] }],
			[{ amount: 100, currency: "USD", tags: ["food"] }],
			"USD",
			{},
		);
		const msg = buildInsightMessage(s, "June 2026", "USD");
		expect(msg).toContain("June 2026");
		expect(msg).toContain("up 50%");
		expect(msg).toContain("Top categories");
		expect(msg).toContain("food");
	});

	it("escapes HTML in category names", () => {
		const s = summarizeSpending(
			[{ amount: 10, currency: "USD", tags: ["a & b"] }],
			[],
			"USD",
			{},
		);
		expect(buildInsightMessage(s, "June 2026", "USD")).toContain("a &amp; b");
	});
});
