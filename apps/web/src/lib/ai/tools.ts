import { tool, type UIMessage } from "ai";
import { z } from "zod";
import { similarItem } from "@/components/tutor/similar";
import { standardUrl, wiktionaryUrl } from "@/components/tutor/sources";
import { audiobooks, cleanQuery, define, poemsBy, poemTitled, searchBooks, shortPoems, standardText, wikiSummary } from "@/knowledge";
import type { Grade } from "@/lib/types";
import { check } from "@/practice/answer";
import { randomSeed } from "@/practice/rng";
import { getSkill, makeItem } from "@/practice/skills";
import { matchSkills, sameWord } from "@/planner/skillmatch";
import { linkOf, resourcesFor } from "@/resources";
import type { TutorContext } from "./context";

// The tutor's tools. Everything that must be correct is code: checking an answer, the vetted hint,
// a worked example of a fresh problem, which skill matches. The model decides when to use them and
// how to say it. "Board" tools (show_visual, start_practice, add_to_calendar, note_for_grownup) just
// echo their input; the browser draws them from the tool part.

const n = (lo: number, hi: number) => z.number().min(lo).max(hi);

/** Pictures the tutor may draw: the same shared visuals lessons and practice use, with sane limits. */
export const VisualInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("fraction"), parts: n(1, 12).int(), shaded: n(0, 12).int() }),
  z.object({ kind: z.literal("number-line"), min: n(-20, 100), max: n(-19, 100), marks: z.array(n(-20, 100)).max(12), denominator: n(1, 12).int().optional(), marker: n(-20, 100).optional() }),
  z.object({ kind: z.literal("dots"), groups: z.array(n(0, 20).int()).min(1).max(3), crossed: n(0, 20).int().optional() }),
  z.object({ kind: z.literal("ten-frame"), filled: n(0, 20).int(), frames: z.union([z.literal(1), z.literal(2)]).optional() }),
  z.object({ kind: z.literal("base-ten"), hundreds: n(0, 9).int().optional(), tens: n(0, 9).int(), ones: n(0, 9).int() }),
  z.object({ kind: z.literal("array"), rows: n(1, 12).int(), cols: n(1, 12).int() }),
  z.object({ kind: z.literal("clock"), h: n(1, 12).int(), m: n(0, 59).int() }),
  z.object({ kind: z.literal("column"), op: z.enum(["+", "−", "×"]), top: n(0, 99999).int(), bottom: n(0, 9999).int() }),
  z.object({ kind: z.literal("rect"), w: n(1, 100), h: n(1, 100), unit: z.string().max(8) }),
  z.object({ kind: z.literal("coord"), points: z.array(z.tuple([n(-20, 20), n(-20, 20)])).max(6), line: z.boolean().optional() }),
  z.object({ kind: z.literal("particles"), state: z.enum(["solid", "liquid", "gas"]) }),
  z.object({ kind: z.literal("moon"), phase: n(0, 1) }),
]);

/**
 * How many vetted hints the tutor has already given in this conversation. Tools are built per request,
 * so the ladder's place comes from the conversation itself, or the second ask would get the first hint again.
 */
export function hintsGiven(messages: UIMessage[]): number {
  let n = 0;
  for (const m of messages)
    for (const p of m.parts ?? []) {
      const part = p as { type: string; state?: string; output?: { hint?: unknown } };
      if (part.type === "tool-next_hint" && part.state === "output-available" && typeof part.output?.hint === "string") n++;
    }
  return n;
}

export function tutorTools(ctx: TutorContext, history: { hintsGiven?: number } = {}) {
  const current = () => (ctx.item && getSkill(ctx.item.skillId) ? makeItem(ctx.item.skillId, ctx.item.level, ctx.item.seed, ctx.locale) : null);
  let hintsGiven = history.hintsGiven ?? 0;
  return {
    next_hint: tool({
      description: "The next vetted hint for the learner's current problem, smallest first. Using it counts as help.",
      inputSchema: z.object({}),
      execute: async () => {
        const item = current();
        if (!item) return { hint: null, note: "No current problem." };
        const hint = item.hints[Math.min(hintsGiven, item.hints.length - 1)];
        const last = hintsGiven >= item.hints.length - 1;
        hintsGiven++;
        return { hint, last };
      },
    }),
    check_answer: tool({
      description: "Check something the learner said against the current problem's answer, using the deterministic checker. Returns correct, and a form note when the value is right but the form is not.",
      inputSchema: z.object({ answer: z.string().max(80).describe("Exactly what the learner said, e.g. '7/12' or '42'") }),
      execute: async ({ answer }) => {
        const item = current();
        if (!item) return { correct: null, note: "No current problem to check against." };
        const index = item.choices?.findIndex((c) => c.label.trim().toLowerCase() === answer.trim().toLowerCase()) ?? -1;
        const verdict = check(item.answer, item.answer.kind === "choice" ? index : answer);
        return { correct: verdict.correct, form: verdict.form ?? null };
      },
    }),
    similar_problem: tool({
      description: "A fresh problem of the same kind as the current one, with its full worked solution, to model the method. Never the learner's own problem.",
      inputSchema: z.object({ skillId: z.string().optional().describe("Defaults to the current problem's skill") }),
      execute: async ({ skillId }) => {
        const id = skillId && getSkill(skillId) ? skillId : ctx.item?.skillId;
        if (!id || !getSkill(id)) return { problem: null };
        // Never the learner's own problem again: its worked steps would give their answer away.
        const item = similarItem(id, ctx.item?.skillId === id ? ctx.item.level : 1, ctx.locale, randomSeed(), { item: current() });
        if (!item) return { problem: null, note: "No different problem of this kind. Give the next hint instead." };
        return { skillId: id, level: item.level, seed: item.seed, problem: item.say, steps: item.steps };
      },
    }),
    find_skill: tool({
      description: "Find skills on the KaizenEDU skill map that match a topic, homework or test description.",
      inputSchema: z.object({ query: z.string().max(200) }),
      execute: async ({ query }) => {
        const found = matchSkills(query, undefined, 5, ctx.grade as Grade);
        return { skills: found.map((id) => ({ skillId: id, title: getSkill(id)!.title[ctx.locale], grade: getSkill(id)!.grade })) };
      },
    }),
    find_resources: tool({
      description: "Real, free sources (books, videos, simulations, libraries) for a skill or topic. Use when the learner wants to read or watch more.",
      inputSchema: z.object({ skillId: z.string().optional(), topic: z.string().max(120).optional() }),
      execute: async ({ skillId, topic }) => ({
        resources: resourcesFor({ skillId, topic, grade: ctx.grade, locale: ctx.locale })
          .slice(0, 4)
          .map((r) => ({ title: r.title, source: r.source, url: linkOf(r, ctx.locale), kind: r.kind })),
      }),
    }),
    show_visual: tool({
      description: "Draw one picture on the learner's board (fraction bar, number line, dots, ten-frame, base-ten blocks, array, clock, column sum, rectangle, coordinate points, particles, moon). Always give a plain-language description.",
      inputSchema: z.object({ visual: VisualInput, description: z.string().max(200) }),
      execute: async () => ({ shown: true }),
    }),
    start_practice: tool({
      description: "Offer a short practice set on a skill from the map. The learner chooses whether to start.",
      inputSchema: z.object({ skillId: z.string(), reason: z.string().max(140) }),
      execute: async ({ skillId }) => ({ offered: !!getSkill(skillId) }),
    }),
    add_to_calendar: tool({
      description: "Propose adding a school date (test, quiz, homework, project) to the learner's calendar. The learner confirms.",
      inputSchema: z.object({ title: z.string().max(120), kind: z.enum(["test", "quiz", "homework", "project", "event"]), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
      execute: async () => ({ proposed: true }),
    }),
    note_for_grownup: tool({
      description: "Leave a short factual note for the learner's grown-ups (what they worked on, where they got stuck). No feelings, no private details.",
      inputSchema: z.object({ text: z.string().max(280) }),
      execute: async () => ({ saved: true }),
    }),
    ...knowledgeTools(ctx),
  };
}

// Knowledge tools: real, named sources fetched on the server (only the query leaves; never anything
// about the learner). Each result is drawn on the learner's board as a card with its source link, so
// the model teaches from it in its own short words instead of reciting it. Failures come back as
// { found: false } so the tutor says it couldn't look it up rather than inventing a fact.

const unavailable = { found: false as const, note: "The source could not be reached. Say you couldn't look it up right now; do not make up the facts." };
const notFound = { found: false as const, note: "Nothing found. Say so plainly; do not make up an answer." };

async function attempt<T>(run: () => Promise<T>): Promise<T | typeof unavailable> {
  try {
    return await run();
  } catch {
    return unavailable;
  }
}

/** A Common Core code as the standards site writes it, e.g. 4.NF.A.1, RF.K.3a, A-REI.B.3. */
const STANDARD_CODE = /^[A-Z0-9][A-Za-z0-9.-]{2,19}$/;

export function knowledgeTools(ctx: TutorContext) {
  return {
    look_up: tool({
      description:
        "Look up a topic on Wikipedia, in the learner's language, for a short cited summary to teach from: what something is, who someone was, how something works. The extract and its link appear on the learner's board; explain it in your own short words and point to the card. Never use it to answer the learner's own graded question for them.",
      inputSchema: z.object({ topic: z.string().min(2).max(100).describe("The topic only, e.g. 'logical fallacy' or 'photosynthesis'") }),
      execute: async ({ topic }) => {
        const q = cleanQuery(topic, 100);
        if (!q) return notFound;
        return attempt(async () => {
          const s = await wikiSummary(q, ctx.locale);
          return s ? { found: true as const, title: s.title, extract: s.extract, url: s.url, lang: s.lang, license: s.license, source: "Wikipedia" } : notFound;
        });
      },
    }),
    define_word: tool({
      description:
        "Dictionary senses for one English word (Wiktionary, through Datamuse), shown on the board with the source. Use for 'what does … mean' about a word. For a Spanish word or a whole topic, use look_up.",
      inputSchema: z.object({ word: z.string().min(2).max(40) }),
      execute: async ({ word }) => {
        const q = cleanQuery(word, 40);
        if (!q) return notFound;
        return attempt(async () => {
          // Only senses of the word asked about, not of one the dictionary thought was spelled like it.
          const defs = (await define(q)).filter((d) => sameWord(d.word, q));
          if (!defs.length) return notFound;
          return {
            found: true as const,
            word: defs[0].word,
            senses: defs.slice(0, 3).map((d) => ({ partOfSpeech: d.partOfSpeech, text: d.text })),
            url: wiktionaryUrl(defs[0].word),
            source: "Wiktionary via Datamuse",
          };
        });
      },
    }),
    find_book: tool({
      description:
        "Find real books by topic, title or author in Open Library (borrow or read free), or free public-domain audiobooks on LibriVox when the learner wants to listen. Shown on the board with links.",
      inputSchema: z.object({ query: z.string().min(2).max(100), audio: z.boolean().optional().describe("True when the learner wants to listen to a book") }),
      execute: async ({ query, audio }) => {
        const q = cleanQuery(query, 100);
        if (!q) return notFound;
        return attempt(async () => {
          const books = (audio ? await audiobooks(q, 4) : await searchBooks(q, 4)).slice(0, 4);
          if (!books.length) return notFound;
          return { found: true as const, query: q, books: books.map((b) => ({ title: b.title, author: b.author, year: b.year, url: b.url, source: b.source, kind: b.kind })) };
        });
      },
    }),
    read_poem: tool({
      description:
        "A public-domain poem with its full text (PoetryDB, English): by title, by poet, or a short one for a young reader when neither is given. Shown on the board, where the learner can hear it read aloud.",
      inputSchema: z.object({ title: z.string().max(100).optional(), author: z.string().max(60).optional() }),
      execute: async ({ title, author }) => {
        const t = cleanQuery(title, 100);
        const a = cleanQuery(author, 60);
        return attempt(async () => {
          const poem = t ? await poemTitled(t) : a ? (await poemsBy(a))[0] : (await shortPoems(3))[0];
          if (!poem) return notFound;
          return { found: true as const, title: poem.title, author: poem.author, lines: poem.lines.slice(0, 40), url: poem.url, source: "PoetryDB" };
        });
      },
    }),
    standard_text: tool({
      description:
        "The exact wording of a Common Core standard, by code (e.g. 4.NF.A.1) or for a skill on the map (defaults to the current problem's skill). Shown on the board with its official link. Use when someone asks what a standard says.",
      inputSchema: z.object({ code: z.string().max(20).optional(), skillId: z.string().max(60).optional() }),
      execute: async ({ code, skillId }) => {
        const c = code?.trim() || (skillId ? getSkill(skillId)?.standard : undefined) || (ctx.item ? getSkill(ctx.item.skillId)?.standard : undefined);
        if (!c || !STANDARD_CODE.test(c)) return notFound;
        return attempt(async () => {
          const s = await standardText(c);
          return s ? { found: true as const, code: s.code, text: s.text, subject: s.subject, grade: s.grade, url: standardUrl(s.code), source: s.source } : notFound;
        });
      },
    }),
  };
}

export type TutorTools = ReturnType<typeof tutorTools>;
