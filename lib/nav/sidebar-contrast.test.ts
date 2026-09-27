import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("sidebar active-link contrast", () => {
	it("uses dark text on the bright primary background", () => {
		const css = readFileSync("app/globals.css", "utf8");
		// The same token is used by the 14px active navigation links and the logo.
		expect(css).toMatch(/--sidebar-primary-foreground:\s*oklch\(0 0 0\)/);
	});
});
