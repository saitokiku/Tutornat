import { tool } from "ai";
import { z } from "zod";
import { check } from "@/practice/answer";
import { randomSeed } from "@/practice/rng";
import { getSkill, makeItem, SKILLS } from "@/practice/skills";
import { matchSkills } from "@/planner/skillmatch";
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

export function tutorTools(ctx: TutorContext) {
  const current = () => (ctx.item && getSkill(ctx.item.skillId) ? makeItem(ctx.item.skillId, ctx.item.level, ctx.item.seed, ctx.locale) : null);
  let hintsGiven = 0;
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
        const item = makeItem(id, ctx.item?.skillId === id ? ctx.item.level : 1, randomSeed(), ctx.locale);
        return { skillId: id, level: item.level, seed: item.seed, problem: item.say, steps: item.steps };
      },
    }),
    find_skill: tool({
      description: "Find skills on the KaizenEDU skill map that match a topic, homework or test description.",
      inputSchema: z.object({ query: z.string().max(200) }),
      execute: async ({ query }) => {
        const ids = matchSkills(query);
        const byTitle = SKILLS.filter((s) => s.title.en.toLowerCase().includes(query.toLowerCase()) || s.title.es.toLowerCase().includes(query.toLowerCase())).map((s) => s.id);
        const found = [...new Set([...ids, ...byTitle])].slice(0, 5);
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
  };
}

export type TutorTools = ReturnType<typeof tutorTools>;
