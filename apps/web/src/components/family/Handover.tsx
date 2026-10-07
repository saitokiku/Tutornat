"use client";

import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";
import { selectLearner } from "@/lib/profiles";

// Handing the device to a child from a grown-up page. The link switches the session to the child
// and navigates; the page's grown-ups-only Guard would see the child's session first and send them to
// Today, overriding a link to Practice. Inside a HandoverScope the page steps aside while the
// navigation runs, so the link lands where it says.

const Leave = createContext<(() => void) | null>(null);

/** Put this outside a grown-up page's Guard when the page has hand-over links. */
export function HandoverScope({ children }: { children: ReactNode }) {
  const [leaving, setLeaving] = useState(false);
  // Next keeps a visited page alive but hidden (Activity); when the grown-up comes back, it shows again.
  useLayoutEffect(() => () => setLeaving(false), []);
  return <Leave.Provider value={() => setLeaving(true)}>{leaving ? null : children}</Leave.Provider>;
}

/** The `onNavigate` for a link that hands the device to this child. */
export function useHandover(childId: string) {
  const leave = useContext(Leave);
  return () => {
    leave?.();
    selectLearner(childId);
  };
}
