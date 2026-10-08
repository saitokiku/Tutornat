import { assistanceFrom, attemptIdentity, firstResponseOf } from "@/learning/evidence";
import type { AttemptContext, AttemptSource, HelpExposure, ResponseEvent } from "@/learning/types";
import { appendEvidence, EvidenceError, read, type EvidenceRow, type StoreState } from "./store";

// One question's evidence, as screens record it: help before it shows, a first miss before its
// feedback. Final answers are recorded by practice.ts (recordAnswer) and Stage (lesson answers).
// Backend-shaped: with T04 these become server calls that hand back grant-bound ids.

/** A question as it stands: its id, and the help and first miss saved for it. Reads only. */
export function attemptFor(source: AttemptSource, s: StoreState = read()): AttemptContext {
  const id = attemptIdentity(source);
  const help = s.helpExposures.filter((h) => h.attemptId === id);
  return { id, source, help, firstResponse: firstResponseOf(id, s.responseEvents), assistance: assistanceFrom(id, help, s.responseEvents) };
}

export const assistanceFor = (attemptId: string, s: StoreState = read()) => assistanceFrom(attemptId, s.helpExposures, s.responseEvents);

/** The question's source, written once, with the first row that points at it. `openedAt` is when that was. */
const contextRow = (source: AttemptSource, id: string): EvidenceRow => ({ list: "attemptContexts", record: { ...source, id, openedAt: Date.now() } });

/**
 * Help shown on a question, saved before it shows. Its id is the question's id and the kind of help
 * (`key` tells a second hint from the first), so saving it again (a reload, another tab, a second
 * tutor reply) writes nothing. `extra` rows go in the same write.
 */
export function recordHelp(source: AttemptSource, input: { kind: HelpExposure["kind"]; key?: string; detail?: string; delivery?: HelpExposure["delivery"] }, extra: EvidenceRow[] = []): HelpExposure {
  const attemptId = attemptIdentity(source);
  const help: HelpExposure = {
    id: `${attemptId}:${input.kind}${input.key ? `:${input.key}` : ""}`,
    attemptId,
    profileId: source.profileId,
    skillId: source.skillId,
    kind: input.kind,
    ...(input.detail ? { detail: input.detail } : {}),
    capturedAt: Date.now(),
    delivery: input.delivery ?? "released",
  };
  appendEvidence([contextRow(source, attemptId), { list: "helpExposures", record: help }, ...extra]);
  return read().helpExposures.find((h) => h.id === help.id) ?? help;
}

/** A first answer that missed, saved before its feedback shows. A later miss on the question adds nothing. */
export function recordFirstMiss(source: AttemptSource, input: { response: string; choice?: number }): ResponseEvent {
  const a = attemptFor(source);
  if (a.firstResponse) return a.firstResponse;
  const miss: ResponseEvent = {
    id: `${a.id}:first`,
    attemptId: a.id,
    profileId: source.profileId,
    skillId: source.skillId,
    capturedAt: Date.now(),
    response: input.response.slice(0, 80),
    ...(input.choice !== undefined ? { choice: input.choice } : {}),
    correct: false,
    assisted: a.assistance.assisted,
  };
  appendEvidence([contextRow(source, a.id), { list: "responseEvents", record: miss }]);
  return read().responseEvents.find((r) => r.id === miss.id) ?? miss;
}

/**
 * What went wrong saving evidence, for the screen to say: "storage" (this device can't keep it) or
 * "stale" (another tab changed it: read it again). Anything else is a bug and is thrown on.
 */
export function evidenceProblem(e: unknown): "storage" | "stale" {
  if (e instanceof EvidenceError) return e.reason;
  if (e instanceof DOMException) return "storage";
  throw e;
}
