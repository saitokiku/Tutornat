import { t, type Key } from "@/i18n";
import type { SkillStatus } from "@/learning/engine";
import { dayLabel, relativeDay, shortDate } from "@/lib/format";
import type { Locale } from "@/lib/types";
import { getSkill } from "@/practice/skills";

const DAY = 864e5;

/** "today", "tomorrow" or the weekday for near dates; a short date further out. */
export function whenLabel(at: number, now: number, locale: Locale) {
  const days = Math.round((new Date(at).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / DAY);
  if (days <= 1 && days >= -1) return relativeDay(at, now, locale);
  if (days > 1 && days < 7) return dayLabel(at, locale).split(",")[0];
  return shortDate(at, locale);
}

/** One honest line about where a skill stands. */
export function statusLine(s: SkillStatus | undefined, now: number, locale: Locale): string {
  const skill = s ? getSkill(s.skillId) : undefined;
  if (!s || s.state === "new") return t(locale, "status.new");
  switch (s.state) {
    case "practicing":
      return skill && skill.levels > 1 ? t(locale, "status.practicingLevel", { n: s.level, total: skill.levels }) : t(locale, "status.practicing");
    case "ready":
      return (s.checkOpensAt ?? 0) <= now ? t(locale, "status.checkReady") : t(locale, "status.checkOpens", { when: whenLabel(s.checkOpensAt!, now, locale) });
    case "checked":
      return (s.checkOpensAt ?? 0) <= now ? t(locale, "status.secondReady") : t(locale, "status.secondOpens", { when: whenLabel(s.checkOpensAt!, now, locale) });
    case "proved":
      return (s.reviewDueAt ?? Infinity) <= now
        ? t(locale, "status.provedReview", { when: shortDate(s.provedAt!, locale) })
        : t(locale, "status.proved", { when: shortDate(s.provedAt!, locale) });
    case "refresh":
      return t(locale, "status.refresh");
  }
}

export const STATUS_DOT: Record<SkillStatus["state"], string> = {
  new: "bg-panel ring-1 ring-border",
  practicing: "bg-warn/60",
  ready: "bg-panel ring-2 ring-accent",
  checked: "bg-accent/50",
  proved: "bg-good",
  refresh: "bg-panel ring-2 ring-warn",
};

export const checkOpen = (s?: SkillStatus, now = Date.now()) =>
  !!s && (s.state === "ready" || s.state === "checked" || s.state === "refresh") && (s.checkOpensAt ?? 0) <= now;

export type { Key };
