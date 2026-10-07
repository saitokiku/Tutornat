import {
  allStatuses,
  buildCheckSlots,
  buildMixedSlots,
  buildPracticeSlots,
  buildReviewSlots,
  defaultStart,
  nextSkill,
  placementNext,
  type Statuses,
} from "@/learning/engine";
import type { Standard } from "@/knowledge";
import type { AiQuestion, AttemptSource, Mode, PracticeSet, SetKind, Slot } from "@/learning/types";
import { logAct, type ActInput } from "./acts";
import { guessSubject } from "./generate";
import { randomSeed } from "@/practice/rng";
import { getSkill } from "@/practice/skills";
import { appendEvidence, newId, read, update, type StoreState } from "./store";
import { assistanceFor, openOrResumeAttempt } from "./evidence";
import type { Grade, LearnerSettings, Profile, Subject } from "./types";

// Practice actions screens call. Backend-shaped: when accounts move to a server, these bodies become
// API calls and the screens stay as they are.

const BAND_MINUTES: Record<string, number> = { K: 10, "1": 10, "2": 10, "3": 15, "4": 15, "5": 15 };

export function settingsOf(p: Pick<Profile, "grade" | "settings">): LearnerSettings {
  const young = ["K", "1", "2"].includes(p.grade);
  return {
    dailyMinutes: BAND_MINUTES[p.grade] ?? 20,
    subjects: ["math", "english"],
    timer: !young,
    voiceInput: false,
    ...p.settings,
  };
}

export function updateSettings(profileId: string, patch: Partial<LearnerSettings>) {
  update((s) => {
    const p = s.profiles.find((x) => x.id === profileId && x.accountId === s.session.accountId);
    if (p) p.settings = { ...p.settings, ...patch };
  });
}

export function setStart(profileId: string, subject: Subject, skillId: string) {
  update((s) => {
    const p = s.profiles.find((x) => x.id === profileId);
    if (p) p.start = { ...p.start, [subject]: skillId };
  });
}

export function setInterests(profileId: string, interests: string[]) {
  const clean = interests.map((i) => i.trim().slice(0, 40)).filter(Boolean).slice(0, 8);
  update((s) => {
    const p = s.profiles.find((x) => x.id === profileId && x.accountId === s.session.accountId);
    if (p) p.interests = clean;
  });
}

export const attemptsOf = (s: StoreState, profileId: string) => s.attempts.filter((a) => a.profileId === profileId);
export const setsOf = (s: StoreState, profileId: string) => s.sets.filter((x) => x.profileId === profileId);
export const getSet = (s: StoreState, setId: string, profileId: string) => s.sets.find((x) => x.id === setId && x.profileId === profileId);

// Memoized by reference: the store hands out a new attempts array on every write, so this recomputes
// exactly when evidence changed. ponytail: one-entry cache; enough for one learner on screen.
let memo: { state: StoreState; profileId: string; hour: number; out: Statuses } | null = null;
export function statusesOf(s: StoreState, profileId: string, now: number): Statuses {
  const hour = Math.floor(now / 3600_000);
  if (memo && memo.state === s && memo.profileId === profileId && memo.hour === hour) return memo.out;
  const out = allStatuses(attemptsOf(s, profileId), now, undefined, {
    help: s.helpExposures.filter((h) => h.profileId === profileId),
    responses: s.responseEvents.filter((r) => r.profileId === profileId),
  });
  memo = { state: s, profileId, hour, out };
  return out;
}

export const startOf = (p: Profile, subject: Subject) => p.start?.[subject] ?? defaultStart(subject, p.grade);

export function nextSkillFor(s: StoreState, p: Profile, subject: Subject, now: number) {
  return nextSkill(subject, statusesOf(s, p.id, now), startOf(p, subject));
}

/** Skills practiced in the last 14 days, most recent first — interleaved into new sets. */
export function recentSkills(s: StoreState, profileId: string, now: number, subject?: Subject) {
  const out: string[] = [];
  for (const a of [...attemptsOf(s, profileId)].sort((x, y) => y.at - x.at)) {
    if (now - a.at > 14 * 24 * 3600_000) break;
    if (!out.includes(a.skillId) && (!subject || getSkill(a.skillId)?.subject === subject)) out.push(a.skillId);
  }
  return out;
}

const MODE: Record<SetKind, Mode> = {
  daily: "practice",
  pick: "practice",
  review: "review",
  check: "check",
  placement: "placement",
  prep: "prep",
  feedback: "prep",
};

type StartOpts = {
  profile: Profile;
  kind: SetKind;
  /** The skill for daily/pick/check sets, or the skills for prep/feedback/review sets. */
  skillIds: string[];
  planKey?: string;
  eventId?: string;
  now: number;
};

/** Creates a set and returns its id. Reuses an unfinished set for the same plan line. */
export function startSet(state: StoreState, opts: StartOpts): string | null {
  const { profile, kind, skillIds, now } = opts;
  const first = skillIds.find((id) => getSkill(id));
  if (!first) return null;
  if (opts.planKey) {
    const open = state.sets.find((x) => x.profileId === profile.id && x.planKey === opts.planKey && !x.finishedAt);
    if (open) return open.id;
  }
  const statuses = statusesOf(state, profile.id, now);
  const seed = () => randomSeed();
  const grade: Grade = profile.grade;
  let slots: Slot[];
  if (kind === "placement") {
    const step = placementNext(getSkill(first)!.subject, grade, []);
    slots = "done" in step ? [] : [{ skillId: step.skillId, seed: seed(), role: "placement", level: getSkill(step.skillId)!.levels }];
  } else if (kind === "check") slots = buildCheckSlots(first, seed);
  else if (kind === "review") slots = buildReviewSlots(skillIds, statuses, seed);
  else if (kind === "prep" || kind === "feedback") slots = buildMixedSlots(skillIds, statuses, grade, seed);
  else slots = buildPracticeSlots({ skillId: first, grade, statuses, now, seed, recent: recentSkills(state, profile.id, now, getSkill(first)!.subject) });
  const set: PracticeSet = {
    id: newId(),
    profileId: profile.id,
    createdAt: now,
    kind,
    subject: getSkill(first)!.subject,
    skillId: first,
    slots,
    planKey: opts.planKey,
    eventId: opts.eventId,
  };
  update((s) => void s.sets.push(set));
  // A new set is a teaching act with an intent the improvement loop can test later. Placement only
  // measures, so it is not one.
  const act: Pick<ActInput, "kind" | "intent"> | null =
    kind === "check" ? { kind: "check", intent: "check-decides" } : kind === "prep" ? { kind: "prep", intent: "test-goes-well" } : kind === "placement" ? null : { kind: "set", intent: "skill-moves" };
  if (act) logAct({ profileId: profile.id, ...act, skillId: first, setId: set.id, ref: kind === "prep" ? opts.eventId : opts.planKey }, { at: now });
  return set.id;
}

/** Whole minutes for a pace sentence; anything under a minute reads as 1. */
export const wholeMinutes = (seconds: number) => Math.max(1, Math.round(seconds / 60));

/**
 * How a set's time compares with the standard time, in words: never a timer, never a score. Times
 * that show as the same whole minutes are "usual", so the sentence never contradicts its numbers.
 */
export type Pace = "quicker" | "usual" | "slower";
export function paceOf(seconds: number, standard: number): Pace {
  if (standard <= 0 || seconds <= 0 || wholeMinutes(seconds) === wholeMinutes(standard)) return "usual";
  const ratio = seconds / standard;
  return ratio < 0.75 ? "quicker" : ratio <= 1.35 ? "usual" : "slower";
}

export type AnswerRecord = { slot: number; level: number; correct: boolean; assisted: boolean; seconds: number; response?: string; why?: string; attemptId?: string };

export function practiceSource(set: PracticeSet, index: number, level: number): AttemptSource {
  const slot = set.slots[index];
  return { kind: "set-slot", profileId: set.profileId, skillId: slot.skillId, setId: set.id, slotId: String(index), itemFingerprint: `${slot.skillId}:${level}:${slot.seed}`, contentVersion: "legacy" };
}

/** Pin the difficulty when shown; an unfinished question does not change on reload. */
export function openPracticeAttempt(setId: string, index: number, level: number) {
  const set = read().sets.find((s) => s.id === setId);
  if (!set?.slots[index]) throw new Error("Unknown practice slot");
  if (set.slots[index].level === undefined) update((s) => { s.sets.find((x) => x.id === setId)!.slots[index].level ??= level; });
  const pinned = read().sets.find((s) => s.id === setId)!;
  return openOrResumeAttempt(practiceSource(pinned, index, pinned.slots[index].level!));
}

export function recordAnswer(setId: string, a: AnswerRecord) {
  const set = read().sets.find((x) => x.id === setId);
  if (!set || set.finishedAt || !set.slots[a.slot]) return;
  const context = openPracticeAttempt(setId, a.slot, a.level);
  if ((a.attemptId && a.attemptId !== context.id) || read().sets.find((s) => s.id === setId)!.slots[a.slot].level !== a.level) throw new Error("Stale practice attempt");
  const slot = set.slots[a.slot];
  const evidence = assistanceFor(context.id);
  // The current first miss is an independent wrong answer; a later correction is helped.
  const assisted = a.assisted || evidence.exposureIds.length > 0 || (a.correct && evidence.assisted);
  appendEvidence("attempts", {
    // Set slots are pinned above. Keep the final row compatible with the existing server ID limit.
    id: `${setId}:${a.slot}`, attemptId: context.id, profileId: set.profileId, at: Date.now(),
    skillId: slot.skillId, level: a.level, seed: slot.seed, setId, slotId: String(a.slot),
    mode: set.kind === "check" && assisted ? "practice" : slot.role === "review" ? "review" : MODE[set.kind],
    correct: a.correct, assisted, seconds: Math.min(Math.max(0, Math.round(a.seconds)), 3600),
    response: a.response?.slice(0, 80), why: a.correct ? undefined : a.why?.slice(0, 40),
    provenance: "local-recorded", contentVersion: context.source.contentVersion, itemFingerprint: context.source.itemFingerprint,
  });
  update((s) => {
    const live = s.sets.find((x) => x.id === setId);
    if (live) live.startedAt ??= Date.now();
  });
}

/** Help from the tutor on a skill outside a set still counts as help (it restarts the check clock). */
export function recordTutorHelp(profileId: string, skillId: string, seed: number, level: number) {
  if (!getSkill(skillId)) return;
  update((s) => void s.attempts.push({ id: newId(), profileId, at: Date.now(), skillId, level, seed, mode: "tutor", correct: false, assisted: true, seconds: 0 }));
}

export function finishSet(setId: string) {
  update((s) => {
    const set = s.sets.find((x) => x.id === setId);
    if (set && !set.finishedAt) set.finishedAt = Date.now();
  });
}

/** Answers given in one set, in order. */
export const answersIn = (s: StoreState, setId: string) => s.attempts.filter((a) => a.setId === setId).sort((a, b) => a.at - b.at);

/** A set of AI-written questions for a topic the skill map does not cover. */
export function startAiSet(profile: Profile, topic: string, questions: AiQuestion[], now: number): string | null {
  if (!questions.length) return null;
  const slug = topic.toLowerCase().replace(/[^a-z0-9áéíóúñü]+/g, "-").slice(0, 40);
  const set: PracticeSet = {
    id: newId(),
    profileId: profile.id,
    createdAt: now,
    kind: "pick",
    subject: guessSubject(topic),
    skillId: `ai:${slug}`,
    slots: questions.map((_, i) => ({ skillId: `ai:${slug}`, seed: i + 1, role: "main" as const, level: 1 })),
    topic: topic.slice(0, 120),
    ai: questions,
  };
  update((s) => void s.sets.push(set));
  return set.id;
}

/**
 * What a standard says, through /api/know (nothing about the learner is sent): its text, "missing"
 * when the Common Core data has no entry for the code (retrying cannot help), or null when the
 * lookup did not load (it may next time).
 */
export async function standardWording(code: string): Promise<Standard | "missing" | null> {
  const res = await fetch(`/api/know/standard?q=${encodeURIComponent(code)}`).catch(() => null);
  if (!res?.ok) return null;
  const body = (await res.json().catch(() => null)) as { standard?: Standard | null } | null;
  if (!body) return null;
  return body.standard ?? "missing";
}

/** Fetches AI-written questions; null when AI is not connected or the request failed. */
export async function aiQuestions(topic: string, grade: Grade, locale: Profile["locale"]): Promise<AiQuestion[] | null> {
  const res = await fetch("/api/ai/practice", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ topic, grade, locale, count: 8 }) }).catch(() => null);
  if (!res?.ok) return null;
  const { items } = (await res.json()) as { items: AiQuestion[] };
  return items;
}
