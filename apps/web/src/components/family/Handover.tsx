"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import { selectLearner } from "@/lib/profiles";
import { useStore } from "@/lib/store";

// Handing the device to a child from a grown-up page. The link switches the session to the child
// and navigates; the page's grown-ups-only Guard would see the child's session first and send them to
// Today, overriding a link to Practice. The shell owns the handover boundary above its learner key:
// it survives switching learners, steps aside on the originating route, and clears on navigation.

const Leave = createContext<(() => void) | null>(null);

/** Keep above the shell's learner-keyed pages so navigation owns its lifetime, not a cached page. */
export function HandoverScope({ children }: { children: ReactNode }) {
  const path = usePathname();
  const parent = useStore((s) => s.session.profileId === "parent");
  const [from, setFrom] = useState<string | null>(null);
  const leaving = from === path && !parent;
  if (from !== null && (parent || from !== path)) setFrom(null);
  return <Leave.Provider value={() => setFrom(path)}>{leaving ? null : children}</Leave.Provider>;
}

/** The `onNavigate` for a link that hands the device to this child. */
export function useHandover(childId: string) {
  const leave = useContext(Leave);
  return () => {
    leave?.();
    selectLearner(childId);
  };
}
