// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsClient } from "@/app/(dashboard)/settings/settings-client";

vi.mock("@/lib/api-client", () => ({
	apiGet: () => new Promise(() => {}),
	apiPost: vi.fn(),
	apiPut: vi.fn(),
}));

afterEach(cleanup);

describe("Settings JSON export/import copy", () => {
	it("warns this is a partial and lossy export rather than a portable backup", () => {
		render(<SettingsClient />);
		expect(screen.getByText(/partial JSON export/i)).toBeTruthy();
		expect(screen.getByText(/financial accounts/i)).toBeTruthy();
		expect(screen.getByText(/lastPostedAt|last-posted state/i)).toBeTruthy();
		expect(screen.queryByText(/portable backup/i)).toBeNull();
		expect(screen.queryByRole("button", { name: /replace all/i })).toBeNull();
		expect(screen.getByRole("button", { name: /replace covered data/i })).toBeTruthy();
	});

	it("limits destructive confirmation to covered datasets and warns of omissions", () => {
		const { container } = render(<SettingsClient />);
		fireEvent.click(screen.getByRole("button", { name: /replace covered data/i }));
		const picker = container.querySelector('input[type="file"]');
		expect(picker).not.toBeNull();
		fireEvent.change(picker!, {
			target: { files: [new File(["{}"], "legacy.json", { type: "application/json" })] },
		});
		expect(screen.getByRole("dialog")).toBeTruthy();
		expect(screen.getByText(/does not delete.*calendar events/i)).toBeTruthy();
		expect(screen.queryByText(/replace everything/i)).toBeNull();
	});
});
