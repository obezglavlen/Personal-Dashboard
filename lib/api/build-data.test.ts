import { describe, expect, it } from "vitest";
import {
	buildAccountData,
	buildBookmarkData,
	buildBudgetData,
	buildExpenseData,
	buildGoalData,
	buildNoteData,
	buildRecurringData,
	buildSubscriptionData,
	buildTaskData,
} from "./build-data";

const UID = "user_123";

describe("buildExpenseData", () => {
	it("injects userId and applies currency/tags/date defaults", () => {
		const data = buildExpenseData({ name: "Lunch", amount: 12 }, UID);
		expect(data.userId).toBe(UID);
		expect(data.currency).toBe("USD");
		expect(data.tags).toEqual([]);
		expect(data.date).toBeInstanceOf(Date);
	});

	it("coerces a supplied ISO date and keeps supplied currency/tags", () => {
		const data = buildExpenseData(
			{ name: "Fuel", amount: 40, currency: "EUR", date: "2026-06-15", tags: ["car"] },
			UID,
		);
		expect(data.currency).toBe("EUR");
		expect(data.tags).toEqual(["car"]);
		expect((data.date as Date).toISOString()).toBe("2026-06-15T00:00:00.000Z");
	});
});

describe("buildTaskData", () => {
	it("defaults dueDate to null and injects userId", () => {
		const data = buildTaskData(
			{ title: "Ship", status: "todo", priority: "medium" },
			UID,
		);
		expect(data.userId).toBe(UID);
		expect(data.dueDate).toBeNull();
	});

	it("coerces a supplied dueDate to a Date", () => {
		const data = buildTaskData(
			{ title: "Ship", status: "todo", priority: "high", dueDate: "2026-07-03" },
			UID,
		);
		expect((data.dueDate as Date).toISOString()).toBe("2026-07-03T00:00:00.000Z");
	});
});

describe("buildSubscriptionData", () => {
	it("defaults startDate to a Date and injects userId", () => {
		const data = buildSubscriptionData(
			{ name: "Netflix", price: 15.99, period: "monthly", currency: "USD" },
			UID,
		);
		expect(data.userId).toBe(UID);
		expect(data.startDate).toBeInstanceOf(Date);
	});
});

describe("buildBudgetData", () => {
	it("applies currency/tags/period defaults", () => {
		const data = buildBudgetData({ name: "Food", amount: 300 }, UID);
		expect(data.userId).toBe(UID);
		expect(data.currency).toBe("USD");
		expect(data.tags).toEqual([]);
		expect(data.period).toBe("monthly");
	});
});

describe("buildGoalData", () => {
	it("defaults current to 0 and currency to USD", () => {
		const data = buildGoalData({ name: "Trip", target: 5000 }, UID);
		expect(data.userId).toBe(UID);
		expect(data.current).toBe(0);
		expect(data.currency).toBe("USD");
	});
});

describe("buildAccountData", () => {
	it("defaults type to cash and currency to USD; allows negative balance", () => {
		const data = buildAccountData({ name: "Loan", balance: -1000 }, UID);
		expect(data.userId).toBe(UID);
		expect(data.type).toBe("cash");
		expect(data.currency).toBe("USD");
		expect(data.balance).toBe(-1000);
	});
});

describe("buildRecurringData", () => {
	it("applies defaults, coerces dates, and injects userId", () => {
		const data = buildRecurringData(
			{ name: "Rent", amount: 1200, type: "expense", period: "monthly" },
			UID,
		);
		expect(data.userId).toBe(UID);
		expect(data.currency).toBe("USD");
		expect(data.tags).toEqual([]);
		expect(data.startDate).toBeInstanceOf(Date);
		expect(data.endDate).toBeNull();
	});

	it("coerces a supplied endDate and keeps type/period", () => {
		const data = buildRecurringData(
			{
				name: "Salary",
				amount: 5000,
				type: "income",
				period: "monthly",
				startDate: "2026-01-01",
				endDate: "2026-12-31",
				currency: "EUR",
			},
			UID,
		);
		expect(data.type).toBe("income");
		expect(data.currency).toBe("EUR");
		expect((data.startDate as Date).toISOString()).toBe("2026-01-01T00:00:00.000Z");
		expect((data.endDate as Date).toISOString()).toBe("2026-12-31T00:00:00.000Z");
	});
});

describe("buildNoteData / buildBookmarkData", () => {
	it("pass through fields and inject userId", () => {
		const note = buildNoteData(
			{ title: "Idea", content: "body", tags: ["x"], pinned: true },
			UID,
		);
		expect(note).toMatchObject({ title: "Idea", pinned: true, userId: UID });

		const bm = buildBookmarkData(
			{ url: "https://a.co", title: "A", category: "general" },
			UID,
		);
		expect(bm).toMatchObject({ url: "https://a.co", category: "general", userId: UID });
	});
});
