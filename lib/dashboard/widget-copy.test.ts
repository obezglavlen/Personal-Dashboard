import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BudgetWidget } from "../../app/(dashboard)/budget-widget";
import { NetWorthWidget } from "../../app/(dashboard)/net-worth-widget";

vi.mock("@/lib/hooks/use-resource", () => ({
	useResource: () => ({ items: [] }),
}));
vi.mock("@/lib/hooks/use-currency", () => ({
	useCurrency: () => ({ currency: "USD" }),
}));
vi.mock("@/lib/hooks/use-rates", () => ({
	useRates: () => ({ rates: {} }),
}));

describe("dashboard widget copy", () => {
	it("labels the accounts widget Accounting and keeps its stable destination", () => {
		const html = renderToStaticMarkup(createElement(NetWorthWidget));
		expect(html).toContain("Accounting</");
		expect(html).toContain("Net worth across 0 accounts");
		expect(html).not.toContain("Net Worth</");
		expect(html).toContain('href="/net-worth"');
	});

	it("labels the spending-cap widget Limits, including its empty state", () => {
		const html = renderToStaticMarkup(createElement(BudgetWidget));
		expect(html).toContain("Limits</");
		expect(html).toContain("No limits yet.");
		expect(html).not.toContain("Budgets</");
		expect(html).toContain('href="/budgets"');
	});
});
