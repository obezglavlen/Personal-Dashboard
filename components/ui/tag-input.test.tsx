// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "./dialog";
import { TagInput } from "./tag-input";

afterEach(cleanup);

function TagDialog({ allowCreate = true }: { allowCreate?: boolean }) {
	const [tags, setTags] = useState<string[]>([]);
	const [open, setOpen] = useState(true);
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent>
				<DialogTitle>Add expense</DialogTitle>
				<DialogDescription>Choose tags</DialogDescription>
				<input aria-label="Amount" />
				<TagInput
					value={tags}
					onChange={setTags}
					suggestions={["food", "health", "travel"]}
					allowCreate={allowCreate}
				/>
			</DialogContent>
		</Dialog>
	);
}

describe("TagInput inside a modal", () => {
	it("repositions suggestions when the visual viewport scrolls independently", async () => {
		const previousViewport = Object.getOwnPropertyDescriptor(
			window,
			"visualViewport",
		);
		const viewport = Object.assign(new EventTarget(), {
			offsetTop: 0,
			height: 500,
		});
		Object.defineProperty(window, "visualViewport", {
			configurable: true,
			value: viewport,
		});
		const getRect = HTMLElement.prototype.getBoundingClientRect;
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
			function (this: HTMLElement) {
				if (this.getAttribute("role") === "dialog")
					return new DOMRect(0, 0, 300, 500);
				if (this.classList.contains("relative"))
					return new DOMRect(0, 200, 300, 40);
				return getRect.call(this);
			},
		);
		try {
			render(<TagDialog />);
			fireEvent.focus(screen.getByRole("combobox"));
			const list = await screen.findByRole("listbox");
			expect(list.style.maxHeight).toBe("192px");
			viewport.offsetTop = 150;
			viewport.height = 100;
			viewport.dispatchEvent(new Event("scroll"));
			await waitFor(() => expect(list.style.maxHeight).toBe("42px"));
		} finally {
			vi.restoreAllMocks();
			if (previousViewport)
				Object.defineProperty(window, "visualViewport", previousViewport);
			else Reflect.deleteProperty(window, "visualViewport");
		}
	});

	it("gives the combobox a name even when a form omits a label association", () => {
		render(<TagDialog />);
		expect(screen.getByRole("combobox", { name: "Tags" })).toBeTruthy();
	});

	it("reopens after a selection when clicking the input that retained focus", async () => {
		render(<TagDialog />);
		const field = screen.getByRole("combobox");
		fireEvent.focus(field);
		fireEvent.click(await screen.findByRole("option", { name: "food" }));
		await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
		fireEvent.click(field);
		expect(await screen.findByRole("option", { name: "health" })).toBeTruthy();
	});

	it("selects an existing tag and closes the suggestions without dismissing the modal", async () => {
		render(<TagDialog />);
		const field = screen.getByRole("combobox");
		fireEvent.focus(field);
		fireEvent.click(await screen.findByRole("option", { name: "food" }));
		expect(screen.getByRole("dialog")).toBeTruthy();
		expect(screen.getByRole("button", { name: "Remove food" })).toBeTruthy();
		await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
	});

	it("does not create an unknown tag when creation is disabled", () => {
		render(<TagDialog allowCreate={false} />);
		const field = screen.getByRole("combobox");
		fireEvent.focus(field);
		fireEvent.change(field, { target: { value: "unknown" } });
		fireEvent.keyDown(field, { key: "Enter" });
		expect(screen.queryByRole("button", { name: "Remove unknown" })).toBeNull();
	});

	it("closes only the suggestions on the first Escape, then closes the modal", async () => {
		render(<TagDialog />);
		const field = screen.getByRole("combobox");
		fireEvent.focus(field);
		expect(await screen.findByRole("listbox")).toBeTruthy();
		fireEvent.keyDown(field, { key: "Escape" });
		await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
		expect(screen.getByRole("dialog")).toBeTruthy();
		fireEvent.keyDown(field, { key: "Escape" });
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
	});

	it("closes suggestions when tapping another field without dismissing the modal", async () => {
		render(<TagDialog />);
		fireEvent.focus(screen.getByRole("combobox"));
		expect(await screen.findByRole("listbox")).toBeTruthy();
		fireEvent.pointerDown(screen.getByRole("textbox", { name: "Amount" }));
		await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
		expect(screen.getByRole("dialog")).toBeTruthy();
	});

	it("dismisses suggestions on keyboard Tab without closing the dialog", async () => {
		render(<TagDialog />);
		const field = screen.getByRole("combobox");
		fireEvent.focus(field);
		expect(await screen.findByRole("listbox")).toBeTruthy();
		fireEvent.keyDown(field, { key: "Tab" });
		await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
		expect(screen.getByRole("dialog")).toBeTruthy();
	});

	it("keeps options out of the Tab order while Arrow keys and Enter select", async () => {
		render(<TagDialog />);
		const field = screen.getByRole("combobox");
		fireEvent.focus(field);
		const option = await screen.findByRole("option", { name: "food" });
		expect((option as HTMLButtonElement).tabIndex).toBe(-1);
		fireEvent.keyDown(field, { key: "ArrowDown" });
		fireEvent.keyDown(field, { key: "Enter" });
		expect(screen.getByRole("button", { name: "Remove food" })).toBeTruthy();
	});
});
