import { z } from "zod";
import { teachingProfile, type TeachingProfile } from "@/learning/profile";
import type { StoreState } from "../store";
import { GRADES, type Profile } from "../types";

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
});

export type TutorContext = z.infer<typeof TutorContext>;

// ----- keeping the name out -----

const VARIANTS: Record<string, string> = { a: "aàáâãäå", e: "eèéêë", i: "iìíîï", o: "oòóôõö", u: "uùúûü", n: "nñ", c: "cç", y: "yýÿ" };
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const letters = (s: string) => fold(s).replace(/[^\p{L}\p{N}]/gu, "");

/**
 * Replaces the learner's name in free text with "the learner": any case, with or without accents,
 * the whole name and each part of it, as whole words (so "Ana's" goes, "banana" stays). One-letter
 * parts are left alone; they are initials, not names, and would eat ordinary words.
 */
export function scrubName(text: string, name: string, as = "the learner"): string {
  const parts = [name, ...name.split(/[\s\-'’.]+/)].map((p) => p.trim()).filter((p) => letters(p).length >= 2);
  let out = text.normalize("NFC");
  for (const part of [...new Set(parts)].sort((a, b) => b.length - a.length)) {
    const pattern = [...fold(part)].map((ch) => (VARIANTS[ch] ? `[${VARIANTS[ch]}]` : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).join("");
    out = out.replace(new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, "giu"), as);
  }
  return out;
}

/** The compact teaching block for the tutor, or undefined when nothing is known yet. Never the name. */
export function teachingBlock(profile: TeachingProfile, nickname: string): TeachingBlock | undefined {
  const misconceptions = profile.misconceptions.value?.filter((m) => TAG.test(m.tag)).map((m) => ({ tag: m.tag, skillId: m.skillIds[0] }));
  const note = profile.note ? scrubName(profile.note, nickname).replace(/\s+/g, " ").trim().slice(0, 400) : "";
  const block: TeachingBlock = {
    hintRung: profile.hintRung.value ?? undefined,
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
export function teachingFor(s: Pick<StoreState, "attempts" | "acts" | "sets">, learner: Profile, now: number): TeachingBlock | undefined {
  const mine = <T extends { profileId: string }>(list: T[]) => list.filter((x) => x.profileId === learner.id);
  const profile = teachingProfile({ attempts: mine(s.attempts), acts: mine(s.acts), sets: mine(s.sets), prefs: learner.teaching, learner }, now);
  return teachingBlock(profile, learner.nickname);
}
