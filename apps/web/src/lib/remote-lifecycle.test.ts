import { afterEach, describe, expect, it, vi } from "vitest";
import { cancelRemoteLearning, onRemoteCancel, watchCapability } from "./remote-lifecycle";

afterEach(() => vi.useRealTimers());
describe("active remote cancellation", () => {
  it("cancels registered microphone, speaker and request owners together", () => {
    const mic = vi.fn(), audio = vi.fn(), request = vi.fn();
    const off = [onRemoteCancel(mic), onRemoteCancel(audio), onRemoteCancel(request)];
    cancelRemoteLearning();
    expect(mic).toHaveBeenCalledOnce(); expect(audio).toHaveBeenCalledOnce(); expect(request).toHaveBeenCalledOnce();
    off.forEach((fn) => fn());
  });
  it("a revoked app lease cancels the active session; vendor termination is not implied", async () => {
    vi.useFakeTimers();
    const cancel = vi.fn(); const off = onRemoteCancel(cancel);
    const fetcher = vi.fn(async () => Response.json({ active: false, providerRevocation: "unsupported", connectionMaxSeconds: null }));
    const stop = watchCapability(fetcher, "grant-id");
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetcher).toHaveBeenCalledWith("/api/authority/capability?id=grant-id", expect.objectContaining({ cache: "no-store" }));
    expect(cancel).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(2000); expect(fetcher).toHaveBeenCalledOnce();
    stop(); off();
  });
  it("a network failure stops a remote lease rather than assuming it is still authorized", async () => {
    vi.useFakeTimers();
    const cancel = vi.fn(), off = onRemoteCancel(cancel);
    const stop = watchCapability(vi.fn(async () => { throw new Error("offline"); }), "grant-id");
    await vi.advanceTimersByTimeAsync(1000); expect(cancel).toHaveBeenCalledOnce();
    stop(); off();
  });
});
