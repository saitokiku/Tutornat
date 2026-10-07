import { titleFromGoal } from "./courses";
import { newId } from "./store";
import type { CourseLength, GenerationEvent, GenerationRequest, Grade, Lesson, Locale, Subject } from "./types";

// Demo outline generator. Same event shape as OpenMAIC's scene-outlines-stream (one outline item per
// event, cancelled by abort) so the real generator drops in behind generateOutline() later.
// It writes a fixed, honest template — the UI labels the result "Template outline".

const KEYWORDS: Record<Exclude<Subject, "other">, RegExp> = {
  math: /fraction|number|add|subtract|multipl|divi|algebra|equation|geometr|angle|area|slope|function|graph|decimal|percent|ratio|count|math|integer|negativ|probab|statistic|matem|fracci|suma|resta|número/i,
  science:
    /scien|cell|plant|animal|moon|sun|planet|energy|force|matter|water cycle|weather|volcan|atom|chemi|ecosystem|body|light|sound|electric|magnet|gravity|ciencia|célula|planta|luna|tierra|agua/i,
  english:
    /read|writ|essay|story|poem|grammar|sentence|paragraph|main idea|argument|speech|rhetoric|vocab|spell|phonic|letter|book|character|author|persua|leer|escrib|cuento|ensayo|lectura/i,
};

export function guessSubject(goal: string): Subject {
  for (const s of ["math", "science", "english"] as const) if (KEYWORDS[s].test(goal)) return s;
  return "other";
}

const TEMPLATES: Record<Locale, Record<CourseLength, [string, string][]>> = {
  en: {
    lesson: [["{topic}: see it, try it, check it", "One picture of the idea, a chance to try it, and a quick check."]],
    short: [
      ["Start here: {topic}", "What it is, shown in one picture, and where you've already seen it."],
      ["See how it works", "The idea step by step, with pictures you can move."],
      ["Try it yourself", "Practice with a hint ready when you need one."],
      ["Use it", "Put it to work on a real problem, then check what you know."],
    ],
    full: [
      ["Start here: {topic}", "What it is, shown in one picture, and where you've already seen it."],
      ["What you already know", "Connect it to things you can already do."],
      ["See how it works", "The idea step by step, with pictures you can move."],
      ["Step by step", "Slow down on the part that usually trips people up."],
      ["Try it yourself", "Practice with a hint ready when you need one."],
      ["Common mix-ups", "Spot the mistakes people often make, and why they happen."],
      ["Use it", "Put it to work on a real problem."],
      ["Show what you know", "A short check on your own, no hints."],
    ],
  },
  es: {
    lesson: [["{topic}: míralo, pruébalo, revísalo", "Una imagen de la idea, una oportunidad para probarla y una pregunta rápida."]],
    short: [
      ["Empieza aquí: {topic}", "Qué es, en una imagen, y dónde ya lo has visto."],
      ["Mira cómo funciona", "La idea paso a paso, con imágenes que puedes mover."],
      ["Pruébalo tú", "Práctica con una pista lista cuando la necesites."],
      ["Úsalo", "Úsalo en un problema real y revisa lo que sabes."],
    ],
    full: [
      ["Empieza aquí: {topic}", "Qué es, en una imagen, y dónde ya lo has visto."],
      ["Lo que ya sabes", "Conéctalo con cosas que ya sabes hacer."],
      ["Mira cómo funciona", "La idea paso a paso, con imágenes que puedes mover."],
      ["Paso a paso", "Más despacio en la parte que suele confundir."],
      ["Pruébalo tú", "Práctica con una pista lista cuando la necesites."],
      ["Errores comunes", "Los errores que mucha gente comete y por qué pasan."],
      ["Úsalo", "Úsalo en un problema real."],
      ["Demuestra lo que sabes", "Una revisión corta tú solo, sin pistas."],
    ],
  },
};

const MINUTES = (g: Grade) => (g === "adult" || g === "9" ? 15 : g === "K" || Number(g) <= 2 ? 8 : Number(g) <= 5 ? 10 : 12);

export function templateLessons(req: GenerationRequest): Lesson[] {
  const topic = titleFromGoal(req.goal) || req.sources[0]?.name || "";
  return TEMPLATES[req.locale][req.length].map(([title, summary]) => ({
    id: newId(),
    title: title.replace("{topic}", topic),
    summary,
    minutes: MINUTES(req.grade),
    scenes: [],
  }));
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted || ms <= 0) return resolve();
    const id = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(id), resolve()), { once: true });
  });
}

export async function* generateOutline(req: GenerationRequest, signal: AbortSignal, pace = 550): AsyncGenerator<GenerationEvent> {
  const steps: GenerationEvent[] = [{ type: "step", step: "reading" }, { type: "step", step: "planning" }, { type: "step", step: "writing" }];
  const events: GenerationEvent[] = [...steps, ...templateLessons(req).map((lesson) => ({ type: "lesson" as const, lesson })), { type: "done" }];
  for (const event of events) {
    await sleep(pace, signal);
    if (signal.aborted) return;
    yield event;
  }
}
