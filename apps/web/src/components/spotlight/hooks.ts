"use client";

import { useSyncExternalStore } from "react";
import { currentSpot, subscribeSpot, type Spotlight } from "@/lib/spotlight";

/** What the tutor is pointing at now (lib/spotlight's store), or null. */
export const useSpotlight = (): Spotlight | null => useSyncExternalStore(subscribeSpot, currentSpot, () => null);

// Media queries as external stores: read during render without effects, updated on change.

function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (fn) => {
      const m = typeof window.matchMedia === "function" ? window.matchMedia(query) : null;
      m?.addEventListener?.("change", fn);
      return () => m?.removeEventListener?.("change", fn);
    },
    () => (typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false),
    () => false,
  );
}

export const useReducedMotion = () => useMedia("(prefers-reduced-motion: reduce)");
/** Below Tailwind's sm: the callout docks as a bar instead of floating beside the target. */
export const usePhone = () => useMedia("(max-width: 639.98px)");

const noop = () => () => {};
/** True in the browser after hydration, false on the server and while hydrating. */
export const useClient = () => useSyncExternalStore(noop, () => true, () => false);
