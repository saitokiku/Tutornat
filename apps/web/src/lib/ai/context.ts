import { z } from "zod";
import en from "@/i18n/en";
import es from "@/i18n/es";
import { teachingProfile, type TeachingProfile } from "@/learning/profile";
import type { StoreState } from "../store";
import { GRADES, type Locale, type Profile } from "../types";

// What the browser tells the tutor about the moment. Never the learner's name. Items are sent as
// (skill, level, seed) and rebuilt on the server, so answer keys are not trusted from the client.

/** Misconception tags are authors' kebab-case ids; anything else is not a tag and is dropped. */
const TAG = /^[a-z0-9][a-z0-9-]{0,39}$/;

/**
 * How this learner learns (learning/profile.ts), compact: only facts with enough evidence or a
 * grown-up's choice. The free-text note arrives with the learner's name already scrubbed.
 */
export const TeachingBlock = z.object({
  /** The hint rung to start at: 1 nudge · 2 strategy · 3 first step. */
  hintRung: z.number().int().min(1).max(3).optional(),
  /** Problems solved after hints, by the last rung they needed: [nudge, strategy, first step]. */
  hintSolved: z.tuple([z.number().int().min(0), z.number().int().min(0), z.number().int().min(0)]).optional(),
  leadWith: z.enum(["hint", "example"]).optional(),
  representation: z.enum(["pictures", "number-line", "blocks", "words"]).optional(),
  misconceptions: z.array(z.object({ tag: z.string().regex(TAG), skillId: z.string().max(60).optional() })).max(3).optional(),
  pace: z.enum(["quicker", "usual", "slower"]).optional(),
  note: z.string().max(400).optional(),
});

export type TeachingBlock = z.infer<typeof TeachingBlock>;

export const TutorContext = z.object({
  locale: z.enum(["en", "es"]),
  grade: z.enum(GRADES as [string, ...string[]]),
  surface: z.enum(["practice", "lesson", "talk", "homework"]),
  item: z.object({ skillId: z.string().max(60), level: z.number().int().min(1).max(5), seed: z.number().int() }).optional(),
  tries: z.number().int().min(0).max(50).optional(),
  lastAnswer: z.string().max(80).optional(),
  lesson: z.object({ title: z.string().max(160), scene: z.string().max(1600) }).optional(),
  homework: z.object({ title: z.string().max(160), notes: z.string().max(1000).optional() }).optional(),
  interests: z.array(z.string().max(40)).max(6).optional(),
  /** Skills the learner is practicing or found hard lately (ids), for examples and suggestions. */
  working: z.array(z.string().max(60)).max(8).optional(),
  teaching: TeachingBlock.optional(),
  /**
   * How this turn was said: "voice" when the learner's last message is a speech transcript (it may be
   * misheard, and the reply will be spoken). Per turn; "text" when left out.
   */
  input: z.enum(["voice", "text"]).optional(),
});

export type TutorContext = z.infer<typeof TutorContext>;

/** Where next_hint starts for this learner: the index of the profile's hint rung (0 = the nudge). */
export const startHint = (ctx: Pick<TutorContext, "teaching">) => Math.max(0, (ctx.teaching?.hintRung ?? 1) - 1);

// ----- keeping names out -----

/** Letters that don't come apart into a base letter and an accent, as a keyboard without them writes them. */
const PLAIN: Record<string, string> = { ß: "ss", ẞ: "ss", æ: "ae", Æ: "ae", œ: "oe", Œ: "oe", ø: "o", Ø: "o", ł: "l", Ł: "l", đ: "d", Đ: "d", ð: "d", Ð: "d", ı: "i", ħ: "h", Ħ: "h", ŧ: "t", Ŧ: "t", þ: "th", Þ: "th", ς: "σ" };
const WORD = /[\p{L}\p{N}]/u;
/** Scripts written without spaces between words: a name there has no word edges to look for. */
const SPACELESS = /[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}\p{sc=Thai}\p{sc=Lao}\p{sc=Khmer}\p{sc=Myanmar}]/u;

/**
 * Text folded for matching: no accents, no case, ß as ss and so on. `from`/`to` give, for each unit
 * of the folded text, the span of the (NFD) source it came from, so a match can be cut out there.
 */
function fold(text: string) {
  const source = text.normalize("NFD");
  let folded = "";
  const from: number[] = [], to: number[] = [];
  for (const m of source.matchAll(/\P{M}\p{M}*/gu)) {
    const ch = String.fromCodePoint(m[0].codePointAt(0)!);
    const plain = (PLAIN[ch] ?? ch.toLowerCase()).normalize("NFD").replace(/\p{M}/gu, "");
    for (let i = 0; i < plain.length; i++) {
      from.push(m.index);
      to.push(m.index + m[0].length);
    }
    folded += plain;
  }
  return { source, folded, from, to };
}

/** A name and each part of it, folded; parts of one letter are initials, not names, and would eat ordinary words. */
const partsOf = (name: string) =>
  [name, ...name.split(/[\s\-'’.]+/)].map((p) => fold(p.trim()).folded).filter((p) => (p.match(/[\p{L}\p{N}]/gu) ?? []).length >= 2);

/**
 * Replaces names in free text: any case, with or without accents (Jiří, jiri, JIŘÍ), each part of a
 * longer name, as whole words (so "Ana's" goes and "banana" stays). Each group of names gets its own
 * replacement; where names overlap, the longest match wins.
 */
export function scrubNames(text: string, groups: { names: string[]; as: string }[]): string {
  const parts = groups.flatMap((g) => g.names.flatMap(partsOf).map((p) => ({ p, as: g.as }))).sort((a, b) => b.p.length - a.p.length);
  if (!parts.length || !text) return text;
  const { source, folded, from, to } = fold(text);
  const taken: { i: number; j: number; as: string }[] = [];
  for (const { p, as } of parts)
    for (let i = folded.indexOf(p); i !== -1; i = folded.indexOf(p, i + 1)) {
      const j = i + p.length;
      if (!SPACELESS.test(p[0]) && WORD.test(folded[i - 1] ?? "")) continue;
      if (!SPACELESS.test(p.at(-1)!) && WORD.test(folded[j] ?? "")) continue;
      if (taken.some((t) => i < t.j && j > t.i)) continue;
      taken.push({ i, j, as });
    }
  if (!taken.length) return text;
  let out = source;
  for (const t of taken.sort((a, b) => b.i - a.i)) out = out.slice(0, from[t.i]) + t.as + out.slice(to[t.j - 1]);
  return out.normalize("NFC");
}

/** The words that stand in for a name: the learner, and anyone else in the family. */
const STAND_IN = (locale: Locale) => ({ learner: (locale === "es" ? es : en)["lm.scrub.learner"], other: (locale === "es" ? es : en)["lm.scrub.other"] });

/** Replaces the learner's name in free text with "the learner" (or `as`). See scrubNames. */
export function scrubName(text: string, name: string, as = STAND_IN("en").learner): string {
  return scrubNames(text, [{ names: [name], as }]);
}

/** The learner's name becomes "the learner"; the family's other names (siblings, the grown-up) become "[name]". */
export const scrubFamily = (text: string, name: string, others: string[], locale: Locale) => {
  const w = STAND_IN(locale);
  return scrubNames(text, [
    { names: [name], as: w.learner },
    { names: others, as: w.other },
  ]);
};

/** Everyone else in the learner's family on this device: the other learners and the grown-up's name. */
export function familyNames(s: Pick<StoreState, "profiles" | "accounts">, learner: Pick<Profile, "id" | "accountId">): string[] {
  const kids = s.profiles.filter((p) => p.accountId === learner.accountId && p.id !== learner.id).map((p) => p.nickname);
  const grownUp = s.accounts.find((a) => a.id === learner.accountId)?.displayName;
  return [...kids, ...(grownUp ? [grownUp] : [])];
}

/**
 * Every free-text part of a tutor request with the learner's name and the family's other names taken
 * out: what they typed last, the lesson on screen, the homework, interests and the grown-up's note.
 * Call it on the context the browser sends, every time.
 */
export function scrubContext(ctx: TutorContext, name: string, others: string[] = []): TutorContext {
  const x = (text: string) => scrubFamily(text, name, others, ctx.locale);
  const out: TutorContext = { ...ctx };
  if (ctx.lastAnswer !== undefined) out.lastAnswer = x(ctx.lastAnswer);
  if (ctx.lesson) out.lesson = { title: x(ctx.lesson.title), scene: x(ctx.lesson.scene) };
  if (ctx.homework) out.homework = { title: x(ctx.homework.title), ...(ctx.homework.notes !== undefined ? { notes: x(ctx.homework.notes) } : {}) };
  if (ctx.interests) out.interests = ctx.interests.map(x);
  if (ctx.teaching?.note) out.teaching = { ...ctx.teaching, note: x(ctx.teaching.note) };
  return out;
}

/**
 * A conversation's messages with names taken out of every text part, for the request only (the chat
 * on screen keeps what was typed). For DefaultChatTransport's prepareSendMessagesRequest.
 */
export function scrubMessages<M extends { parts: readonly object[] }>(messages: M[], name: string, others: string[], locale: Locale): M[] {
  return messages.map((m) => ({
    ...m,
    parts: m.parts.map((p) => ("type" in p && p.type === "text" && "text" in p && typeof p.text === "string" ? { ...p, text: scrubFamily(p.text, name, others, locale) } : p)),
  }));
}

/**
 * The compact teaching block for the tutor, or undefined when nothing is known yet or a grown-up
 * turned the profile off. Never a name: the note is scrubbed of the learner's and the family's.
 */
export function teachingBlock(profile: TeachingProfile, nickname: string, others: string[] = [], locale: Locale = "en"): TeachingBlock | undefined {
  if (profile.off) return undefined;
  const misconceptions = profile.misconceptions.value?.filter((m) => TAG.test(m.tag)).map((m) => ({ tag: m.tag, skillId: m.skillIds[0] }));
  const note = profile.note ? scrubFamily(profile.note, nickname, others, locale).replace(/\s+/g, " ").trim().slice(0, 400) : "";
  const rung = profile.hintRung.value;
  const block: TeachingBlock = {
    hintRung: rung ?? undefined,
    hintSolved: rung ? profile.hintRung.solved : undefined,
    leadWith: profile.leadWith.value ?? undefined,
    representation: profile.representation.value ?? undefined,
    misconceptions: misconceptions?.length ? misconceptions : undefined,
    pace: profile.pace.value ?? undefined,
    note: note || undefined,
  };
  for (const k of Object.keys(block) as (keyof TeachingBlock)[]) if (block[k] === undefined) delete block[k];
  return Object.keys(block).length ? block : undefined;
}

/** In the browser: the teaching block for a learner, from this device's record. */
export function teachingFor(s: Pick<StoreState, "attempts" | "acts" | "sets" | "profiles" | "accounts">, learner: Profile, now: number): TeachingBlock | undefined {
  const mine = <T extends { profileId: string }>(list: T[]) => list.filter((x) => x.profileId === learner.id);
  const profile = teachingProfile({ attempts: mine(s.attempts), acts: mine(s.acts), sets: mine(s.sets), prefs: learner.teaching, learner }, now);
  return teachingBlock(profile, learner.nickname, familyNames(s, learner), learner.locale);
}
