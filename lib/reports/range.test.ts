import { describe, expect, it } from "vitest";
import { customRange, isInRange, presetRange } from "./range";

const REF = new Date("2026-07-15T12:00:00Z");
const iso = (d: Date) => d.toISOString();

describe("presetRange", () => {
	it("this-month is the containing calendar month", () => {
		const r = presetRange("this-month", REF);
		expect(iso(r.start)).toBe("2026-07-01T00:00:00.000Z");
		expect(iso(r.end)).toBe("2026-08-01T00:00:00.000Z");
	});

	it("last-month is the previous calendar month", () => {
		const r = presetRange("last-month", REF);
		expect(iso(r.start)).toBe("2026-06-01T00:00:00.000Z");
		expect(iso(r.end)).toBe("2026-07-01T00:00:00.000Z");
	});

	it("ytd runs from Jan 1 through end of today", () => {
		const r = presetRange("ytd", REF);
		expect(iso(r.start)).toBe("2026-01-01T00:00:00.000Z");
		expect(iso(r.end)).toBe("2026-07-16T00:00:00.000Z");
	});

	it("12m covers the current month plus 11 prior months", () => {
		const r = presetRange("12m", REF);
		expect(iso(r.start)).toBe("2025-08-01T00:00:00.000Z");
		expect(iso(r.end)).toBe("2026-08-01T00:00:00.000Z");
	});
});

describe("customRange", () => {
	it("includes the `to` day by pushing end to the next midnight", () => {
		const r = customRange("2026-03-01", "2026-03-31");
		expect(r && iso(r.start)).toBe("2026-03-01T00:00:00.000Z");
		expect(r && iso(r.end)).toBe("2026-04-01T00:00:00.000Z");
	});

	it("returns null on missing, unparseable, or inverted bounds", () => {
		expect(customRange("", "2026-03-31")).toBeNull();
		expect(customRange("nope", "2026-03-31")).toBeNull();
		expect(customRange("2026-03-31", "2026-03-01")).toBeNull();
	});
});

describe("isInRange", () => {
	const r = presetRange("this-month", REF);
	it("includes start, excludes end", () => {
		expect(isInRange("2026-07-01T00:00:00Z", r)).toBe(true);
		expect(isInRange("2026-07-31T23:59:59Z", r)).toBe(true);
		expect(isInRange("2026-08-01T00:00:00Z", r)).toBe(false);
		expect(isInRange("2026-06-30T23:59:59Z", r)).toBe(false);
	});
});
