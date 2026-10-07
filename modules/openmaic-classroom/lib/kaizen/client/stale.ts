/**
 * Supersede-the-previous-call gate.
 *
 * Every Kaizen surface that loads on a changing key (learner profile, goal,
 * course id) needs the same thing: when the key changes mid-flight, the older
 * request's result must not land. `ClassroomSurface` solves this inline with a
 * pair of refs; this is the same rule factored out so the catalogue, the
 * learner page and the course request all reject stale results identically
 * instead of each one remembering to.
 *
 * Not an AbortController replacement — abort stops the fetch, this stops the
 * *write*. Use both: abort what supports it, gate what lands.
 */
export interface LatestGate {
  /** Claim the gate. Returns a predicate that is true only while this claim is the newest. */
  begin(): () => boolean;
  /** Invalidate every outstanding claim (unmount, or an explicit cancel). */
  cancelAll(): void;
}

export function createLatestGate(): LatestGate {
  let epoch = 0;
  return {
    begin() {
      const mine = ++epoch;
      return () => mine === epoch;
    },
    cancelAll() {
      epoch++;
    },
  };
}
