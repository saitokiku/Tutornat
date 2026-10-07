import { resolveActs, type ResolvedAct } from "@/learning/outcomes";
import type { TeachingAct } from "@/learning/types";
import { newId, update, type StoreState } from "./store";

// Teaching acts: what we did to help and what it was meant to do. Outcomes are derived later from
// the evidence (learning/outcomes.ts), never written by the code that did the helping.

/**
 * What each kind of act carries. Outcomes read these fields, so an act logged differently stays pending.
 *
 * - hint · steps · similar (practice Runner), intent "next-try-right": `setId`, `skillId`, `ref` = the
 *   slot's index in set.slots as a string ("0", "1", …, the index recordAnswer gets); a hint's `detail`
 *   is the rung just shown, "1" | "2" | "3".
 * - tutor, intent "next-try-right", once: `ref` = the thread id, `skillId` when known. Beside a problem
 *   (the drawer) also `setId` and `detail` = String(item.seed), so the helped problem is skipped and the
 *   next one decides.
 * - set "skill-moves" · check "check-decides": `setId`, `skillId`. prep "test-goes-well": `ref` = event id.
 * - plan "plan-line-done", once: `ref` = "<date>:<plan item key>". lesson "lesson-checks-pass", once:
 *   `ref` = "<courseId>/<lessonId>", before the first quiz answer. course "course-finished": `ref` = course id.
 * - nudge "parent-acts", once: `ref` = nudgeKey(kind, id) from learning/outcomes, `detail` = the kind.
 */
export type ActInput = Omit<TeachingAct, "id" | "at" | "outcome" | "resolvedAt">;

/**
 * Records a teaching act. With `once`, an act with the same profile, kind and ref on the same
 * calendar day (local) is recorded only once — for things shown repeatedly, like plan lines and nudges.
 */
export function logAct(input: ActInput, opts: { once?: boolean; at?: number } = {}) {
  const at = opts.at ?? Date.now();
  const day = new Date(at).toDateString();
  update((s) => {
    if (opts.once && s.acts.some((a) => a.profileId === input.profileId && a.kind === input.kind && a.ref === input.ref && new Date(a.at).toDateString() === day)) return;
    s.acts.push({ id: newId(), at, ...input });
    // ponytail: keep the newest 5000 per device; the backend keeps everything.
    if (s.acts.length > 5000) s.acts.splice(0, s.acts.length - 5000);
  });
}

export const actsOf = (s: StoreState, profileId: string) => s.acts.filter((a) => a.profileId === profileId);

// The store hands out a new document on every write, so a one-entry cache by reference recomputes
// exactly when the record changed (or the hour turned, for windows that close with time).
let memo: { s: StoreState; profileId: string; hour: number; out: ResolvedAct[] } | null = null;

/** One learner's teaching acts with their outcomes (met / missed / pending), from the record. */
export function resolvedActsOf(s: StoreState, profileId: string, now: number): ResolvedAct[] {
  const hour = Math.floor(now / 3600_000);
  if (memo && memo.s === s && memo.profileId === profileId && memo.hour === hour) return memo.out;
  const out = resolveActs(actsOf(s, profileId), s, now);
  memo = { s, profileId, hour, out };
  return out;
}
