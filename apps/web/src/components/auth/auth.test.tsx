import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SyncState } from "@/lib/sync";
import { DataNote } from "./DataNote";
import { SyncStatus } from "./SyncStatus";

const sync = vi.hoisted(() => ({ state: null as SyncState | null }));
vi.mock("@/lib/auth", () => ({ useSyncState: () => sync.state }));

describe("SyncStatus", () => {
  it("says nothing in the browser-only version", () => {
    sync.state = null;
    const { container } = render(<SyncStatus />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    [{ phase: "idle", pending: 0 }, "Saved to your account"],
    [{ phase: "idle", pending: 2 }, "Saving…"],
    [{ phase: "syncing", pending: 0 }, "Saving…"],
    [{ phase: "offline", pending: 0 }, "Offline. Changes stay on this device and save when you're back online."],
    [{ phase: "offline", pending: 1 }, "Offline. 1 change waits on this device and saves when you're back online."],
    [{ phase: "offline", pending: 3 }, "Offline. 3 changes wait on this device and save when you're back online."],
    [{ phase: "error", pending: 3 }, "Couldn't save just now. Trying again shortly."],
  ] as [SyncState, string][])("%o reads “%s”", (state, text) => {
    sync.state = state;
    render(<SyncStatus />);
    expect(screen.getByRole("status")).toHaveTextContent(text);
  });
});

describe("DataNote", () => {
  it("keeps the browser-only line when there is no account on a server", () => {
    sync.state = null;
    render(<DataNote />);
    expect(screen.getByText("In this demo, accounts, learners and courses are saved in this browser only.")).toBeInTheDocument();
  });

  it("says the account keeps everything and that deleting here only clears this device", () => {
    sync.state = { phase: "idle", pending: 0 };
    render(<DataNote />);
    expect(screen.getByText(/your account keeps everything/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Saved to your account");
  });
});
