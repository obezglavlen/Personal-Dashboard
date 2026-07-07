import { describe, expect, it } from "vitest";
import { runRegex } from "./regex";

describe("runRegex", () => {
	it("returns an empty result for an empty pattern", () => {
		expect(runRegex("", "g", "abc")).toEqual({ count: 0, matches: [] });
	});

	it("finds all global matches with their offsets", () => {
		const r = runRegex("\\d+", "g", "a1 b22");
		expect(r.count).toBe(2);
		expect(r.matches[0]).toEqual({ index: 1, match: "1", groups: [] });
		expect(r.matches[1]).toEqual({ index: 4, match: "22", groups: [] });
	});

	it("extracts capture groups", () => {
		const r = runRegex("(\\w)(\\d)", "g", "a1 b2");
		expect(r.count).toBe(2);
		expect(r.matches[0].groups).toEqual(["a", "1"]);
		expect(r.matches[1].groups).toEqual(["b", "2"]);
	});

	it("returns only the first match without the global flag", () => {
		const r = runRegex("\\d+", "", "a1 b22");
		expect(r.count).toBe(1);
		expect(r.matches[0].match).toBe("1");
	});

	it("reports an error for an invalid pattern", () => {
		const r = runRegex("(", "g", "x");
		expect(r.error).toBeDefined();
		expect(r.count).toBe(0);
	});

	it("does not hang on a zero-width global match", () => {
		const r = runRegex("a*", "g", "aa");
		// Terminates and yields a finite, small set of matches.
		expect(r.matches.length).toBeLessThan(5);
		expect(r.matches[0].match).toBe("aa");
	});
});
