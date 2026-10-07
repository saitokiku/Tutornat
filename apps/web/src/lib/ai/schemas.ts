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

const int = (lo: number, hi: number) => z.number().int().min(lo).max(hi);

export const WidgetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("fraction-bar"), parts: z.number().int().min(2).max(12), shaded: z.number().int().min(0).max(12), target: z.object({ parts: z.number().int().min(2).max(12), shaded: z.number().int().min(0).max(12) }).optional() }),
  z.object({ kind: z.literal("number-line"), min: z.number().min(-20).max(100), max: z.number().min(-19).max(100), step: z.number().positive().max(10), start: z.number(), target: z.number().optional(), denominator: z.number().int().min(2).max(12).optional() }),
  z.object({ kind: z.literal("states-of-matter"), startC: z.number().min(-40).max(140), target: z.enum(["solid", "liquid", "gas"]).optional() }),
  z.object({ kind: z.literal("moon-phases"), target: z.number().int().min(0).max(29).optional() }),
  z
    .object({ kind: z.literal("sorter"), categories: z.array(s(40)).min(2).max(3), items: z.array(z.object({ text: s(120), answer: z.number().int().min(0).max(2) })).min(3).max(6) })
    .describe("Tap each item into a category. A word sort is a sorter whose items are single words."),
  z
    .object({ kind: z.literal("area-model"), rows: int(1, 12), cols: int(1, 12), target: z.object({ rows: int(1, 12), cols: int(1, 12) }).optional() })
    .describe("Multiplication as area: the learner sets rows and columns of unit squares. target is the exact rows and cols the prompt asks for; start somewhere else."),
  z
    .object({ kind: z.literal("place-value"), target: int(1, 999), max: int(9, 999).optional() })
    .describe("Build target from hundreds, tens and ones blocks (0 to 9 of each). max is the largest number allowed, at least target."),
  z
    .object({ kind: z.literal("clock"), h: int(1, 12), m: int(0, 59), target: z.object({ h: int(1, 12), m: int(0, 59) }).optional() })
    .describe("An analog clock starting at h:m; the learner sets the hands to target (12-hour). Use minutes in fives unless the lesson needs single minutes."),
  z
    .object({ kind: z.literal("balance"), xCount: int(1, 5), leftUnits: int(0, 20), rightUnits: int(1, 40) })
    .describe("A balance for xCount·x + leftUnits = rightUnits. x must come out a whole number of at least 1; the learner takes the same from both sides until x stands alone."),
  z
    .object({ kind: z.literal("coordinate"), min: int(-10, 0), max: int(1, 10), targets: z.array(z.tuple([int(-10, 10), int(-10, 10)])).min(1).max(4) })
    .describe("A grid from min to max on both axes. The learner plots exactly the target points [x, y], all inside the grid, no repeats."),
  z
    .object({ kind: z.literal("sequence"), items: z.array(z.object({ id: s(24), text: s(120) })).min(3).max(6) })
    .describe("Steps to put in order, listed in the right order, each with a unique short id. The learner sees them scrambled."),
  z
    .object({ kind: z.literal("sentence-builder"), words: z.array(s(30)).min(2).max(12), answers: z.array(z.array(s(30)).min(1).max(12)).min(1).max(4) })
    .describe("Word tiles (punctuation stays on its word, e.g. 'seed.'). answers lists every right word order, using only the given words (extra words are allowed as distractors)."),
]);

type WidgetOut = z.infer<typeof WidgetSchema>;

/** The interactives line for the lesson writer's instructions (lib/ai/build.ts WRITER). */
export const WIDGET_GUIDE = [
  "Interactives use only: fraction-bar, number-line, states-of-matter, moon-phases, sorter, area-model, place-value, clock, balance, coordinate, sequence, sentence-builder.",
  "A sorter has 2 or 3 categories and 3 to 6 items; each item's answer is the index of its category (a word sort is a sorter of single words).",
  "area-model: the target is the exact rows and columns asked for, and the start is different. place-value: target from 1 to 999.",
  "clock: 12-hour times; the start differs from the target. balance: xCount·x + leftUnits = rightUnits with x a whole number of at least 1.",
  "coordinate: every target point inside min..max on both axes, no repeats. sequence: items in the right order with unique ids.",
  "sentence-builder: answers use only the given words; list every word order that is right.",
].join(" ");

const count = (list: readonly string[]) => list.reduce((m, w) => m.set(w, (m.get(w) ?? 0) + 1), new Map<string, number>());
const onStep = (v: number, min: number, step: number) => Math.abs((v - min) / step - Math.round((v - min) / step)) < 1e-9;

/**
 * Why a manipulative can't be used as written, or [] when it can: every target in range and reachable,
 * every key resolvable. Used on AI lessons (gateLesson) and on the ready-made catalogue (tests).
 */
export function widgetProblems(w: WidgetOut): string[] {
  const out: string[] = [];
  switch (w.kind) {
    case "fraction-bar":
      if (w.shaded > w.parts || (w.target && w.target.shaded > w.target.parts)) out.push("fraction bar out of range");
      break;
    case "number-line":
      if (w.min >= w.max || w.start < w.min || w.start > w.max || (w.target !== undefined && (w.target < w.min || w.target > w.max))) out.push("number line out of range");
      else if (!onStep(w.start, w.min, w.step) || (w.target !== undefined && !onStep(w.target, w.min, w.step))) out.push("number line target between steps");
      break;
    case "states-of-matter":
      if (w.startC < -30 || w.startC > 130) out.push("states of matter start out of range");
      break;
    case "sorter":
      if (w.items.some((i) => i.answer >= w.categories.length)) out.push("sorter key out of range");
      if (new Set(w.categories).size !== w.categories.length) out.push("sorter categories repeat");
      break;
    case "area-model":
      if (w.target && w.target.rows === w.rows && w.target.cols === w.cols) out.push("area model starts on its target");
      break;
    case "place-value":
      if (w.max !== undefined && w.target > w.max) out.push("place value target above max");
      break;
    case "clock":
      if (w.target && w.target.h === w.h && w.target.m === w.m) out.push("clock starts on its target");
      // The minute hand moves in fives unless the start or target needs single minutes, so any time is reachable.
      break;
    case "balance": {
      const rest = w.rightUnits - w.leftUnits;
      if (rest < w.xCount || rest % w.xCount !== 0) out.push("balance has no whole-number solution of at least 1");
      else if (w.xCount === 1 && w.leftUnits === 0) out.push("balance is already solved");
      break;
    }
    case "coordinate": {
      if (w.min >= w.max) out.push("coordinate grid is empty");
      if (w.targets.some(([x, y]) => x < w.min || x > w.max || y < w.min || y > w.max)) out.push("coordinate target outside the grid");
      if (new Set(w.targets.map(([x, y]) => `${x},${y}`)).size !== w.targets.length) out.push("coordinate targets repeat");
      break;
    }
    case "sequence":
      if (new Set(w.items.map((i) => i.id)).size !== w.items.length) out.push("sequence ids repeat");
      if (new Set(w.items.map((i) => i.text)).size !== w.items.length) out.push("sequence steps repeat");
      break;
    case "sentence-builder": {
      const have = count(w.words);
      if (w.answers.some((a) => [...count(a)].some(([word, n]) => (have.get(word) ?? 0) < n))) out.push("sentence answer uses a word that isn't given");
      if (new Set(w.answers.map((a) => a.join(" "))).size !== w.answers.length) out.push("sentence answers repeat");
      break;
    }
  }
  return out;
}

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
    if (sc.kind === "interactive") problems.push(...widgetProblems(sc.widget).map((p) => `${p} in "${sc.title.slice(0, 40)}"`));
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
