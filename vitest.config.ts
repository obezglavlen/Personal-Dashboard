import { defineConfig } from "vitest/config";

/**
 * Unit tests over pure logic only (no DB, no network). `resolve.tsconfigPaths`
 * resolves the `@/*` import alias so modules under test (e.g. budget.ts →
 * `@/lib/format`) load the same way they do under Next.
 */
export default defineConfig({
	resolve: {
		tsconfigPaths: true,
	},
	test: {
		environment: "node",
		include: ["lib/**/*.test.ts"],
	},
});
