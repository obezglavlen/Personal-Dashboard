import { describe, expect, it } from "vitest";
import { normalizeTags } from "./tags";

describe("normalizeTags", () => {
	it("trims, drops empties, and preserves order", () => {
		expect(normalizeTags(["  food ", "", "  ", "rent"])).toEqual([
			"food",
			"rent",
		]);
	});

	it("dedupes case-insensitively, keeping first-seen casing", () => {
		expect(normalizeTags(["Food", "food", "FOOD", "Rent"])).toEqual([
			"Food",
			"Rent",
		]);
	});

	it("handles null/undefined entries and lists", () => {
		expect(normalizeTags(["a", null, undefined, "a"])).toEqual(["a"]);
		expect(normalizeTags(null)).toEqual([]);
		expect(normalizeTags(undefined)).toEqual([]);
	});
});
