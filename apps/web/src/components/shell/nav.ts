// The shell's places, in rail order, and which one a path belongs to. Pure, so it is tested on its own.
import type { Key } from "@/i18n/en";

export type Place = "home" | "practice" | "talk" | "learn" | "calendar" | "growth" | "family" | "me" | "settings";
export type Tab = { place: Place; href: string; label: Key };

export const LEARNER_TABS: Tab[] = [
  { place: "home", href: "/home", label: "nav.home" },
  { place: "practice", href: "/practice", label: "nav.practice" },
  { place: "talk", href: "/talk", label: "nav.talk" },
  { place: "learn", href: "/courses", label: "nav.learn" },
  { place: "calendar", href: "/calendar", label: "nav.calendar" },
  { place: "growth", href: "/growth", label: "nav.growth" },
];
export const PARENT_TABS: Tab[] = [
  { place: "family", href: "/family", label: "nav.family" },
  { place: "calendar", href: "/calendar", label: "nav.calendar" },
  { place: "growth", href: "/growth", label: "nav.growth" },
];

/** Phones keep four places in the bar; the rest live behind Me (a learner) or are Settings (the grown-up). */
export function barTabs(learner: boolean): Tab[] {
  return learner
    ? [...LEARNER_TABS.slice(0, 4), { place: "me", href: "/me", label: "nav.me" }]
    : [...PARENT_TABS, { place: "settings", href: "/settings", label: "nav.settings" }];
}

const under = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

/** The place a path belongs to. On phones, Calendar, Growth and Settings count as Me for a learner. */
export function placeOf(path: string, tabs: Tab[]): Place | null {
  const hit = tabs.find((t) => under(path, t.href));
  if (hit) return hit.place;
  if (tabs.some((t) => t.place === "me") && ["/me", "/calendar", "/growth", "/settings"].some((h) => under(path, h))) return "me";
  return null;
}

/** "1"–"9" from the digit row or the keypad, whatever the keyboard layout prints on the key. */
export function digitOf(e: Pick<KeyboardEvent, "key" | "code">): number | null {
  const d = /^Digit([1-9])$/.exec(e.code)?.[1] ?? (/^[1-9]$/.test(e.key) ? e.key : null);
  return d ? Number(d) : null;
}
