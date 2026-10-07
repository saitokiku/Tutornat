import { z } from "zod";
import { VisualInput } from "./tools";

// The shapes models must fill. They mirror lib/types.ts so a generated lesson is a normal lesson,
// and the same quality gates the owner set for OpenMAIC lessons are checked in code.

const s = (max: number) => z.string().min(1).max(max);

export const BlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: s(600) }),
  z.object({ type: z.literal("points"), items: z.array(s(200)).min(2).max(5) }),
  z.object({ type: z.literal("visual"), visual: VisualInput, alt: s(240) }),
]);

export const WidgetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("fraction-bar"), parts: z.number().int().min(2).max(12), shaded: z.number().int().min(0).max(12), target: z.object({ parts: z.number().int().min(2).max(12), shaded: z.number().int().min(0).max(12) }).optional() }),
  z.object({ kind: z.literal("number-line"), min: z.number().min(-20).max(100), max: z.number().min(-19).max(100), step: z.number().positive().max(10), start: z.number(), target: z.number().optional(), denominator: z.number().int().min(2).max(12).optional() }),
  z.object({ kind: z.literal("states-of-matter"), startC: z.number().min(-40).max(140), target: z.enum(["solid", "liquid", "gas"]).optional() }),
  z.object({ kind: z.literal("moon-phases"), target: z.number().int().min(0).max(29).optional() }),
  z.object({ kind: z.literal("sorter"), categories: z.array(s(40)).min(2).max(3), items: z.array(z.object({ text: s(120), answer: z.number().int().min(0).max(2) })).min(3).max(6) }),
]);

export const SceneSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("slide"), title: s(120), blocks: z.array(BlockSchema).min(1).max(5) }),
  z.object({
    kind: z.literal("quiz"),
    title: s(120),
    questions: z.array(z.object({ prompt: s(300), choices: z.array(s(140)).min(2).max(4), answer: z.number().int().min(0).max(3), hint: s(240), explain: s(400) })).min(1).max(3),
  }),
  z.object({ kind: z.literal("interactive"), title: s(120), prompt: s(300), widget: WidgetSchema }),
  z.object({ kind: z.literal("project"), title: s(120), brief: s(500), steps: z.array(s(200)).min(2).max(5) }),
]);

export const LessonSchema = z.object({ title: s(120), summary: s(240), minutes: z.number().int().min(3).max(40), scenes: z.array(SceneSchema).min(3).max(6) });

export const OutlineSchema = z.object({
  title: s(120),
  lessons: z.array(z.object({ title: s(120), summary: s(240), objective: s(240), minutes: z.number().int().min(3).max(40) })).min(1).max(8),
});

export type LessonOut = z.infer<typeof LessonSchema>;

/** The quality gates (Hermes TOOLKIT QG-S2/S5/S7): a real picture or interactive, a learner action, keys that resolve. */
export function gateLesson(l: LessonOut): string[] {
  const problems: string[] = [];
  const hasVisual = l.scenes.some((sc) => sc.kind === "interactive" || (sc.kind === "slide" && sc.blocks.some((b) => b.type === "visual")));
  if (!hasVisual) problems.push("no picture or interactive");
  if (!l.scenes.some((sc) => sc.kind === "quiz" || sc.kind === "interactive")) problems.push("no learner action");
  for (const sc of l.scenes) {
    if (sc.kind === "quiz") for (const q of sc.questions) if (q.answer >= q.choices.length || new Set(q.choices).size !== q.choices.length) problems.push(`bad key in "${q.prompt.slice(0, 40)}"`);
    if (sc.kind === "interactive") {
      const w = sc.widget;
      if (w.kind === "fraction-bar" && (w.shaded > w.parts || (w.target && w.target.shaded > w.target.parts))) problems.push("fraction bar out of range");
      if (w.kind === "number-line" && (w.min >= w.max || w.start < w.min || w.start > w.max || (w.target !== undefined && (w.target < w.min || w.target > w.max)))) problems.push("number line out of range");
      if (w.kind === "sorter" && w.items.some((i) => i.answer >= w.categories.length)) problems.push("sorter key out of range");
    }
    if (sc.kind === "slide")
      for (const b of sc.blocks) if (b.type === "visual" && b.visual.kind === "fraction" && b.visual.shaded > b.visual.parts) problems.push("fraction picture out of range");
  }
  return problems;
}

export const PracticeSchema = z.object({
  items: z
    .array(z.object({ prompt: s(300), choices: z.array(s(140)).min(3).max(4), answer: z.number().int().min(0).max(3), hints: z.array(s(240)).length(3), explain: s(400) }))
    .min(3)
    .max(10),
});

export const ExtractSchema = z.object({
  events: z.array(z.object({ title: s(160), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), kind: z.enum(["test", "quiz", "homework", "project", "no-school", "event"]), notes: z.string().max(300).optional() })).max(80),
  topics: z.array(s(80)).max(20),
  /** Skill ids from the list given, most relevant first. */
  skillIds: z.array(z.string().max(60)).max(6),
  /** Every guess the reader made, said plainly (e.g. "No year given; assumed 2026"). */
  notes: z.array(s(200)).max(20),
});
