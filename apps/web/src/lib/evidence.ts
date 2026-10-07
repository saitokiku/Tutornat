import { assistanceFrom, attemptIdentity, evidenceSource, firstResponseOf } from "@/learning/evidence";
import type { AttemptContext, AttemptSource, HelpExposure, ResponseEvent } from "@/learning/types";
import { appendEvidence, newId, read } from "./store";

export function assistanceFor(attemptId: string) {
  const s = read();
  return assistanceFrom(attemptId, s.helpExposures, s.responseEvents);
}

export function openOrResumeAttempt(source: AttemptSource): AttemptContext {
  const identity = appendEvidence("attemptContexts", { id: attemptIdentity(source), profileId: source.profileId, source, openedAt: Date.now() });
  const s = read();
  return { ...identity, help: s.helpExposures.filter((h) => h.attemptId === identity.id), firstResponse: firstResponseOf(identity.id, s.responseEvents), assistance: assistanceFor(identity.id) };
}

function sourceOf(attemptId: string) {
  const source = read().attemptContexts.find((a) => a.id === attemptId)?.source;
  if (!source) throw new Error("Unknown attempt");
  return source;
}

export function recordHelpExposure(input: { attemptId: string; id?: string; kind: HelpExposure["kind"]; detail?: string; capturedAt?: number; delivery?: HelpExposure["delivery"] }): HelpExposure {
  return appendEvidence("helpExposures", { ...evidenceSource(sourceOf(input.attemptId)), ...input, id: input.id ?? newId(), capturedAt: input.capturedAt ?? Date.now(), delivery: input.delivery ?? "released" });
}

export function recordFirstResponse(input: { attemptId: string; id?: string; response: string; correct: boolean; capturedAt?: number }): ResponseEvent {
  // Opening a fresh snapshot also discovers another tab's immutable response candidates.
  const source = sourceOf(input.attemptId);
  const a = openOrResumeAttempt(source);
  if (a.firstResponse) return a.firstResponse;
  return appendEvidence("responseEvents", { ...evidenceSource(source), ...input, id: input.id ?? newId(), response: input.response.slice(0, 80), capturedAt: input.capturedAt ?? Date.now(), assisted: a.assistance.assisted });
}
