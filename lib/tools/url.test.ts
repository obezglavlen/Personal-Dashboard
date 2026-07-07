import { describe, expect, it } from "vitest";
import { decodeComponent, encodeComponent, parseQuery } from "./url";

describe("parseQuery", () => {
	it("splits a query string into decoded pairs, preserving repeats", () => {
		expect(parseQuery("?a=1&b=two%20words&a=2")).toEqual([
			{ key: "a", value: "1" },
			{ key: "b", value: "two words" },
			{ key: "a", value: "2" },
		]);
	});

	it("accepts a full URL and drops the fragment", () => {
		expect(parseQuery("https://x.com/p?x=1#frag")).toEqual([{ key: "x", value: "1" }]);
	});

	it("accepts a bare query string with no leading ?", () => {
		expect(parseQuery("a=1&b=2")).toEqual([
			{ key: "a", value: "1" },
			{ key: "b", value: "2" },
		]);
	});

	it("returns [] for empty input", () => {
		expect(parseQuery("   ")).toEqual([]);
	});
});

describe("encode/decode component", () => {
	it("round-trips reserved characters", () => {
		const raw = "a b&c=d/e?f";
		expect(decodeComponent(encodeComponent(raw)).value).toBe(raw);
	});

	it("surfaces malformed sequences instead of throwing", () => {
		const r = decodeComponent("%");
		expect(r.value).toBeUndefined();
		expect(r.error).toBeDefined();
	});
});
