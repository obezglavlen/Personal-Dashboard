import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BudgetClient } from "../app/(dashboard)/budgets/budget-client";
import { BudgetWidget } from "../app/(dashboard)/budget-widget";

const fixtures = vi.hoisted(() => ({
	budgets: [
		{
			id: "food",
			name: "Food",
			amount: 100,
			currency: "USD",
			period: "monthly",
			tags: ["food"],
			createdAt: "2026-06-01T00:00:00.000Z",
		},
	],
	expenses: [
		{
			id: "lunch",
			name: "Lunch",
			amount: 5,
			currency: "EUR",
			date: "2026-06-10T00:00:00.000Z",
			tags: ["food"],
			createdAt: "2026-06-10T00:00:00.000Z",
		},
	],
	rates: {} as Record<string, number>,
}));

vi.mock("@/lib/hooks/use-resource", () => ({
	useResource: (path: string) => ({
		items: path === "/api/budgets" ? fixtures.budgets : fixtures.expenses,
		mutate: () => {},
		remove: () => {},
	}),
}));
vi.mock("@/lib/hooks/use-currency", () => ({
	useCurrency: () => ({ currency: "USD" }),
}));
vi.mock("@/lib/hooks/use-rates", () => ({
	useRates: () => ({ rates: fixtures.rates }),
}));
vi.mock("@/lib/hooks/use-all-tags", () => ({
	useAllTags: () => [],
}));

afterEach(() => {
	vi.useRealTimers();
	fixtures.rates = {};
	fixtures.budgets[0].currency = "USD";
	fixtures.expenses[0].currency = "EUR";
});

describe("budget surfaces with missing exchange rates", () => {
	it("shows unavailable rather than a false 1:1 total and progress in both surfaces", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));

		const page = renderToStaticMarkup(createElement(BudgetClient));
		const widget = renderToStaticMarkup(createElement(BudgetWidget));
		for (const html of [page, widget]) {
			expect(html).toContain("Conversion unavailable");
			expect(html).not.toContain("$5.00");
			expect(html).not.toContain("style=\"width:");
		}
		expect(page).not.toContain('role="progressbar"');
	});

	it("does not display a foreign-currency cap as though it were in the display currency", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
		fixtures.budgets[0].currency = "EUR";
		fixtures.expenses[0].currency = "USD";

		for (const component of [BudgetClient, BudgetWidget]) {
			const html = renderToStaticMarkup(createElement(component));
			expect(html).toContain("Conversion unavailable: missing EUR rate.");
			expect(html).not.toContain("$100.00");
		}
	});

	it("shows converted values and progress once the rate is available", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
		fixtures.rates = { EUR: 0.5 };

		for (const component of [BudgetClient, BudgetWidget]) {
			const html = renderToStaticMarkup(createElement(component));
			expect(html).toContain("$10.00");
			expect(html).toContain("$100.00");
			expect(html).toContain('style="width:10%"');
			expect(html).not.toContain("Conversion unavailable");
		}
	});
});
