import { beforeEach, describe, expect, it, vi } from "vitest";
import { route } from "./handler";

const mocks = vi.hoisted(() => ({
	taxConfigFindFirst: vi.fn(),
	incomeCreate: vi.fn(),
	incomeUpdate: vi.fn(),
	taxRecordCreate: vi.fn(),
	taxRecordUpdate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
	prisma: {
		taxConfig: { findFirst: mocks.taxConfigFindFirst },
		income: { create: mocks.incomeCreate, update: mocks.incomeUpdate },
		taxRecord: { create: mocks.taxRecordCreate, update: mocks.taxRecordUpdate },
	},
}));
vi.mock("./session", () => ({ requireUserId: vi.fn(async () => "user-a") }));

import { incomeHandlers, taxRecordHandlers } from "./resources";

const now = new Date("2026-01-01T00:00:00.000Z");
const row = {
	id: "row-1",
	userId: "user-a",
	taxConfigId: "foreign-config",
	taxConfig: { name: "Other user's tax" },
	date: now,
	amount: null,
	currency: "USD",
	description: null,
	createdAt: now,
	updatedAt: now,
};
const request = (body: unknown) =>
	new Request("http://localhost/api/income", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
const updateRequest = (body: unknown) =>
	new Request("http://localhost/api/income/row-1", {
		method: "PATCH",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
const context = { params: Promise.resolve({ id: "row-1" }) };

beforeEach(() => {
	vi.clearAllMocks();
	mocks.taxConfigFindFirst.mockResolvedValue(null);
	mocks.incomeCreate.mockResolvedValue(row);
	mocks.taxRecordCreate.mockResolvedValue(row);
	mocks.incomeUpdate.mockResolvedValue(row);
	mocks.taxRecordUpdate.mockResolvedValue(row);
});

describe("tax config ownership in resource handlers", () => {
	it.each([
		{
			name: "income",
			handler: incomeHandlers,
			write: mocks.incomeCreate,
			body: { taxConfigId: "foreign-config" },
		},
		{
			name: "tax record",
			handler: taxRecordHandlers,
			write: mocks.taxRecordCreate,
			body: { taxConfigId: "foreign-config", month: 1, year: 2026 },
		},
	])("rejects creating $name linked to another user's tax config", async ({
		handler,
		write,
		body,
	}) => {
		const response = await route(handler.create)(request(body), undefined);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({
			error: "Tax configuration not found",
		});
		expect(mocks.taxConfigFindFirst).toHaveBeenCalledWith({
			where: { id: "foreign-config", userId: "user-a" },
			select: { id: true },
		});
		expect(write).not.toHaveBeenCalled();
	});

	it.each([
		{ name: "income", handler: incomeHandlers, write: mocks.incomeUpdate },
		{
			name: "tax record",
			handler: taxRecordHandlers,
			write: mocks.taxRecordUpdate,
		},
	])("rejects updating $name with another user's tax config", async ({
		handler,
		write,
	}) => {
		const response = await route(handler.update)(
			updateRequest({ taxConfigId: "foreign-config" }),
			context,
		);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({
			error: "Tax configuration not found",
		});
		expect(mocks.taxConfigFindFirst).toHaveBeenCalledWith({
			where: { id: "foreign-config", userId: "user-a" },
			select: { id: true },
		});
		expect(write).not.toHaveBeenCalled();
	});

	it.each([
		{ name: "income", handler: incomeHandlers, write: mocks.incomeUpdate },
		{
			name: "tax record",
			handler: taxRecordHandlers,
			write: mocks.taxRecordUpdate,
		},
	])("allows clearing the tax config on $name update", async ({
		handler,
		write,
	}) => {
		const response = await route(handler.update)(
			updateRequest({ taxConfigId: null }),
			context,
		);

		expect(response.status).toBe(200);
		expect(mocks.taxConfigFindFirst).not.toHaveBeenCalled();
		expect(write).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "row-1", userId: "user-a" },
				data: { taxConfigId: null },
			}),
		);
	});

	it.each([
		{ name: "income", handler: incomeHandlers, write: mocks.incomeUpdate },
		{
			name: "tax record",
			handler: taxRecordHandlers,
			write: mocks.taxRecordUpdate,
		},
	])("leaves tax config unchanged on a partial $name update", async ({
		handler,
		write,
	}) => {
		const response = await route(handler.update)(
			updateRequest({ description: "Edited" }),
			context,
		);

		expect(response.status).toBe(200);
		expect(mocks.taxConfigFindFirst).not.toHaveBeenCalled();
		expect(write).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "row-1", userId: "user-a" },
				data: { description: "Edited" },
			}),
		);
	});

	it.each([
		{
			name: "income",
			handler: incomeHandlers,
			write: mocks.incomeCreate,
			body: {},
		},
		{
			name: "tax record",
			handler: taxRecordHandlers,
			write: mocks.taxRecordCreate,
			body: { month: 1, year: 2026 },
		},
	])("creates $name with a config owned by the requester", async ({
		handler,
		write,
		body,
	}) => {
		mocks.taxConfigFindFirst.mockResolvedValue({ id: "owned-config" });
		const response = await route(handler.create)(
			request({ ...body, taxConfigId: "owned-config" }),
			undefined,
		);

		expect(response.status).toBe(201);
		expect(mocks.taxConfigFindFirst).toHaveBeenCalledWith({
			where: { id: "owned-config", userId: "user-a" },
			select: { id: true },
		});
		expect(write).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					userId: "user-a",
					taxConfigId: "owned-config",
				}),
			}),
		);
	});

	it.each([
		{ name: "income", handler: incomeHandlers, write: mocks.incomeUpdate },
		{
			name: "tax record",
			handler: taxRecordHandlers,
			write: mocks.taxRecordUpdate,
		},
	])("updates $name with a config owned by the requester", async ({
		handler,
		write,
	}) => {
		mocks.taxConfigFindFirst.mockResolvedValue({ id: "owned-config" });
		const response = await route(handler.update)(
			updateRequest({ taxConfigId: "owned-config" }),
			context,
		);

		expect(response.status).toBe(200);
		expect(mocks.taxConfigFindFirst).toHaveBeenCalledWith({
			where: { id: "owned-config", userId: "user-a" },
			select: { id: true },
		});
		expect(write).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "row-1", userId: "user-a" },
				data: { taxConfigId: "owned-config" },
			}),
		);
	});

	it.each([
		{
			name: "income",
			handler: incomeHandlers,
			write: mocks.incomeCreate,
			body: {},
		},
		{
			name: "tax record",
			handler: taxRecordHandlers,
			write: mocks.taxRecordCreate,
			body: { month: 1, year: 2026 },
		},
	])("creates $name without a tax config", async ({ handler, write, body }) => {
		const response = await route(handler.create)(request(body), undefined);

		expect(response.status).toBe(201);
		expect(mocks.taxConfigFindFirst).not.toHaveBeenCalled();
		expect(write).toHaveBeenCalledOnce();
		expect(write.mock.calls[0][0].data).not.toHaveProperty("taxConfigId");
	});

	it.each([
		{
			name: "income",
			handler: incomeHandlers,
			write: mocks.incomeCreate,
			body: {},
		},
		{
			name: "tax record",
			handler: taxRecordHandlers,
			write: mocks.taxRecordCreate,
			body: { month: 1, year: 2026 },
		},
	])("creates $name with an explicitly null tax config", async ({
		handler,
		write,
		body,
	}) => {
		const response = await route(handler.create)(
			request({ ...body, taxConfigId: null }),
			undefined,
		);

		expect(response.status).toBe(201);
		expect(mocks.taxConfigFindFirst).not.toHaveBeenCalled();
		expect(write).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ userId: "user-a", taxConfigId: null }),
			}),
		);
	});

	it.each([
		{
			name: "income",
			handler: incomeHandlers,
			write: mocks.incomeCreate,
			body: {},
		},
		{
			name: "tax record",
			handler: taxRecordHandlers,
			write: mocks.taxRecordCreate,
			body: { month: 1, year: 2026 },
		},
	])("fails closed if tax config lookup fails during $name creation", async ({
		handler,
		write,
		body,
	}) => {
		mocks.taxConfigFindFirst.mockRejectedValue(new Error("lookup unavailable"));

		await expect(
			handler.create(request({ ...body, taxConfigId: "owned-config" })),
		).rejects.toThrow("lookup unavailable");
		expect(write).not.toHaveBeenCalled();
	});

	it.each([
		{ name: "income", handler: incomeHandlers, write: mocks.incomeUpdate },
		{
			name: "tax record",
			handler: taxRecordHandlers,
			write: mocks.taxRecordUpdate,
		},
	])("fails closed if tax config lookup fails during $name update", async ({
		handler,
		write,
	}) => {
		mocks.taxConfigFindFirst.mockRejectedValue(new Error("lookup unavailable"));

		await expect(
			handler.update(updateRequest({ taxConfigId: "owned-config" }), context),
		).rejects.toThrow("lookup unavailable");
		expect(write).not.toHaveBeenCalled();
	});
});
