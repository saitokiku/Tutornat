import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SyncState } from "@/lib/sync";
import { DataNote } from "./DataNote";
import { SyncStatus } from "./SyncStatus";

const sync = vi.hoisted(() => ({ state: null as SyncState | null, listeners: new Set<() => void>() }));
vi.mock("@/lib/auth", async () => {
  const { useSyncExternalStore } = await import("react");
  return {
    useSyncState: () =>
      useSyncExternalStore(
        (fn) => (sync.listeners.add(fn), () => void sync.listeners.delete(fn)),
        () => sync.state,
      ),
  };
});
const set = (s: Partial<SyncState> | null) =>
  act(() => {
    sync.state = s && { phase: "idle", pending: 0, refused: 0, storage: false, firstSync: false, ...s };
    sync.listeners.forEach((fn) => fn());
  });

describe("SyncStatus", () => {
  it("says nothing in the browser-only version", () => {
    set(null);
    const { container } = render(<SyncStatus />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    [{}, "Saved to your account"],
    [{ pending: 2 }, "Saving…"],
    // A round that only pulls is not "saving".
    [{ phase: "syncing" }, "Saved to your account"],
    [{ phase: "offline" }, "Offline. Changes stay on this device and save when you're back online."],
    [{ phase: "offline", pending: 1 }, "Offline. 1 change waits on this device and saves when you're back online."],
    [{ phase: "offline", pending: 3 }, "Offline. 3 changes wait on this device and save when you're back online."],
    [{ phase: "error", pending: 3 }, "Couldn't save just now. Trying again shortly."],
    [{ refused: 1 }, "1 change couldn't be saved to your account. It stays on this device."],
    [{ refused: 2, pending: 1 }, "2 changes couldn't be saved to your account. They stay on this device."],
    [{ storage: true }, "This device is out of space, so changes aren't kept here. While you're online they still save to your account."],
  ] as [Partial<SyncState>, string][])("%o reads “%s”", (state, text) => {
    set(state);
    render(<SyncStatus />);
    // A problem is in the visible line and in the live region (the line then hidden from screen readers).
    expect(screen.getAllByText(text)[0]).toBeVisible();
  });

  it("announces only problems and the recovery, never each save", () => {
    set({});
    render(<SyncStatus />);
    const live = screen.getByRole("status");
    expect(live).toBeEmptyDOMElement();
    set({ pending: 1 });
    set({ phase: "syncing" });
    set({});
    // Saving and saved again: nothing was said.
    expect(live).toBeEmptyDOMElement();
    set({ phase: "offline", pending: 2 });
    expect(live).toHaveTextContent("Offline. 2 changes wait on this device");
    // Back online and still sending: nothing yet; then once, when all is saved.
    set({ pending: 2, phase: "syncing" });
    expect(live).toBeEmptyDOMElement();
    set({});
    expect(live).toHaveTextContent("Saved to your account");
    // The next ordinary save clears it without a word.
    set({ pending: 1 });
    expect(live).toBeEmptyDOMElement();
  });
});

describe("DataNote", () => {
  it("keeps the browser-only line when there is no account on a server", () => {
    set(null);
    render(<DataNote />);
    expect(screen.getByText("In this demo, accounts, learners and courses are saved in this browser only.")).toBeInTheDocument();
  });

  it("says the account keeps everything and that deleting here only clears this device", () => {
    set({});
    render(<DataNote />);
    expect(screen.getByText(/your account keeps everything/)).toBeInTheDocument();
    expect(screen.getByText("Saved to your account")).toBeVisible();
    expect(screen.queryByText(/haven't reached your account/)).toBeNull();
  });

  it("warns before deleting while this device holds changes the account doesn't have", () => {
    set({ phase: "offline", pending: 2, refused: 1 });
    render(<DataNote />);
    expect(screen.getByText("3 changes on this device haven't reached your account yet. Deleting now loses them.")).toBeInTheDocument();
  });
});
