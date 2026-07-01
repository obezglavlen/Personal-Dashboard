import { describe, expect, it } from "vitest";
import { matchAndRank } from "./match";

const items = [
	"Netflix subscription",
	"Rent payment",
	"net worth review",
	"Internet bill",
	"Spotify",
];
const id = (s: string) => s;

describe("matchAndRank", () => {
	it("returns nothing for an empty query", () => {
		expect(matchAndRank("", items, id)).toEqual([]);
		expect(matchAndRank("   ", items, id)).toEqual([]);
	});

	it("is case-insensitive substring match", () => {
		expect(matchAndRank("SPOT", items, id)).toEqual(["Spotify"]);
	});

	it("ranks prefix > word-boundary > mid-word", () => {
		// "net": prefix in "net worth review" and "Netflix…"; word-boundary in
		// "Internet bill" (…Inter•net). Prefixes come first.
		const r = matchAndRank("net", items, id, 5);
		expect(r.slice(0, 2)).toEqual(["Netflix subscription", "net worth review"]);
		expect(r).toContain("Internet bill");
	});

	it("honors the limit", () => {
		expect(matchAndRank("e", items, id, 2)).toHaveLength(2);
	});

	it("works over a composed text accessor on objects", () => {
		const rows = [
			{ name: "Groceries", tags: ["food"] },
			{ name: "Gym", tags: ["health"] },
		];
		const out = matchAndRank("food", rows, (x) => `${x.name} ${x.tags.join(" ")}`);
		expect(out).toEqual([{ name: "Groceries", tags: ["food"] }]);
	});
});
