import type { AssistanceState, AttemptSource, EvidenceSource, HelpExposure, ResponseEvent } from "./types";

export function evidenceSource(source: AttemptSource): EvidenceSource {
  if (source.kind === "set-slot") { const { kind, ...facts } = source; return { ...facts, sourceKind: kind }; }
  const { kind, ...facts } = source;
  return { ...facts, sourceKind: kind };
}

/** Collision-free local identity. Grant-bound server IDs replace local identities in T04. */
export function attemptIdentity(s: AttemptSource): string {
  return `attempt:${JSON.stringify([
    s.profileId, s.kind,
    ...(s.kind === "set-slot" ? [s.setId, s.slotId] : [s.courseId, s.sceneId, s.questionId]),
    s.skillId, s.itemFingerprint, s.contentVersion, s.grantId ?? null,
  ])}`;
}

export function firstResponseOf(attemptId: string, responses: readonly ResponseEvent[]): ResponseEvent | undefined {
  return responses.filter((r) => r.attemptId === attemptId).sort((a, b) => a.capturedAt - b.capturedAt || a.id.localeCompare(b.id))[0];
}

/** Any missed candidate is conservative help, including concurrent submissions from separate tabs. */
export function assistanceFrom(attemptId: string, help: readonly HelpExposure[], responses: readonly ResponseEvent[]): AssistanceState {
  const mine = help.filter((h) => h.attemptId === attemptId);
  const times = [...mine.map((h) => h.receivedAt ?? h.capturedAt), ...responses.filter((r) => r.attemptId === attemptId && !r.correct).map((r) => r.receivedAt ?? r.capturedAt)];
  return { assisted: times.length > 0, exposureIds: [...new Set(mine.map((h) => h.id))].sort(), ...(times.length ? { lastHelpAt: Math.max(...times) } : {}) };
}
