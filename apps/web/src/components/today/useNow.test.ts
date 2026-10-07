import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { localDate } from "@/planner/dates";
import { useNow } from "./useNow";

// Today's clock: a page left open overnight must not keep showing yesterday.

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-07T21:00:00"));
});
afterEach(() => vi.useRealTimers());

describe("useNow", () => {
  it("moves on to the new day at local midnight while the page stays open", () => {
    const { result } = renderHook(() => useNow());
    expect(localDate(result.current)).toBe("2026-10-07");
    act(() => void vi.advanceTimersByTime(2 * 3600_000));
    expect(localDate(result.current)).toBe("2026-10-07");
    act(() => void vi.advanceTimersByTime(3600_000 + 1000));
    expect(localDate(result.current)).toBe("2026-10-08");
  });

  it("catches up when the page is looked at again after the device slept", () => {
    const { result } = renderHook(() => useNow());
    // A sleeping tablet runs no timers: the clock jumps to the morning without one firing.
    vi.setSystemTime(new Date("2026-10-08T07:30:00"));
    expect(localDate(result.current)).toBe("2026-10-07");
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    expect(localDate(result.current)).toBe("2026-10-08");
  });

  it("stops listening when Today closes", () => {
    const { result, unmount } = renderHook(() => useNow());
    const before = result.current;
    unmount();
    vi.setSystemTime(new Date("2026-10-08T07:30:00"));
    window.dispatchEvent(new Event("focus"));
    expect(vi.getTimerCount()).toBe(0);
    expect(result.current).toBe(before);
  });
});
