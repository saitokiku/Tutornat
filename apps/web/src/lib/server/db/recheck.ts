import type { Attempt, PracticeSet } from "@/learning/types";
import type { Locale } from "@/lib/types";
import { check } from "@/practice/answer";
import { getSkill, makeItem } from "@/practice/skills";
import type { Item } from "@/practice/types";
import type { Verdict } from "./schema";

// The server's own check of an answer before it enters the record. An item is a pure function of
// (skill, level, seed, locale), so the server rebuilds exactly the problem the learner saw and runs
// the same checker (practice/answer.ts). A "right" the checker does not accept is stored as wrong
// and flagged; the browser cannot talk its way into a proved skill.

export type CheckedAttempt = Pick<Attempt, "skillId" | "level" | "seed" | "mode" | "correct" | "response" | "setId">;
export type SetContext = Pick<PracticeSet, "kind" | "slots"> | null;

/** What the learner's response was, in the checker's terms. Choice answers are recorded by label. */
function accepted(item: Item, response: string): boolean {
  if (item.answer.kind === "choice") {
    const choices = item.choices ?? [];
    // recordAnswer keeps the first 80 characters of a response.
    let index = choices.findIndex((c) => c.label === response || c.label.slice(0, 80) === response);
    if (index < 0 && /^\d+$/.test(response) && Number(response) < choices.length) index = Number(response);
    return index >= 0 && check(item.answer, index).correct;
  }
  return check(item.answer, response).correct;
}

/**
 * `locales`: the learner's language first; the other is tried too, since a grown-up may have
 * switched it since the answer was given (choice labels depend on it).
 */
export function recheck(a: CheckedAttempt, ctx: { locales: Locale[]; set: SetContext }): { correct: boolean; verdict: Verdict } {
  if (!a.correct) return { correct: false, verdict: "wrong" };
  const forged = { correct: false, verdict: "forged" as const };
  // Help from the tutor is recorded as not-right by design; a "right" one did not come from the app.
  if (a.mode === "tutor") return forged;
  const skill = getSkill(a.skillId);
  // Open-topic sets (AI-written questions, "ai:" skills) are not on the skill map and never prove anything.
  if (!skill) return a.skillId.startsWith("ai:") && a.mode !== "check" ? { correct: true, verdict: "unchecked" } : forged;
  // A check answer comes from a check set, and every answer in a set is for one of its problems.
  if (a.mode === "check" && ctx.set?.kind !== "check") return forged;
  if (ctx.set && !ctx.set.slots.some((s) => s.skillId === a.skillId && s.seed === a.seed)) return forged;
  if (!a.response?.trim()) return forged;
  for (const locale of ctx.locales) {
    try {
      if (accepted(makeItem(a.skillId, a.level, a.seed, locale), a.response)) return { correct: true, verdict: "verified" };
    } catch {
      return forged;
    }
  }
  return forged;
}
