"use client";

import { useEffect, useState } from "react";

const HOUR = 3600_000;

/**
 * The time Today is drawn for. It moves on at local midnight, at least once an hour (checks open and
 * reviews fall due as time passes), and whenever the page comes back into view, so a tablet left on
 * Today overnight shows the new day's plan in the morning, not yesterday's.
 */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const midnight = new Date(now).setHours(24, 0, 0, 0);
    const timer = setTimeout(tick, Math.max(1000, Math.min(midnight - Date.now() + 50, HOUR)));
    const onShow = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", tick);
    window.addEventListener("pageshow", tick);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", tick);
      window.removeEventListener("pageshow", tick);
    };
  }, [now]);
  return now;
}
