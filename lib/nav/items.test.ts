import { describe, expect, it } from "vitest";
import { NAV_ITEMS } from "./items";

describe("renamed navigation", () => {
	it("shows Limits and Accounting while keeping their stable URLs", () => {
		expect(
			NAV_ITEMS.filter((item) =>
				["/budgets", "/net-worth"].includes(item.href),
			).map(({ href, label }) => ({ href, label })),
		).toEqual([
			{ href: "/budgets", label: "Limits" },
			{ href: "/net-worth", label: "Accounting" },
		]);
	});
});
