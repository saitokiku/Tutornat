"use client";

import { usePathname, useRouter } from "next/navigation";
import { use, useEffect, type ReactNode } from "react";
import { browser } from "react-dom";
import { KaizenMark } from "@/components/brand";
import { Notice } from "@/components/ui";
import { useT } from "@/i18n";
import { currentLearner } from "@/lib/profiles";
import { storeHealth, useStore, type StoreState } from "@/lib/store";

/** Everything signed-in reads this browser's store, so it renders in the browser only. */
export function BrowserOnly({ children }: { children: ReactNode }) {
  use(browser("KaizenEDU keeps demo accounts and courses in this browser."));
  return children;
}

export type Need = "guest" | "account" | "learner" | "parent" | "selected";

function redirectFor(s: StoreState, need: Need, path: string): string | null {
  const signedIn = Boolean(s.accounts.find((a) => a.id === s.session.accountId));
  if (need === "guest") return signedIn ? "/profiles" : null;
  if (!signedIn) return `/sign-in?next=${encodeURIComponent(path)}`;
  const parent = s.session.profileId === "parent";
  const learner = currentLearner(s);
  if (need === "learner" && !learner) return parent ? "/family" : "/profiles";
  if (need === "parent" && !parent) return learner ? "/home" : "/profiles";
  if (need === "selected" && !learner && !parent) return "/profiles";
  return null;
}

/** Redirects when the session doesn't fit the page; renders nothing until it does. */
export function Guard({ need, children }: { need: Need; children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const target = useStore((s) => redirectFor(s, need, path));
  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);
  return target ? null : children;
}

/** Shown once if saved data couldn't be read or can't be written. */
export function StoreHealthNotice() {
  const t = useT();
  const health = storeHealth();
  if (health === "ok") return null;
  return <Notice tone="warn">{t(health === "reset" ? "demo.storeReset" : "demo.storeMemory")}</Notice>;
}

export function PageFallback() {
  return (
    <div aria-busy="true" className="grid min-h-dvh place-items-center bg-paper">
      <KaizenMark size={40} className="animate-pulse opacity-60" />
    </div>
  );
}
