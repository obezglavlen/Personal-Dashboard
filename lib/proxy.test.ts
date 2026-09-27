import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const AUTH_PATH = "/api/auth/callback/credentials";

function request(
	path: string,
	headers: Record<string, string> = {},
	method = "POST",
) {
	return new NextRequest(`https://dashboard.example${path}`, {
		method,
		headers,
	});
}

describe("proxy rate limits", () => {
	let proxy: typeof import("../proxy").proxy;

	beforeEach(async () => {
		vi.stubEnv("VERCEL", "");
		vi.stubEnv("RATE_LIMIT_TRUSTED_PROXY", "");
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
		vi.resetModules(); // A fresh in-memory window per test.
		proxy = (await import("../proxy")).proxy;
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllEnvs();
	});

	it("shares the credentials bucket when direct clients rotate untrusted IP headers", async () => {
		for (let i = 0; i < 10; i++) {
			const response = await proxy(
				request(AUTH_PATH, {
					"x-forwarded-for": `198.51.100.${i + 1}`,
					"x-real-ip": `203.0.113.${i + 1}`,
					"x-vercel-forwarded-for": `192.0.2.${i + 1}`,
				}),
			);
			expect(response.status).toBe(200);
		}
		const blocked = await proxy(
			request(AUTH_PATH, { "x-forwarded-for": "198.51.100.200" }),
		);
		expect(blocked.status).toBe(429);
		expect(blocked.headers.get("Retry-After")).toBe("300");
	});

	it("uses the Vercel-injected IP rather than an attacker-controlled forwarded chain", async () => {
		vi.stubEnv("VERCEL", "1");
		for (let i = 0; i < 10; i++) {
			const response = await proxy(
				request(AUTH_PATH, {
					"x-vercel-forwarded-for": "192.0.2.10",
					"x-forwarded-for": `198.51.100.${i + 1}`,
				}),
			);
			expect(response.status).toBe(200);
		}
		expect(
			(await proxy(request(AUTH_PATH, {
				"x-vercel-forwarded-for": "192.0.2.10",
				"x-forwarded-for": "198.51.100.200",
			}))).status,
		).toBe(429);
		expect(
			(await proxy(request(AUTH_PATH, {
				"x-vercel-forwarded-for": "192.0.2.11",
				"x-forwarded-for": "198.51.100.200",
			}))).status,
		).toBe(200);
	});

	it("separates clients behind an explicitly trusted self-hosted proxy", async () => {
		vi.stubEnv("RATE_LIMIT_TRUSTED_PROXY", "1");
		for (let i = 0; i < 10; i++) {
			expect(
				(await proxy(request(AUTH_PATH, {
					"x-dashboard-client-ip": "2001:db8::10",
					"x-forwarded-for": `198.51.100.${i + 1}`,
				}))).status,
			).toBe(200);
		}
		expect(
			(await proxy(request(AUTH_PATH, {
				"x-dashboard-client-ip": "2001:db8::10",
				"x-forwarded-for": "198.51.100.200",
			}))).status,
		).toBe(429);
		expect(
			(await proxy(request(AUTH_PATH, {
				"x-dashboard-client-ip": "2001:db8::11",
				"x-forwarded-for": "198.51.100.200",
			}))).status,
		).toBe(200);
	});

	it("uses the same bucket for equivalent trusted IPv6 spellings", async () => {
		vi.stubEnv("RATE_LIMIT_TRUSTED_PROXY", "1");
		for (let i = 0; i < 10; i++) {
			expect(
				(await proxy(request(AUTH_PATH, {
					"x-dashboard-client-ip": "2001:0db8:0:0:0:0:0:a",
				}))).status,
			).toBe(200);
		}
		expect(
			(await proxy(request(AUTH_PATH, {
				"x-dashboard-client-ip": "2001:db8::a",
			}))).status,
		).toBe(429);
	});

	it("shares the chat bucket and resets after one minute when no trusted IP exists", async () => {
		for (let i = 0; i < 20; i++) {
			expect((await proxy(request("/api/chat", {
				"x-real-ip": `203.0.113.${i + 1}`,
			}))).status).toBe(200);
		}
		expect((await proxy(request("/api/chat", {
			"x-real-ip": "203.0.113.200",
		}))).status).toBe(429);
		vi.advanceTimersByTime(60_000);
		expect((await proxy(request("/api/chat", {
			"x-real-ip": "203.0.113.200",
		}))).status).toBe(200);
	});

	it("fails closed on missing or malformed trusted Vercel IPs", async () => {
		vi.stubEnv("VERCEL", "1");
		for (let i = 0; i < 10; i++) {
			expect((await proxy(request(AUTH_PATH, {
				...(i % 2 ? { "x-vercel-forwarded-for": "192.0.2.1, 192.0.2.2" } : {}),
				"x-forwarded-for": `198.51.100.${i + 1}`,
			}))).status).toBe(200);
		}
		expect((await proxy(request(AUTH_PATH, {
			"x-vercel-forwarded-for": "not-an-ip",
			"x-forwarded-for": "198.51.100.200",
		}))).status).toBe(429);
	});
});
