import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => {
	const delegate = () => ({
		findMany: vi.fn().mockResolvedValue([]),
		deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
		createMany: vi.fn().mockResolvedValue({ count: 0 }),
		findFirst: vi.fn().mockResolvedValue(null),
		create: vi.fn(),
	});
	const prismaMock = {
		bookmark: delegate(),
		note: delegate(),
		task: delegate(),
		subscription: delegate(),
		taxConfig: delegate(),
		taxRecord: delegate(),
		income: delegate(),
		expense: delegate(),
		$transaction: vi.fn(),
	};
	return { prismaMock };
});

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/api/session", () => ({ requireUserId: async () => "test-user" }));
vi.mock("@/lib/api/resources", () => ({
	serializeSubscription: (row: unknown) => row,
	serializeTaxConfig: (row: unknown) => row,
	serializeTaxRecord: (row: unknown) => row,
	serializeIncome: (row: unknown) => row,
	serializeExpense: (row: unknown) => row,
}));

import { GET } from "@/app/api/export/route";
import { POST } from "@/app/api/import/route";

const included = [
	"bookmarks",
	"notes",
	"tasks",
	"subscriptions",
	"taxConfigs",
	"taxRecords",
	"income",
	"expenses",
];
const omitted = [
	"budgets",
	"financialAccounts",
	"goals",
	"recurringTransactions",
	"calendarEvents",
	"userSettings",
	"tags",
	"netWorthSnapshots",
];

function importRequest(data: Record<string, unknown>, mode = "replace") {
	return new Request(`http://localhost/api/import?mode=${mode}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ version: 1, data }),
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	for (const resource of included) {
		const delegate = prismaMock[
			resource === "bookmarks" ? "bookmark" :
			resource === "notes" ? "note" :
			resource === "tasks" ? "task" :
			resource === "subscriptions" ? "subscription" :
			resource === "taxConfigs" ? "taxConfig" :
			resource === "taxRecords" ? "taxRecord" :
			resource === "expenses" ? "expense" : "income"
		];
		delegate.findMany.mockResolvedValue([]);
	}
	prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock));
});

describe("JSON export scope", () => {
	it("identifies itself as partial and names included and omitted user datasets", async () => {
		const response = await GET(new Request("http://localhost/api/export"), undefined);
		expect(response.status).toBe(200);
		const bundle = await response.json();
		expect(bundle.version).toBe(1);
		expect(Object.keys(bundle.data)).toEqual(included);
		expect(bundle.scope).toMatchObject({
			partial: true,
			included,
			omitted,
			replaceDeletes: included,
			importLimitations: expect.arrayContaining([
				expect.stringMatching(/ID/),
				expect.stringMatching(/lastPostedAt/),
			]),
		});
	});
});

describe("version 1 JSON import", () => {
	it("accepts old files without scope and reports exactly what replace deleted", async () => {
		const data: Record<string, unknown> = Object.fromEntries(included.map((key) => [key, []]));
		const response = await POST(importRequest(data), undefined);
		expect(response.status).toBe(200);
		const result = await response.json();
		expect(result).toMatchObject({
			mode: "replace",
			imported: Object.fromEntries(included.map((key) => [key, 0])),
			scope: { partial: true, replaceDeletes: included, omitted },
		});
		for (const delegate of [
			prismaMock.bookmark, prismaMock.note, prismaMock.task,
			prismaMock.subscription, prismaMock.taxConfig, prismaMock.taxRecord,
			prismaMock.income, prismaMock.expense,
		]) {
			expect(delegate.deleteMany).toHaveBeenCalledWith({ where: { userId: "test-user" } });
		}
	});

	it("refuses destructive replace if an included dataset is missing", async () => {
		const response = await POST(importRequest({ bookmarks: [] }), undefined);
		expect(response.status).toBe(400);
		expect((await response.json()).error).toMatch(/missing|invalid/i);
		expect(prismaMock.$transaction).not.toHaveBeenCalled();
	});

	it("rejects skipped invalid rows before deleting anything in replace mode", async () => {
		const data: Record<string, unknown> = Object.fromEntries(included.map((key) => [key, []]));
		data.notes = [{ content: "missing required title" }];
		const response = await POST(importRequest(data), undefined);
		expect(response.status).toBe(400);
		expect((await response.json()).error).toMatch(/invalid|skipped/i);
		expect(prismaMock.$transaction).not.toHaveBeenCalled();
	});

	it("rejects non-object rows silently filtered by merge before replace can delete", async () => {
		const data: Record<string, unknown> = Object.fromEntries(included.map((key) => [key, []]));
		data.bookmarks = [null];
		const response = await POST(importRequest(data), undefined);
		expect(response.status).toBe(400);
		expect(prismaMock.$transaction).not.toHaveBeenCalled();
	});

	it.each([
		["subscriptions", { name: "Stream", price: 10, period: "monthly", startDate: "not-a-date" }],
		["expenses", { name: "Coffee", amount: 5, date: "not-a-date" }],
		["income", { amount: 5, date: "not-a-date" }],
		["taxRecords", { amount: 5, date: "not-a-date" }],
	])("rejects invalid %s dates before destructive replacement", async (resource, row) => {
		const data: Record<string, unknown> = Object.fromEntries(included.map((key) => [key, []]));
		data[resource] = [row];
		const response = await POST(importRequest(data), undefined);
		expect(response.status).toBe(400);
		expect(prismaMock.$transaction).not.toHaveBeenCalled();
	});

	it("refuses dangling tax-config references before replace deletes old configs", async () => {
		const data: Record<string, unknown> = Object.fromEntries(included.map((key) => [key, []]));
		data.taxRecords = [{ taxConfigId: "missing-config", date: "2026-01-01", amount: 5 }];
		const response = await POST(importRequest(data), undefined);
		expect(response.status).toBe(400);
		expect((await response.json()).error).toMatch(/tax config|reference/i);
		expect(prismaMock.$transaction).not.toHaveBeenCalled();
	});

	it("also rejects income referencing tax configs absent from the replacement file", async () => {
		const data: Record<string, unknown> = Object.fromEntries(included.map((key) => [key, []]));
		data.income = [{ taxConfigId: "missing-config", date: "2026-01-01", amount: 100 }];
		const response = await POST(importRequest(data), undefined);
		expect(response.status).toBe(400);
		expect((await response.json()).error).toMatch(/tax config|reference/i);
		expect(prismaMock.$transaction).not.toHaveBeenCalled();
	});
});
