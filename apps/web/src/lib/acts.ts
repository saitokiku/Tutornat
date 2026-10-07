import type { TeachingAct } from "@/learning/types";
import { newId, update, type StoreState } from "./store";

// Teaching acts: what we did to help and what it was meant to do. Outcomes are derived later from
// the evidence (learning/outcomes.ts), never written by the code that did the helping.

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
