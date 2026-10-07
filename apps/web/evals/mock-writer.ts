import { MockLanguageModelV4 } from "ai/test";
import type { LessonOut } from "@/lib/ai/schemas";

// A stand-in for the course writer: from the prompt alone (goal, grade, language, lesson title) it
// writes a lesson in the shape LessonSchema asks for, following the writer's rules, so the gates can
// be run over a 30-goal × 3-band sample without a key. Like a real model, it sometimes gets a rule
// wrong on the first draft (every tenth sample) and fixes it when told why the draft was rejected.

export type Subject = "math" | "science" | "english";
export type Sample = { goal: string; subject: Subject; locale: "en" | "es" };

type Prompt = Parameters<MockLanguageModelV4["doGenerate"]>[0]["prompt"];
const textOf = (prompt: Prompt) => prompt.map((m) => (typeof m.content === "string" ? m.content : m.content.map((p) => ("text" in p ? p.text : "")).join(" "))).join("\n");

const WORDS = {
  en: {
    see: "See it",
    tryIt: "Try it",
    check: "Check it",
    use: "Use it at home",
    summary: (t: string) => `See ${t}, try it, then check it.`,
    look: (t: string) => `This picture shows ${t}.`,
    point: (t: string) => [`${t} is the idea of this lesson.`, "Look at the picture first.", "Then try it with your hands."],
    question: "Which one fits the picture?",
    hint: "Look at the picture again and count the parts.",
    explain: "The picture shows it, part by part.",
    alt: "A picture of the idea, with each part labelled.",
    sortPrompt: "Put each card in the group where it belongs.",
    lineStart: "Move the point to the mark shown.",
    barPrompt: "Shade the parts that match.",
    warmPrompt: "Warm the water and watch what the particles do.",
    moonPrompt: "Move the days forward and watch how much of the Moon is lit.",
    brief: "Find this idea in your home with a grown-up.",
    steps: ["Look around one room.", "Point to one example.", "Tell a grown-up what you found."],
    groups: ["Fits", "Does not fit"],
    items: ["the first card", "the second card", "the third card", "the fourth card"],
    choices: ["The first one", "The second one"],
  },
  es: {
    see: "Míralo",
    tryIt: "Pruébalo",
    check: "Revísalo",
    use: "Úsalo en casa",
    summary: (t: string) => `Mira ${t}, pruébalo y luego revísalo.`,
    look: (t: string) => `Este dibujo muestra ${t}.`,
    point: (t: string) => [`${t} es la idea de esta lección.`, "Mira el dibujo primero.", "Luego pruébalo con tus manos."],
    question: "¿Cuál va con el dibujo?",
    hint: "Mira el dibujo otra vez y cuenta las partes.",
    explain: "El dibujo lo muestra, parte por parte.",
    alt: "Un dibujo de la idea, con cada parte rotulada.",
    sortPrompt: "Pon cada tarjeta en el grupo que le toca.",
    lineStart: "Mueve el punto a la marca que ves.",
    barPrompt: "Sombrea las partes que van.",
    warmPrompt: "Calienta el agua y mira qué hacen las partículas.",
    moonPrompt: "Avanza los días y mira cuánto de la Luna se ve iluminado.",
    brief: "Busca esta idea en tu casa con un adulto.",
    steps: ["Mira un cuarto de la casa.", "Señala un ejemplo.", "Dile a un adulto qué encontraste."],
    groups: ["Va", "No va"],
    items: ["la primera tarjeta", "la segunda tarjeta", "la tercera tarjeta", "la cuarta tarjeta"],
    choices: ["El primero", "El segundo"],
  },
};

type Visual = (Extract<LessonOut["scenes"][number], { kind: "slide" }>["blocks"][number] & { type: "visual" })["visual"];
type Widget = Extract<LessonOut["scenes"][number], { kind: "interactive" }>["widget"];

/** The picture a writer would draw for this goal; younger learners get the counting pictures. */
function picture(goal: string, young: boolean): Visual {
  const g = goal.toLowerCase();
  if (/fraction|fracci/.test(g)) return { kind: "fraction", parts: 4, shaded: 1 };
  if (/time|hora|reloj/.test(g)) return { kind: "clock", h: 3, m: 30 };
  if (/place value|valor posicional/.test(g)) return { kind: "base-ten", tens: 4, ones: 7 };
  if (/regroup|reagrup|adding|suma/.test(g)) return young ? { kind: "ten-frame", filled: 13, frames: 2 } : { kind: "column", op: "+", top: 27, bottom: 15 };
  if (/multipl|groups|grupos/.test(g)) return young ? { kind: "dots", groups: [3, 3, 3] } : { kind: "array", rows: 3, cols: 4 };
  if (/area|área/.test(g)) return { kind: "rect", w: 5, h: 3, unit: "cm" };
  if (/moon|luna/.test(g)) return { kind: "moon", phase: 0.5 };
  if (/water|matter|agua|materia/.test(g)) return { kind: "particles", state: "liquid" };
  if (/ratio|raz/.test(g)) return { kind: "coord", points: [[1, 2], [2, 4], [3, 6]], line: true };
  return { kind: "number-line", min: -5, max: 5, marks: [-2, 0, 3] };
}

/** The interactive for this goal: a manipulative where one fits, else sorting cards. */
function widget(s: Sample, w: (typeof WORDS)["en"]): { prompt: string; widget: Widget } {
  const g = s.goal.toLowerCase();
  if (s.subject === "math")
    return /fraction|fracci/.test(g)
      ? { prompt: w.barPrompt, widget: { kind: "fraction-bar", parts: 4, shaded: 0, target: { parts: 4, shaded: 1 } } }
      : { prompt: w.lineStart, widget: { kind: "number-line", min: -5, max: 5, step: 1, start: 0, target: 3 } };
  if (/water|matter|agua|materia/.test(g)) return { prompt: w.warmPrompt, widget: { kind: "states-of-matter", startC: 20, target: "gas" } };
  if (/moon|luna/.test(g)) return { prompt: w.moonPrompt, widget: { kind: "moon-phases", target: 15 } };
  return { prompt: w.sortPrompt, widget: { kind: "sorter", categories: w.groups, items: w.items.map((text, i) => ({ text, answer: i % 2 })) } };
}

/** One lesson for the sample, clean or with the first-draft mistake for this sample. */
export function lessonFor(s: Sample, title: string, young: boolean, mistake: number | null): LessonOut {
  const w = WORDS[s.locale];
  const topic = title.toLowerCase();
  const show: LessonOut["scenes"][number] =
    s.subject === "english"
      ? { kind: "slide", title: w.see, blocks: [{ type: "points", items: w.point(title) }] }
      : { kind: "slide", title: w.see, blocks: [{ type: "visual", visual: picture(s.goal, young), alt: w.alt }, { type: "text", text: w.look(topic) }] };
  const act: LessonOut["scenes"][number] = { kind: "interactive", title: w.tryIt, ...widget(s, w) };
  const quiz: LessonOut["scenes"][number] = {
    kind: "quiz",
    title: w.check,
    questions: [{ prompt: w.question, choices: young ? w.choices.map((c) => c.split(" ").slice(0, 3).join(" ")) : w.choices, answer: 0, hint: w.hint, explain: w.explain }],
  };
  const scenes: LessonOut["scenes"] = [show, act, quiz];
  if (!young) scenes.push({ kind: "project", title: w.use, brief: w.brief, steps: w.steps });
  const lesson: LessonOut = { title, summary: w.summary(topic), minutes: young ? 8 : 12, scenes };
  // The first-draft mistakes a real writer makes most: an exclamation mark, a hint that names the
  // right choice, and a check placed before anything is shown.
  if (mistake === 0) return { ...lesson, summary: `${lesson.summary.slice(0, -1)}!` };
  if (mistake === 1) return { ...lesson, scenes: [show, act, { ...quiz, questions: [{ ...quiz.questions[0], hint: `${w.hint} ${quiz.questions[0].choices[0]}.` }] }] };
  if (mistake === 2) return { ...lesson, scenes: [quiz, show, act] };
  return lesson;
}

export function mockWriter(samples: Sample[]) {
  const bySample = (prompt: string) => samples.findIndex((s) => prompt.includes(`"${s.goal}"`));
  return new MockLanguageModelV4({
    provider: "mock",
    modelId: "mock-writer",
    doGenerate: async ({ prompt }) => {
      const text = textOf(prompt);
      const i = bySample(text);
      const s = samples[i];
      const young = /kindergarten to grade 2/.test(text);
      const plan = /Plan a course of exactly (\d+)/.exec(text);
      let out: unknown;
      if (plan) {
        out = { title: s.goal[0].toUpperCase() + s.goal.slice(1), lessons: Array.from({ length: Number(plan[1]) }, (_, n) => ({ title: n ? `${s.goal} (${n + 1})` : s.goal, summary: s.goal, objective: s.goal, minutes: young ? 8 : 12 })) };
      } else {
        const title = /Write lesson \d+ of \d+: "(.*?)"/.exec(text)?.[1] ?? s.goal;
        const band = young ? 0 : /grades 3 to 5/.test(text) ? 1 : 2;
        const k = i * 3 + band;
        const retry = text.includes("was rejected for");
        out = lessonFor(s, title, young, !retry && k % 10 === 7 ? Math.floor(k / 10) % 3 : null);
      }
      const json = JSON.stringify(out);
      return {
        content: [{ type: "text", text: json }],
        finishReason: { unified: "stop", raw: undefined },
        usage: { inputTokens: { total: Math.ceil(text.length / 4), noCache: Math.ceil(text.length / 4), cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: Math.ceil(json.length / 4), text: Math.ceil(json.length / 4), reasoning: 0 } },
        warnings: [],
      };
    },
  });
}
