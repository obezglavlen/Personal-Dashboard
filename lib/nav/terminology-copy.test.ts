import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");

describe("financial terminology in user-facing copy", () => {
	it("groups search results under Limits without changing the destination", () => {
		const palette = source("components/shared/command-palette.tsx");
		expect(palette).toContain('group: "Limits"');
		expect(palette).toContain('onSelect: goTo("/budgets")');
		expect(palette).not.toContain('group: "Budgets"');
	});

	it("uses limit terminology in page warnings and delete feedback", () => {
		const page = source("app/(dashboard)/budgets/budget-client.tsx");
		expect(page).toContain("exceeded its limit this month");
		expect(page).toContain("limits have been exceeded this month");
		expect(page).toContain("Failed to delete limit");
	});

	it("calls create and edit dialogs Limits in titles and feedback", () => {
		const dialog = source("app/(dashboard)/budgets/create-budget-dialog.tsx");
		expect(dialog).toContain('"Edit Limit" : "Create Limit"');
		expect(dialog).toContain('"Limit updated" : "Limit created"');
		expect(dialog).toContain("Failed to update limit");
		expect(dialog).toContain("Failed to create limit");
		expect(dialog).toContain('apiPost("/api/budgets"');
	});

	it("uses Limits in notification settings but keeps stored preference keys", () => {
		const settings = source("app/(dashboard)/settings/settings-client.tsx");
		expect(settings).toContain("limits near or");
		expect(settings).toContain('label: "Limits near or over cap"');
		expect(settings).toContain("Limit alert threshold (%)");
		expect(settings).toContain("A limit is flagged in the digest");
		expect(settings).toContain("checked: notifyBudgets");
	});

	it("uses Limits in assistant badges, suggestions and input copy, but keeps the net worth question", () => {
		const assistant = source("app/(dashboard)/assistant/assistant-client.tsx");
		expect(assistant).toContain('getBudgets: "limits"');
		expect(assistant).toContain('createBudget: "limit"');
		expect(assistant).toContain('"Am I over any limit?"');
		expect(assistant).toContain(
			'placeholder="Ask about your spending, limits, tasks…"',
		);
		expect(assistant).toContain('"What\'s my net worth?"');
	});

	it("guides the assistant to call sections Limits and Accounting while retaining net worth math", () => {
		const prompt = source("app/api/chat/route.ts");
		const tools = source("lib/ai/tools.ts");
		expect(prompt).toContain("data: expenses, limits, subscriptions");
		expect(prompt).toContain(
			"accounting (financial accounts, savings goals, and net worth)",
		);
		expect(tools).toContain("List the user's limits (monthly spending caps)");
		expect(tools).toContain("Create a monthly limit: a spending cap");
		expect(tools).toContain("financial accounts from Accounting");
		expect(tools).toContain("net worth totaled per currency");
	});

	it("documents the renamed sections and limit alerts without relabeling snapshots", () => {
		const readme = source("README.md");
		expect(readme).toContain("Subscriptions, limits, taxes, accounting");
		expect(readme).toContain("limits near/over cap");
		expect(readme).toContain("daily net-worth snapshot");
	});
});
