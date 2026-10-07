import type { Locale } from "./types";

const tag = (l: Locale) => (l === "es" ? "es-US" : "en-US");

export const dayLabel = (at: number, l: Locale) =>
  new Intl.DateTimeFormat(tag(l), { weekday: "long", month: "short", day: "numeric" }).format(at);

export const shortDate = (at: number, l: Locale) => new Intl.DateTimeFormat(tag(l), { month: "short", day: "numeric" }).format(at);

export const timeLabel = (at: number, l: Locale) => new Intl.DateTimeFormat(tag(l), { hour: "numeric", minute: "2-digit" }).format(at);

/** "today", "yesterday", "3 days ago" — whole calendar days. */
export function relativeDay(at: number, now: number, l: Locale) {
  const day = (t: number) => Math.floor(new Date(t).setHours(0, 0, 0, 0) / 864e5);
  const diff = day(at) - day(now);
  return new Intl.RelativeTimeFormat(tag(l), { numeric: "auto" }).format(diff, "day");
}
