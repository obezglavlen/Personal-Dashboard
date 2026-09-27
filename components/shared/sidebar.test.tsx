// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";

const { route } = vi.hoisted(() => ({ route: { pathname: "/" } }));
vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("swr", () => ({ default: () => ({ data: undefined }) }));

let desktop = false;
const mediaListeners = new Set<(event: MediaQueryListEvent) => void>();
beforeEach(() => {
  desktop = false;
  route.pathname = "/";
  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
    media: query,
    get matches() { return desktop; },
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => mediaListeners.add(listener),
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => mediaListeners.delete(listener),
  })));
});
afterEach(() => { cleanup(); mediaListeners.clear(); vi.unstubAllGlobals(); });

describe("mobile navigation modal", () => {
  it("does not expose the closed drawer or its controls to keyboard and assistive technology", () => {
    render(<AppShell headerRight={null}><button type="button">Page action</button></AppShell>);
    expect(screen.queryByRole("dialog", { name: "Navigation" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Close navigation" })).toBeNull();
  });

  it("exposes the open drawer as a modal dialog", async () => {
    render(<AppShell headerRight={null}><button type="button">Page action</button></AppShell>);
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect((await screen.findByRole("dialog", { name: "Navigation" })).getAttribute("aria-modal")).toBe("true");
  });

  it("restores keyboard focus to the opener after Escape dismisses the drawer", async () => {
    render(<AppShell headerRight={null}><button type="button">Page action</button></AppShell>);
    const opener = screen.getByRole("button", { name: "Open navigation" });
    opener.focus();
    fireEvent.click(opener);
    const dialog = await screen.findByRole("dialog", { name: "Navigation" });
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Navigation" })).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("traps focus inside the open drawer instead of returning to page content", async () => {
    render(<AppShell headerRight={null}><button type="button">Page action</button></AppShell>);
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    const dialog = await screen.findByRole("dialog", { name: "Navigation" });
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    screen.getByRole("button", { name: "Page action", hidden: true }).focus();
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("dismisses on outside pointer press and restores the opener", async () => {
    render(<AppShell headerRight={null}><button type="button">Page action</button></AppShell>);
    const opener = screen.getByRole("button", { name: "Open navigation" });
    opener.focus();
    fireEvent.click(opener);
    const dialog = await screen.findByRole("dialog", { name: "Navigation" });
    // Radix installs its document-level outside listener after the opening click.
    await new Promise((resolve) => setTimeout(resolve, 0));
    const overlay = dialog.previousElementSibling!;
    fireEvent.pointerDown(overlay, { pointerType: "mouse", button: 0 });
    fireEvent.pointerUp(overlay, { pointerType: "mouse", button: 0 });
    fireEvent.click(overlay);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Navigation" })).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("closes on route change while retaining the real navigation links", async () => {
    const shell = <AppShell headerRight={null}><button type="button">Page action</button></AppShell>;
    const { rerender } = render(shell);
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    const dialog = await screen.findByRole("dialog", { name: "Navigation" });
    expect(dialog.querySelector('a[href="/notes"]')).not.toBeNull();
    route.pathname = "/notes";
    rerender(<AppShell headerRight={null}><button type="button">Page action</button></AppShell>);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Navigation" })).toBeNull());
  });

  it("releases the modal focus trap when a mobile viewport changes to desktop", async () => {
    render(<AppShell headerRight={null}><button type="button">Page action</button></AppShell>);
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(await screen.findByRole("dialog", { name: "Navigation" })).toBeTruthy();
    act(() => {
      desktop = true;
      for (const listener of mediaListeners) listener({ matches: true } as MediaQueryListEvent);
    });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Navigation" })).toBeNull());
    const pageAction = screen.getByRole("button", { name: "Page action" });
    pageAction.focus();
    expect(document.activeElement).toBe(pageAction);
  });
});
