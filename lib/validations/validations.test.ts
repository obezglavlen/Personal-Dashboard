import { describe, expect, it } from "vitest";
import { expenseSchema } from "./expense";
import { telegramChatIdSchema } from "./settings";
import { subscriptionSchema } from "./subscription";
import { taskSchema } from "./task";

describe("expenseSchema", () => {
	it("accepts a valid expense and coerces a string amount to a number", () => {
		const r = expenseSchema.parse({ name: "Lunch", amount: "12.50" });
		expect(r.amount).toBe(12.5);
	});

	it("rejects a negative amount and an empty name", () => {
		expect(expenseSchema.safeParse({ name: "x", amount: -1 }).success).toBe(
			false,
		);
		expect(expenseSchema.safeParse({ name: "", amount: 1 }).success).toBe(
			false,
		);
	});
});

describe("subscriptionSchema", () => {
	it("accepts the monthly and annual periods", () => {
		expect(
			subscriptionSchema.safeParse({ name: "N", price: 9, period: "monthly" })
				.success,
		).toBe(true);
	});

	it("rejects an unknown period", () => {
		expect(
			subscriptionSchema.safeParse({ name: "N", price: 9, period: "weekly" })
				.success,
		).toBe(false);
	});
});

describe("taskSchema", () => {
	it("defaults status and priority", () => {
		const r = taskSchema.parse({ title: "T" });
		expect(r.status).toBe("todo");
		expect(r.priority).toBe("medium");
	});
});

describe("telegramChatIdSchema", () => {
	it("accepts positive and negative numeric ids", () => {
		expect(telegramChatIdSchema.safeParse("123456789").success).toBe(true);
		expect(telegramChatIdSchema.safeParse("-1001234567890").success).toBe(true);
	});

	it("rejects non-numeric, empty, and decimal ids", () => {
		expect(telegramChatIdSchema.safeParse("abc").success).toBe(false);
		expect(telegramChatIdSchema.safeParse("").success).toBe(false);
		expect(telegramChatIdSchema.safeParse("12.3").success).toBe(false);
	});
});
