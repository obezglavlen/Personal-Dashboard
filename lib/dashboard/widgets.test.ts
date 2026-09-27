import { describe, expect, it } from "vitest";
import { WIDGETS } from "./widgets";

describe("dashboard customization labels", () => {
	it("calls the accounting and limits widgets by their new names without changing stored IDs", () => {
		expect(
			WIDGETS.filter((widget) =>
				["net-worth", "budget-status"].includes(widget.id),
			).map(({ id, title }) => ({ id, title })),
		).toEqual([
			{ id: "net-worth", title: "Accounting" },
			{ id: "budget-status", title: "Limit status" },
		]);
	});
});
