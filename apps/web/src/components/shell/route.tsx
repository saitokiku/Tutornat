"use client";

// What every signed-in route shares: after a navigation, focus lands on the new page's title (so a
// screen reader starts there and the next Tab goes into the page, not back up the rail); each learner
// gets their own copy of the pages (nothing one child left open shows up for a sibling). Scroll on
// back/forward is the browser's own restoration, which Next's kept-alive routes already make exact.
import { usePathname } from "next/navigation";
import { Fragment, useEffect, type ReactNode } from "react";
import { useT } from "@/i18n";
import { currentLearner } from "@/lib/profiles";
import { useStore } from "@/lib/store";

const visible = (el: Element) => (typeof el.checkVisibility === "function" ? el.checkVisibility() : (el as HTMLElement).offsetParent !== null);

/** The path this document was loaded on (not the one a layout first mounted on: arriving from /profiles is a navigation). */
function loadedOn(): string | null {
  try {
    const entry = performance.getEntriesByType("navigation")[0];
    return entry ? new URL(entry.name).pathname : null;
  } catch {
    return null;
  }
}
let first: string | null | undefined;
let moved = false;

/** Moves focus to the page's h1 after a client navigation — never on first load, never away from
 *  something the page focused itself. Chrome that started the navigation is marked `data-k-chrome`. */
export function RouteFocus() {
  const path = usePathname();
  useEffect(() => {
    if (first === undefined) first = loadedOn() ?? path;
    if (path !== first) moved = true;
    if (!moved || window.location.hash) return;
    const frame = requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active && active !== document.body && visible(active) && !active.closest("[data-k-chrome]")) return;
      const title = [...document.querySelectorAll<HTMLElement>("main h1, h1")].find(visible) ?? document.querySelector<HTMLElement>("main");
      if (!title) return;
      if (!title.hasAttribute("tabindex")) title.setAttribute("tabindex", "-1");
      title.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [path]);
  return null;
}

/** Who the pages belong to: a learner's id, "parent", or "none". */
export const useScopeKey = () => useStore((s) => currentLearner(s)?.id ?? s.session.profileId ?? "none");

/** Keys its children by the current learner, so switching children starts every page fresh. */
export function LearnerScope({ children }: { children: ReactNode }) {
  const key = useScopeKey();
  return <Fragment key={key}>{children}</Fragment>;
}

/** The first stop for a keyboard: jumps past the rail to the page. Out of sight until focused. */
export function SkipLink({ to }: { to: string }) {
  const t = useT();
  return (
    <a
      href={`#${to}`}
      onClick={(e) => {
        e.preventDefault(); // focus without adding a #fragment entry to history
        document.getElementById(to)?.focus();
      }}
      className="k-btn-secondary fixed top-3 left-3 z-[70] -translate-y-[calc(100%+1rem)] opacity-0 shadow-lift transition-[translate,opacity] duration-(--duration-quick) ease-out-quart focus-visible:translate-y-0 focus-visible:opacity-100"
    >
      {t("shell.skip")}
    </a>
  );
}

/** The focus layout's frame: no rail, no bar — the page brings its own single way back. */
export function FocusFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <RouteFocus />
      <LearnerScope>{children}</LearnerScope>
    </>
  );
}
