import { describe, expect, it } from "vitest";
import { diffLines } from "./diff";

describe("diffLines", () => {
	it("marks every line equal for identical input", () => {
		expect(diffLines("a\nb\nc", "a\nb\nc")).toEqual([
			{ type: "eq", line: "a" },
			{ type: "eq", line: "b" },
			{ type: "eq", line: "c" },
		]);
	});

	it("detects a pure insertion", () => {
		expect(diffLines("a\nc", "a\nb\nc")).toEqual([
			{ type: "eq", line: "a" },
			{ type: "add", line: "b" },
			{ type: "eq", line: "c" },
		]);
	});

	it("detects a pure deletion", () => {
		expect(diffLines("a\nb\nc", "a\nc")).toEqual([
			{ type: "eq", line: "a" },
			{ type: "del", line: "b" },
			{ type: "eq", line: "c" },
		]);
	});

	it("represents a replacement as delete then add", () => {
		expect(diffLines("a\nX\nc", "a\nY\nc")).toEqual([
			{ type: "eq", line: "a" },
			{ type: "del", line: "X" },
			{ type: "add", line: "Y" },
			{ type: "eq", line: "c" },
		]);
	});
});
