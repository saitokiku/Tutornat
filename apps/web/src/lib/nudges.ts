import { RULES } from "@/learning/engine";
import { getSkill } from "@/practice/skills";
import { daysBetween, localDate } from "@/planner/dates";
import { PLAN_RULES } from "@/planner/plan";
import type { SchoolEvent } from "@/planner/types";
import { logAct } from "./acts";
import { lastActive } from "./family";
import { statusesOf } from "./practice";
import { read, type StoreState } from "./store";

// Nudges: the few things worth a grown-up's attention, each with one action. Computed from the
// record, shown to grown-ups only (never to a child), and logged as a teaching act so the
// improvement loop can tell whether the suggested action happened.

const DAY = 864e5;

export const NUDGE_RULES = {
  /** An open check waiting at least this long (the mastery law's "no silent trap"). */
  checkWaitMs: RULES.overdueCheckMs,
  /**
   * A test or quiz from tomorrow to this many days away, with no prep set finished for it: the
   * planner's prep window. Not on the day of the test itself (decision, 2026-10-07): that day Today
   * lists the test as today's school work and offers no prep set, so the nudge would ask for
   * something the plan no longer offers.
   */
  prepDays: PLAN_RULES.prepDays,
  /** A stuck skill is worth a grown-up's attention while it is still being worked on: practiced within this long. */
  stuckRecentMs: 14 * DAY,
  /** Calendar days in a row with nothing done. */
  idleDays: 5,
};

/** prep: a test with skills to prep and no prep yet · unlinked: a test with no skills on the map, so nothing to prep. */
export type NudgeKind = "prep" | "unlinked" | "check" | "stuck" | "idle";

export type Nudge = {
  /**
   * Stable while the situation lasts, so a nudge seen on Monday and Tuesday is one nudge:
   * prep:<eventId> · unlinked:<eventId> · check:<skillId> · stuck:<skillId> · idle:<last active day, YYYY-MM-DD>.
   */
  key: string;
  kind: NudgeKind;
  /** prep/unlinked: days until the test · check: whole days the check has waited · idle: days with nothing done · stuck: 0. */
  days: number;
  skillId?: string;
  event?: SchoolEvent;
  /**
   * The one action. `handover`: give the device to the learner first, and the link lands where the
   * work is: Today for prep (its prep line) and for a fresh start, Practice for a check or a stuck skill.
   */
  action: { href: string; handover: boolean };
};

const ORDER: Record<NudgeKind, number> = { prep: 0, unlinked: 0, check: 1, stuck: 2, idle: 3 };
const TODAY = { href: "/home", handover: true };

/** What a grown-up should know about one learner right now, most time-bound first. */
export function nudgesFor(s: StoreState, profileId: string, now: number): Nudge[] {
  const profile = s.profiles.find((p) => p.id === profileId);
  if (!profile) return [];
  const today = localDate(now);
  const out: Nudge[] = [];

  // A test or quiz coming up, and no prep set finished for it. Prep needs a skill on the map (as the
  // planner's prep line does); without one, the grown-up can link skills on the item page.
  const prepped = new Set(s.sets.filter((x) => x.profileId === profileId && x.kind === "prep" && x.finishedAt).map((x) => x.eventId));
  for (const e of s.events) {
    if (e.profileId !== profileId || e.done || (e.kind !== "test" && e.kind !== "quiz") || prepped.has(e.id)) continue;
    const days = daysBetween(today, e.date);
    if (days < 1 || days > NUDGE_RULES.prepDays) continue;
    if (e.skillIds.some(getSkill)) out.push({ key: `prep:${e.id}`, kind: "prep", days, event: e, action: TODAY });
    else out.push({ key: `unlinked:${e.id}`, kind: "unlinked", days, event: e, action: { href: `/calendar/${e.id}`, handover: false } });
  }

  // A check that has been open too long, and skills the engine calls stuck that are still being
  // practiced. Both land on Practice in the skill's subject: it lists every open check, and
  // ?again= puts the stuck skill first (Today's plan holds at most two checks and the next skill on
  // the map, which may be neither).
  for (const st of Object.values(statusesOf(s, profileId, now))) {
    const skill = getSkill(st.skillId);
    if (!skill) continue;
    const open = st.state === "ready" || st.state === "checked" || st.state === "refresh";
    const waited = open && st.checkOpensAt !== undefined ? now - st.checkOpensAt : -1;
    if (waited >= NUDGE_RULES.checkWaitMs)
      out.push({ key: `check:${st.skillId}`, kind: "check", days: Math.floor(waited / DAY), skillId: st.skillId, action: { href: `/practice?subject=${skill.subject}`, handover: true } });
    if (st.stuck && st.lastPracticeAt !== undefined && now - st.lastPracticeAt <= NUDGE_RULES.stuckRecentMs)
      out.push({
        key: `stuck:${st.skillId}`,
        kind: "stuck",
        days: 0,
        skillId: st.skillId,
        action: { href: `/practice?subject=${skill.subject}&again=${encodeURIComponent(st.skillId)}`, handover: true },
      });
  }

  // Nothing done for a while (counting from when the learner was added, if never).
  const since = localDate(lastActive(s, profileId, now) ?? profile.createdAt);
  const idle = daysBetween(since, today);
  if (idle >= NUDGE_RULES.idleDays) out.push({ key: `idle:${since}`, kind: "idle", days: idle, action: TODAY });

  const timeBound = (k: NudgeKind) => k === "prep" || k === "unlinked";
  return out.sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || (timeBound(a.kind) ? a.days - b.days : b.days - a.days) || a.key.localeCompare(b.key));
}

/**
 * Records that a grown-up was shown these nudges: one teaching act per nudge per day. The outcome
 * (did the suggested action happen?) is resolved later from the evidence, never here. Nudges already
 * recorded today are skipped before anything is written, so showing the page again writes nothing.
 */
export function logNudges(profileId: string, nudges: Nudge[], at = Date.now()) {
  const s = read();
  if (s.session.profileId !== "parent") return;
  const day = new Date(at).toDateString();
  const seen = new Set(s.acts.filter((a) => a.profileId === profileId && a.kind === "nudge" && new Date(a.at).toDateString() === day).map((a) => a.ref));
  for (const n of nudges)
    if (!seen.has(n.key)) logAct({ profileId, kind: "nudge", intent: "parent-acts", ref: n.key, detail: n.kind, ...(n.skillId ? { skillId: n.skillId } : {}) }, { once: true, at });
}
