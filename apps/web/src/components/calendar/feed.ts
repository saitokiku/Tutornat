import type { Key } from "@/i18n";
import type { FeedErrorCode, RefreshResult } from "@/lib/week";

/** What to tell a family when a class calendar link can't be read. */
export const FEED_ERROR: Record<FeedErrorCode, Key> = {
  url: "import.badUrl",
  blocked: "import.blocked",
  format: "import.notCalendar",
  status: "import.fetchFailed",
  size: "cal.feedTooBig",
  timeout: "cal.feedSlow",
  rate: "cal.feedRate",
  network: "cal.offline",
};

/** One class's refresh, in words: what changed, what is new to review, what the school took off — or why it couldn't. */
export function refreshText(r: RefreshResult, t: (key: Key, vars?: Record<string, string | number>) => string): string {
  if (!r.ok) return t(FEED_ERROR[r.error]);
  const parts: string[] = [];
  if (r.updated) parts.push(t("cal.refreshChanged", { n: r.updated }));
  if (r.fresh.length) parts.push(t("cal.refreshNew", { n: r.fresh.length }));
  if (r.gone.length) parts.push(t("cal.refreshGone", { n: r.gone.length, titles: r.gone.join(", ") }));
  return parts.length ? parts.join(" ") : t("cal.refreshedSame");
}
