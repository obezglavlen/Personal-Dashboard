import { describe, expect, it } from "vitest";
import { requiredAdminPassword } from "./seed-admin";

describe("seed admin credentials", () => {
	it("refuses the previous built-in password or an unset value", () => {
		expect(() => requiredAdminPassword({})).toThrow(/ADMIN_PASSWORD/);
		expect(() => requiredAdminPassword({ ADMIN_PASSWORD: "admin123" })).toThrow(
			/12/,
		);
	});

	it("accepts an explicitly supplied strong password", () => {
		expect(
			requiredAdminPassword({ ADMIN_PASSWORD: "long-random-seed-password" }),
		).toBe("long-random-seed-password");
	});
});
