import { titleFromGoal } from "./courses";
import { newId } from "./store";
import type { CourseLength, GenerationEvent, GenerationRequest, Grade, Lesson, Locale, Subject } from "./types";

// Demo outline generator. Same event shape as OpenMAIC's scene-outlines-stream (one outline item per
// event, cancelled by abort) so the real generator drops in behind generateOutline() later.
// It writes a fixed, honest template — the UI labels the result "Template outline".

const KEYWORDS: Record<Exclude<Subject, "other">, RegExp> = {
  math: /fraction|number|add|subtract|multipl|divi|algebra|equation|geometr|angle|area|slope|function|graph|decimal|percent|ratio|count|math|integer|negativ|probab|statistic|matem|fracci|suma|resta|número/i,
  science:
    /scien|cell|plant|animal|dinosaur|fossil|insect|\bbugs?\b|bird|ocean|rock|moon|sun|\bstars?\b|space|planet|energy|force|matter|water cycle|weather|climate|earthquake|volcan|atom|chemi|ecosystem|body|bones|germ|light|sound|electric|magnet|gravity|ciencia|célula|planta|animal|dinosaurio|luna|tierra|agua|espacio/i,
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

/** Gives every scene, question and sorter item an id, as the lesson stage expects. */
export function withIds(raw: Omit<Lesson, "id" | "scenes"> & { id?: string; scenes: unknown[] }): Lesson {
  const scenes = (raw.scenes as Record<string, unknown>[]).map((sc) => {
    const scene = { ...sc, id: newId() } as Record<string, unknown>;
    if (scene.kind === "quiz") scene.questions = (scene.questions as Record<string, unknown>[]).map((q) => ({ ...q, id: newId() }));
    if (scene.kind === "interactive" && (scene.widget as { kind: string }).kind === "sorter") {
      const w = scene.widget as { items: Record<string, unknown>[] };
      scene.widget = { ...w, items: w.items.map((i) => ({ ...i, id: newId() })) };
    }
    return scene;
  });
  return { ...raw, id: raw.id ?? newId(), scenes } as Lesson;
}

/** Reads the AI course stream (one JSON event per line) from /api/ai/course. */
async function* aiOutline(req: GenerationRequest, signal: AbortSignal): AsyncGenerator<GenerationEvent> {
  let res: Response;
  try {
    res = await fetch("/api/ai/course", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...req, sources: req.sources.map((s) => ({ name: s.name, kind: s.kind })) }),
      signal,
    });
  } catch {
    if (!signal.aborted) yield { type: "error", error: "network" };
    return;
  }
  if (!res.ok || !res.body) return yield { type: "error", error: res.status === 429 ? "rate" : "model" };
  yield { type: "mode", ai: true };
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read().catch(() => ({ done: true, value: undefined }));
    if (done) break;
    buf += value;
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      const e = JSON.parse(line) as { type: string; step?: "planning" | "writing"; lesson?: Parameters<typeof withIds>[0]; title?: string; error?: string };
      if (e.type === "step") yield { type: "step", step: e.step! };
      else if (e.type === "lesson") yield { type: "lesson", lesson: withIds(e.lesson!) };
      else if (e.type === "skipped") yield { type: "skipped", title: e.title! };
      else if (e.type === "error") yield { type: "error", error: e.error ?? "model" };
      else if (e.type === "done") yield { type: "done" };
    }
  }
}

export async function* generateOutline(req: GenerationRequest, signal: AbortSignal, pace = 550, ai = false): AsyncGenerator<GenerationEvent> {
  if (ai) {
    yield { type: "step", step: "reading" };
    yield* aiOutline(req, signal);
    return;
  }
  const steps: GenerationEvent[] = [{ type: "step", step: "reading" }, { type: "step", step: "planning" }, { type: "step", step: "writing" }];
  const events: GenerationEvent[] = [...steps, ...templateLessons(req).map((lesson) => ({ type: "lesson" as const, lesson })), { type: "done" }];
  for (const event of events) {
    await sleep(pace, signal);
    if (signal.aborted) return;
    yield event;
  }
}
