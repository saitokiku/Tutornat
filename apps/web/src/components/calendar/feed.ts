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

/** One class's refresh, in words: what came in, or why it couldn't. */
export const refreshText = (r: RefreshResult, t: (key: Key, vars?: Record<string, string | number>) => string) =>
  !r.ok ? t(FEED_ERROR[r.error]) : r.added || r.updated ? t("cal.refreshed", { added: r.added, updated: r.updated }) : t("cal.refreshedSame");
