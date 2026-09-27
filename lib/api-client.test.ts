import { afterEach, describe, expect, it, vi } from "vitest";
import { apiPost } from "./api-client";

vi.mock("swr", () => ({ mutate: vi.fn(async () => []) }));

import { mutate } from "swr";

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

describe("shared tag catalog invalidation", () => {
	it("refreshes tag suggestions after saving a tagged resource", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("{}", { status: 200 })),
		);
		await apiPost("/api/expenses", { name: "Lunch", tags: ["new"] });
		expect(mutate).toHaveBeenCalledWith("/api/tags");
	});

	it("does not refresh suggestions when a write fails", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response('{"error":"No"}', { status: 400 })),
		);
		await expect(apiPost("/api/expenses", { name: "Lunch" })).rejects.toThrow(
			"No",
		);
		expect(mutate).not.toHaveBeenCalled();
	});
});
