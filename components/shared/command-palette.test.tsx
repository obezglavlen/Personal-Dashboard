// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push }),
}));
vi.mock("swr", () => ({ default: () => ({ data: undefined }) }));

afterEach(() => { cleanup(); push.mockClear(); });

describe("command palette modal", () => {
  it("does not expose the closed palette input or dialog", () => {
    render(<AppShell headerRight={null}><button type="button">Page action</button></AppShell>);
    expect(screen.queryByRole("dialog", { name: "Command palette" })).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Search" })).toBeNull();
  });

  it("exposes the open palette as a modal dialog", async () => {
    render(<AppShell headerRight={null}><button type="button">Page action</button></AppShell>);
    fireEvent.click(screen.getByRole("button", { name: "Open command palette" }));
    expect((await screen.findByRole("dialog", { name: "Command palette" })).getAttribute("aria-modal")).toBe("true");
  });

  it("keeps focus inside the dialog while it is open", async () => {
    render(<AppShell headerRight={null}><button type="button">Page action</button></AppShell>);
    fireEvent.click(screen.getByRole("button", { name: "Open command palette" }));
    const dialog = screen.getByRole("dialog", { name: "Command palette" });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Search" })));
    screen.getByRole("button", { name: "Page action", hidden: true }).focus();
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("closes on Escape and restores the keyboard shortcut's previous focus", async () => {
    render(<AppShell headerRight={null}><button type="button">Page action</button></AppShell>);
    const pageAction = screen.getByRole("button", { name: "Page action" });
    pageAction.focus();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const input = await screen.findByRole("textbox", { name: "Search" });
    await waitFor(() => expect(document.activeElement).toBe(input));
    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Command palette" })).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(pageAction));
  });

  it("dismisses on an outside pointer click and restores the search button", async () => {
    render(<AppShell headerRight={null}><button type="button">Page action</button></AppShell>);
    const opener = screen.getByRole("button", { name: "Open command palette" });
    opener.focus();
    fireEvent.click(opener);
    const dialog = await screen.findByRole("dialog", { name: "Command palette" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const overlay = dialog.previousElementSibling!;
    fireEvent.pointerDown(overlay, { pointerType: "mouse", button: 0 });
    fireEvent.pointerUp(overlay, { pointerType: "mouse", button: 0 });
    fireEvent.click(overlay);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Command palette" })).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("still routes when a navigation result is selected", async () => {
    render(<AppShell headerRight={null}><button type="button">Page action</button></AppShell>);
    fireEvent.click(screen.getByRole("button", { name: "Open command palette" }));
    fireEvent.click(await screen.findByRole("button", { name: "Notes" }));
    expect(push).toHaveBeenCalledWith("/notes");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Command palette" })).toBeNull());
  });
});
