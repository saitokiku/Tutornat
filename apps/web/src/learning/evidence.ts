import type { AssistanceState, AttemptSource, HelpExposure, ResponseEvent } from "./types";

// What one question's saved evidence says. Pure: the rows in, the answer out.

const B64URL = /[+/=]/g;
const SAFE: Record<string, string> = { "+": "-", "/": "_", "=": "" };

/** A 128-bit digest of `text` as 22 base64url characters (cyrb128: stable everywhere, not a secret). */
export function digest(text: string): string {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < text.length; i++) {
    const k = text.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  const bytes = [h1, h2, h3, h4].flatMap((h) => [h >>> 24, (h >>> 16) & 255, (h >>> 8) & 255, h & 255]);
  return btoa(String.fromCharCode(...bytes)).replace(B64URL, (c) => SAFE[c]);
}

/**
 * A question's id: "att_" and the digest of its whole source, so the same question (same learner, slot
 * or scene question, item and content version) always gets the same 26-character id, in any tab and
 * after any reload, and every row that points at it stays far under the server's id limit. Grant-bound
 * server ids replace local ones in T04.
 */
export function attemptIdentity(s: AttemptSource): string {
  return `att_${digest(JSON.stringify([
    s.profileId, s.kind,
    ...(s.kind === "set-slot" ? [s.setId, s.slotId] : [s.courseId, s.sceneId, s.questionId]),
    s.skillId, s.itemFingerprint, s.contentVersion, s.grantId ?? null,
  ]))}`;
}

export function firstResponseOf(attemptId: string, responses: readonly ResponseEvent[]): ResponseEvent | undefined {
  return responses.filter((r) => r.attemptId === attemptId).sort((a, b) => a.capturedAt - b.capturedAt || a.id.localeCompare(b.id))[0];
}

/**
 * Help this question had: any help shown, or a missed first answer (the answer after a miss is helped).
 * Any missed candidate counts, including concurrent submissions from separate tabs. `lastHelpAt` is the
 * last help shown; a miss is not help to the mastery law (engine.ts), only to this question's answer.
 */
export function assistanceFrom(attemptId: string, help: readonly HelpExposure[], responses: readonly ResponseEvent[]): AssistanceState {
  const mine = help.filter((h) => h.attemptId === attemptId);
  const missed = responses.some((r) => r.attemptId === attemptId && !r.correct);
  const times = mine.map((h) => h.receivedAt ?? h.capturedAt);
  return { assisted: missed || mine.length > 0, exposureIds: [...new Set(mine.map((h) => h.id))].sort(), ...(times.length ? { lastHelpAt: Math.max(...times) } : {}) };
}
