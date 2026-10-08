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
import { attemptIdentity } from "@/learning/evidence";
import { appendEvidence, EvidenceError, newId, read, update, type EvidenceRow, type StoreState } from "./store";
import { assistanceFor, attemptFor, recordHelp } from "./evidence";
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

// Memoized by reference: the store hands out a new document on every write, so this recomputes
// exactly when evidence changed. ponytail: one-entry cache; enough for one learner on screen.
let memo: { state: StoreState; profileId: string; hour: number; out: Statuses } | null = null;
/** Every skill's status for a learner: their answers, and the help they were shown (answered or not). */
export function statusesOf(s: StoreState, profileId: string, now: number): Statuses {
  const hour = Math.floor(now / 3600_000);
  if (memo && memo.state === s && memo.profileId === profileId && memo.hour === hour) return memo.out;
  const out = allStatuses(attemptsOf(s, profileId), now, undefined, { help: s.helpExposures.filter((h) => h.profileId === profileId) });
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

/** A set's question: the slot, at the level it was shown. */
export function practiceSource(set: PracticeSet, index: number, level: number): AttemptSource {
  const slot = set.slots[index];
  return { kind: "set-slot", profileId: set.profileId, skillId: slot.skillId, setId: set.id, slotId: String(index), itemFingerprint: `${slot.skillId}:${level}:${slot.seed}`, contentVersion: "legacy" };
}

/** Pins the difficulty when a question is shown, so an unfinished question does not change on reload. */
export function openPracticeAttempt(setId: string, index: number, level: number) {
  const set = read().sets.find((s) => s.id === setId);
  if (!set?.slots[index]) throw new EvidenceError("stale");
  if (set.slots[index].level === undefined)
    update((s) => {
      const slot = s.sets.find((x) => x.id === setId)?.slots[index];
      if (slot) slot.level ??= level;
    });
  const pinned = read().sets.find((s) => s.id === setId);
  const at = pinned?.slots[index]?.level;
  if (!pinned || at === undefined) throw new EvidenceError("stale");
  return attemptFor(practiceSource(pinned, index, at));
}

/**
 * Records a question's one final answer, before its feedback shows. The row's id is the set and slot,
 * so a second submit (another tab, a double tap) records nothing more. Help the question had, or a
 * miss before a right answer, makes it helped. A check answer stays a check answer: helped, it is not
 * on the learner's own and the check is graded that way. A check answer this device can't keep is not
 * taken (EvidenceError "storage"); an answer at another difficulty than the one shown is stale.
 */
export function recordAnswer(setId: string, a: AnswerRecord) {
  const set = read().sets.find((x) => x.id === setId);
  if (!set || set.finishedAt || !set.slots[a.slot]) return;
  const slot = set.slots[a.slot];
  if (slot.level !== undefined && slot.level !== a.level) throw new EvidenceError("stale");
  const attemptId = attemptIdentity(practiceSource(set, a.slot, a.level));
  if (a.attemptId && a.attemptId !== attemptId) throw new EvidenceError("stale");
  const evidence = assistanceFor(attemptId);
  // The first miss itself is an independent wrong answer; a later correction is helped.
  const assisted = a.assisted || evidence.exposureIds.length > 0 || (a.correct && evidence.assisted);
  const now = Date.now();
  appendEvidence(
    [{
      list: "attempts",
      record: {
        id: `${setId}:${a.slot}`, attemptId, profileId: set.profileId, at: now,
        skillId: slot.skillId, level: a.level, seed: slot.seed, setId,
        mode: slot.role === "review" ? "review" : MODE[set.kind],
        correct: a.correct, assisted, seconds: Math.min(Math.max(0, Math.round(a.seconds)), 3600),
        ...(a.response !== undefined ? { response: a.response.slice(0, 80) } : {}),
        ...(!a.correct && a.why ? { why: a.why.slice(0, 40) } : {}),
        provenance: "local-recorded",
      },
    }],
    {
      proof: set.kind === "check",
      also: (d) => {
        const live = d.sets.find((x) => x.id === setId);
        if (live && live.slots[a.slot].level !== undefined && live.slots[a.slot].level !== a.level) throw new EvidenceError("stale");
        if (live) {
          live.startedAt ??= now;
          live.slots[a.slot].level ??= a.level;
        }
      },
    },
  );
}

/**
 * Help from the tutor beside a problem counts as help (it restarts the check clock): a synced "tutor"
 * row, one per question, and on a set's question its help too, so a reload keeps it helped.
 */
export function recordTutorHelp(profileId: string, skillId: string, seed: number, level: number, source?: AttemptSource) {
  if (!source) {
    if (getSkill(skillId)) update((s) => void s.attempts.push({ id: newId(), profileId, at: Date.now(), skillId, level, seed, mode: "tutor", correct: false, assisted: true, seconds: 0 }));
    return;
  }
  const attemptId = attemptIdentity(source);
  const row: EvidenceRow = { list: "attempts", record: { id: `${attemptId}:tutor`, attemptId, profileId, at: Date.now(), skillId, level, seed, mode: "tutor", correct: false, assisted: true, seconds: 0 } };
  recordHelp(source, { kind: "tutor", delivery: "latched" }, getSkill(skillId) ? [row] : []);
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
