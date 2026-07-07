import { describe, expect, it } from "vitest";
import {
	parseColor,
	rgbToOklch,
	toHex,
	toHsl,
	toOklch,
	toRgb,
} from "./color";

describe("parseColor", () => {
	it("parses 6-digit hex", () => {
		expect(parseColor("#ff0000")).toEqual({ r: 1, g: 0, b: 0, a: 1 });
	});

	it("expands 3-digit hex shorthand", () => {
		expect(parseColor("#f00")).toEqual({ r: 1, g: 0, b: 0, a: 1 });
	});

	it("reads the alpha channel from 8-digit hex", () => {
		const c = parseColor("#ff000080");
		expect(c?.a).toBeCloseTo(128 / 255, 5);
	});

	it("parses rgb() and rgba()", () => {
		expect(parseColor("rgb(255, 0, 0)")).toEqual({ r: 1, g: 0, b: 0, a: 1 });
		expect(parseColor("rgba(0, 0, 255, 0.5)")).toEqual({ r: 0, g: 0, b: 1, a: 0.5 });
	});

	it("parses hsl() back to rgb", () => {
		const c = parseColor("hsl(0, 100%, 50%)");
		expect(c?.r).toBeCloseTo(1, 5);
		expect(c?.g).toBeCloseTo(0, 5);
		expect(c?.b).toBeCloseTo(0, 5);
	});

	it("returns null for unrecognized input", () => {
		expect(parseColor("")).toBeNull();
		expect(parseColor("not a color")).toBeNull();
		expect(parseColor("#12")).toBeNull();
		expect(parseColor("#gggggg")).toBeNull();
	});
});

describe("formatters", () => {
	const red = { r: 1, g: 0, b: 0, a: 1 };

	it("formats hex, rgb and hsl", () => {
		expect(toHex(red)).toBe("#ff0000");
		expect(toRgb(red)).toBe("rgb(255, 0, 0)");
		expect(toHsl(red)).toBe("hsl(0, 100%, 50%)");
	});

	it("emits alpha variants when a < 1", () => {
		const c = { r: 0, g: 0, b: 1, a: 0.5 };
		expect(toHex(c)).toBe("#0000ff80");
		expect(toRgb(c)).toBe("rgba(0, 0, 255, 0.5)");
		expect(toHsl(c)).toBe("hsla(240, 100%, 50%, 0.5)");
	});

	it("converts red to OKLCH within tolerance", () => {
		const { l, c, h } = rgbToOklch(red);
		expect(l).toBeCloseTo(0.628, 2);
		expect(c).toBeCloseTo(0.258, 2);
		expect(h).toBeCloseTo(29.23, 1);
		expect(toOklch(red)).toBe("oklch(0.628 0.258 29.23)");
	});

	it("round-trips a parsed hex through rgb formatting", () => {
		const parsed = parseColor("#3366cc");
		expect(parsed).not.toBeNull();
		if (parsed) expect(toHex(parsed)).toBe("#3366cc");
	});
});
