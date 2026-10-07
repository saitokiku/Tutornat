import { t } from "@/i18n";
import type { PracticeSet } from "@/learning/types";
import { startPlanItem, todayPlan } from "@/lib/plan";
import { nextSkillFor, startSet } from "@/lib/practice";
import type { StoreState } from "@/lib/store";
import type { Locale, Profile } from "@/lib/types";
import type { PlanItem } from "@/planner/plan";
import { getSkill } from "@/practice/skills";

// What a finished set offers next. Offered, never started: the finish is a clean stop, the child
// chooses. From Today it is the next undone line of today's plan (the child's own list); otherwise
// the next skill on the subject's map; after placement, the skill placement chose.

export type Offer = { kind: "plan"; item: PlanItem; date: string } | { kind: "skill"; skillId: string };

export function nextOffer(s: StoreState, learner: Profile, set: PracticeSet, now: number): Offer | null {
  if (set.kind === "placement") return getSkill(set.skillId) ? { kind: "skill", skillId: set.skillId } : null;
  if (set.planKey) {
    const plan = todayPlan(s, learner, now);
    const item = [...plan.lead, ...plan.more].find((i) => !i.done && i.kind !== "due" && `${plan.date}:${i.key}` !== set.planKey);
    return item ? { kind: "plan", item, date: plan.date } : null;
  }
  if (set.ai || !getSkill(set.skillId)) return null;
  const next = nextSkillFor(s, learner, set.subject, now);
  return next && next !== set.skillId ? { kind: "skill", skillId: next } : null;
}

/** What the offer is called, in the learner's words (the same names Today uses). */
export function offerTitle(offer: Offer, locale: Locale): string {
  const skill = (id?: string) => (id ? (getSkill(id)?.title[locale] ?? "") : "");
  if (offer.kind === "skill") return skill(offer.skillId);
  const item = offer.item;
  switch (item.kind) {
    case "check":
      return t(locale, "plan.check", { skill: skill(item.skillIds[0]) });
    case "prep":
      return t(locale, "plan.prep", { title: item.event?.title ?? "" });
    case "feedback":
      return t(locale, "plan.feedback", { skill: skill(item.skillIds[0]) });
    case "review":
      return t(locale, "plan.review", { n: item.skillIds.length });
    case "lesson":
      return item.lesson?.title ?? "";
    case "daily":
      return skill(item.skillIds[0]);
    case "due":
      return item.event?.title ?? "";
  }
}

/**
 * Starts what the learner chose and returns where to go: a practice set (keeping the way back to
 * Today when the set came from there) or a lesson. Null when there is nothing to start.
 */
export function startOffer(s: StoreState, learner: Profile, offer: Offer, fromToday: boolean, now: number): string | null {
  if (offer.kind === "plan" && offer.item.kind === "lesson" && offer.item.lesson) return `/learn/${offer.item.lesson.courseId}/${offer.item.lesson.lessonId}`;
  const id = offer.kind === "plan" ? startPlanItem(s, learner, offer.item, offer.date, now) : startSet(s, { profile: learner, kind: "pick", skillIds: [offer.skillId], now });
  return id ? `/practice/${id}${fromToday ? "?from=today" : ""}` : null;
}
