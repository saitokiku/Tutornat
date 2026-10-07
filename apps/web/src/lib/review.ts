import type { SkillReview } from "@/learning/types";
import { answerText } from "@/practice/answer";
import { STRANDS } from "@/practice/registry";
import { REVIEWED } from "@/practice/reviewed";
import { gradeIndex, makeItem, SKILLS } from "@/practice/skills";
import type { Item, Skill } from "@/practice/types";
import { newId, update, type StoreState } from "./store";
import type { Grade, Subject } from "./types";

/** The newest review decision on a skill made on this device (the /review tool). */
export const reviewOf = (s: StoreState, skillId: string) =>
  s.reviews.filter((r) => r.skillId === skillId).sort((a, b) => b.at - a.at)[0];

/** Computed skills are checked by code; draft banks count as reviewed once a teacher approved them. */
export const isReviewed = (s: StoreState, skill: Pick<Skill, "id" | "content">) =>
  skill.content === "computed" || REVIEWED.includes(skill.id) || reviewOf(s, skill.id)?.status === "approved";

// ----- the /review tool -----

/**
 * computed: answers are calculated, nothing to approve · in-code: listed in practice/reviewed.ts ·
 * approved / flagged: the newest decision made on this device · draft: nobody has looked yet.
 */
export type ReviewState = "computed" | "in-code" | "approved" | "flagged" | "draft";

export function reviewState(s: StoreState, skill: Pick<Skill, "id" | "content">): ReviewState {
  if (skill.content === "computed") return "computed";
  if (REVIEWED.includes(skill.id)) return "in-code";
  return reviewOf(s, skill.id)?.status ?? "draft";
}

export const NOTE_MAX = 1000;

/**
 * Records a grown-up's decision on a skill's questions (both languages, every level). A flag needs a
 * note saying what is wrong. Only the Parent view may review; returns null when refused.
 */
export function reviewSkill(skillId: string, status: SkillReview["status"], note?: string): SkillReview | null {
  const clean = note?.replace(/\s+\n/g, "\n").trim().slice(0, NOTE_MAX) || undefined;
  if (status === "flagged" && !clean) return null;
  const skill = SKILLS.find((k) => k.id === skillId);
  if (!skill || skill.content === "computed") return null;
  let made: SkillReview | null = null;
  update((s) => {
    const by = s.session.accountId;
    if (!by || s.session.profileId !== "parent" || !s.accounts.some((a) => a.id === by)) return;
    made = { id: newId(), skillId, status, ...(clean ? { note: clean } : {}), by, at: Date.now() };
    s.reviews.push(made);
  });
  return made;
}

/**
 * A strand of practice/registry.ts (one bank file: "English K–4", "Math 6–7"), named by its subject
 * and grade span. `key` is its first skill's id, so it stays stable as strands are added.
 */
export type Strand = { key: string; subject: Subject; from: Grade; to: Grade; ids: string[] };

const SUBJECT_ORDER: Subject[] = ["math", "english", "science", "other"];

/** Every strand, in skill-map order: by subject, then by the grade it starts at. */
export function strands(): Strand[] {
  return STRANDS.filter((list) => list.length > 0)
    .map((list) => {
      const grades = list.map((k) => k.grade).sort((a, b) => gradeIndex(a) - gradeIndex(b));
      return { key: list[0].id, subject: list[0].subject, from: grades[0], to: grades[grades.length - 1], ids: list.map((k) => k.id) };
    })
    .sort((a, b) => SUBJECT_ORDER.indexOf(a.subject) - SUBJECT_ORDER.indexOf(b.subject) || gradeIndex(a.from) - gradeIndex(b.from));
}

/** "K–4", "6–7", or one grade: the span in the strand's name. */
export const gradeSpan = (st: Pick<Strand, "from" | "to">) => (st.from === st.to ? st.from : `${st.from}–${st.to}`);

/** Every decision on a skill, newest first. */
export const reviewHistory = (s: StoreState, skillId: string) => s.reviews.filter((r) => r.skillId === skillId).sort((a, b) => b.at - a.at);

/**
 * Lines to paste into practice/reviewed.ts: skills approved on this device that the file doesn't list
 * yet, in teaching order.
 */
export function reviewedLines(s: StoreState): string[] {
  return SKILLS.filter((k) => k.content === "draft" && !REVIEWED.includes(k.id) && reviewOf(s, k.id)?.status === "approved").map((k) => `  "${k.id}",`);
}

// ----- previewing a bank -----

export type PreviewPair = { seed: number; en: Item; es: Item };
export type LevelPreview = {
  level: number;
  pairs: PreviewPair[];
  /** True when drawing stopped because no new question had turned up for a long run of seeds. */
  complete: boolean;
  /** Seeds drawn. */
  drawn: number;
};

/** What makes two items the same question: words, picture, choices as a set, key, hints, steps. */
function fingerprint(item: Item) {
  const choices = (item.choices ?? []).map((c) => `${c.label}|${c.say ?? ""}|${c.picture ?? ""}|${c.why ?? ""}`).sort();
  return JSON.stringify([item.prompt, item.say, item.picture, item.alt, item.visual, item.input, item.pad, choices, answerText(item.answer, item.choices), item.wrong, item.hints, item.steps]);
}

export const PREVIEW_SEED = (i: number) => (i * 2654435761 + 97) % 2 ** 31;

/**
 * Every distinct question a level can produce, paired with the Spanish item from the same seed (the
 * learner on the other language gets that one). Seeds are drawn until no new question has appeared
 * for max(400, 12 × found) draws in a row (a missed question is then less likely than 1 in 100,000),
 * or until `cap` draws for generators that make questions from numbers. `samples` stops early, for
 * computed skills, where every question is new.
 */
export function previewLevel(skillId: string, level: number, opts: { cap?: number; samples?: number } = {}): LevelPreview {
  const cap = opts.cap ?? 5000;
  const seen = new Set<string>();
  const pairs: PreviewPair[] = [];
  let since = 0;
  let drawn = 0;
  for (let i = 0; i < cap; i++) {
    const seed = PREVIEW_SEED(i);
    const en = makeItem(skillId, level, seed, "en");
    const es = makeItem(skillId, level, seed, "es");
    drawn++;
    const key = fingerprint(en) + fingerprint(es);
    if (seen.has(key)) since++;
    else {
      seen.add(key);
      pairs.push({ seed, en, es });
      since = 0;
      if (opts.samples && pairs.length >= opts.samples) return { level, pairs, complete: false, drawn };
    }
    if (since >= Math.max(400, 12 * pairs.length)) return { level, pairs, complete: true, drawn };
  }
  return { level, pairs, complete: false, drawn };
}

/** All levels of a skill: the whole bank for drafts, three samples per level for computed skills. */
export function previewSkill(skill: Pick<Skill, "id" | "levels" | "content">): LevelPreview[] {
  return Array.from({ length: skill.levels }, (_, i) => previewLevel(skill.id, i + 1, skill.content === "computed" ? { samples: 3 } : {}));
}
