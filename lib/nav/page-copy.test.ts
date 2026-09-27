import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BudgetClient } from "../../app/(dashboard)/budgets/budget-client";
import { NetWorthClient } from "../../app/(dashboard)/net-worth/net-worth-client";

vi.mock("@/lib/hooks/use-resource", () => ({
	useResource: () => ({ items: [], mutate: () => {}, remove: () => {} }),
}));
vi.mock("@/lib/hooks/use-currency", () => ({
	useCurrency: () => ({ currency: "USD" }),
}));
vi.mock("@/lib/hooks/use-rates", () => ({
	useRates: () => ({ rates: {} }),
}));
vi.mock("@/lib/hooks/use-historical-rates", () => ({
	useHistoricalRates: () => ({ ratesForDate: () => ({}) }),
}));
vi.mock("@/lib/hooks/use-all-tags", () => ({
	useAllTags: () => [],
}));

describe("financial section headings", () => {
	it("calls the page Accounting but retains the distinct net worth metric", () => {
		const html = renderToStaticMarkup(createElement(NetWorthClient));
		expect(html).toMatch(/<h1[^>]*>Accounting<\/h1>/);
		expect(html).toContain("Net worth</p>");
		expect(html).toContain("Net worth over time");
	});

	it("calls the spending-cap page Limits including its empty state", () => {
		const html = renderToStaticMarkup(createElement(BudgetClient));
		expect(html).toMatch(/<h1[^>]*>Limits<\/h1>/);
		expect(html).toContain("No limits yet.");
	});
});
