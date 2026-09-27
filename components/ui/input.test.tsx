// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Input } from "./input";

afterEach(cleanup);

describe("native date input sizing", () => {
	it("keeps horizontal padding off the date input box so iOS cannot add it outside 100% width", () => {
		const ref = createRef<HTMLInputElement>();
		render(
			<Input
				type="date"
				aria-label="Date"
				defaultValue="2026-09-27"
				required
				ref={ref}
				className="sm:w-48"
			/>,
		);
		const input = screen.getByLabelText("Date") as HTMLInputElement;
		expect(input.className).toContain("w-full");
		expect(input.className).toContain("px-0");
		expect(input.className).toContain("border-0");
		expect(input.parentElement?.className).toContain("px-3");
		expect(input.parentElement?.className).toContain("border-input");
		expect(input.parentElement?.className).toContain("sm:w-48");
		expect(ref.current).toBe(input);
		expect(input.type).toBe("date");
		expect(input.value).toBe("2026-09-27");
		expect(input.required).toBe(true);
	});

	it("retains horizontal padding on ordinary text fields", () => {
		render(<Input type="text" aria-label="Name" />);
		expect(screen.getByLabelText("Name").className).toContain("px-3");
	});
});
