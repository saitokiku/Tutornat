import { wrapLanguageModel } from "ai";
import { describe, expect, it } from "vitest";
import { cachedCourse, writeCourse, type CourseEvent, type CourseRequest } from "@/lib/ai/build";
import { metered } from "@/lib/ai/config";
import { LessonSchema, WidgetSchema, type LessonOut } from "@/lib/ai/schemas";
import { VisualInput } from "@/lib/ai/tools";
import { costUsd } from "@/lib/server/budget";
import { mockWriter, type Sample } from "./mock-writer";
import { realModel, REAL, runs } from "./models";
import { pct, usd, writeReport } from "./report";

// The course writer over a fixed sample (plan task 3.2): 30 goals × 3 grade bands, one lesson each,
// through the real writer, schema and gates. It answers three questions for tuning:
//   - do the schema and the gates agree with what the writer is asked for (no schema failures, and
//     every rejection names a rule in WRITER)?
//   - how often does a lesson pass the gates on the first try (bar: 80%), and why does it not?
//   - does the next family asking for the same course get it from the cache, instantly, with no call?

const SAMPLES: Sample[] = [
  { goal: "fractions on a number line", subject: "math", locale: "en" },
  { goal: "telling time to the half hour", subject: "math", locale: "en" },
  { goal: "place value to 100", subject: "math", locale: "en" },
  { goal: "adding with regrouping", subject: "math", locale: "en" },
  { goal: "multiplication as equal groups", subject: "math", locale: "en" },
  { goal: "area of rectangles", subject: "math", locale: "en" },
  { goal: "negative numbers", subject: "math", locale: "en" },
  { goal: "las fracciones equivalentes", subject: "math", locale: "es" },
  { goal: "razones y tasas", subject: "math", locale: "es" },
  { goal: "ecuaciones de un paso", subject: "math", locale: "es" },
  { goal: "the water cycle", subject: "science", locale: "en" },
  { goal: "phases of the Moon", subject: "science", locale: "en" },
  { goal: "states of matter", subject: "science", locale: "en" },
  { goal: "how plants make food", subject: "science", locale: "en" },
  { goal: "food chains", subject: "science", locale: "en" },
  { goal: "magnets", subject: "science", locale: "en" },
  { goal: "volcanoes", subject: "science", locale: "en" },
  { goal: "el sistema solar", subject: "science", locale: "es" },
  { goal: "los huesos del cuerpo", subject: "science", locale: "es" },
  { goal: "el tiempo y las estaciones", subject: "science", locale: "es" },
  { goal: "rhyming words", subject: "english", locale: "en" },
  { goal: "nouns and verbs", subject: "english", locale: "en" },
  { goal: "the main idea of a paragraph", subject: "english", locale: "en" },
  { goal: "commas in a list", subject: "english", locale: "en" },
  { goal: "similes and metaphors", subject: "english", locale: "en" },
  { goal: "fact and opinion", subject: "english", locale: "en" },
  { goal: "writing a strong topic sentence", subject: "english", locale: "en" },
  { goal: "prefijos y sufijos", subject: "english", locale: "es" },
  { goal: "la escritura persuasiva", subject: "english", locale: "es" },
  { goal: "las pistas de contexto", subject: "english", locale: "es" },
];
const BANDS = [
  { grade: "1", band: "K–2" },
  { grade: "4", band: "3–5" },
  { grade: "7", band: "6–9" },
];

type Row = { goal: string; band: string; locale: string; lessons: number; skipped: number; retried: boolean; reasons: string[]; schemaError?: string; cached: boolean; cacheMs: number; rejectedDrafts: unknown[] };

const parsed = (text: string) => {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

// Every picture and interactive kind the schema lets the writer use; the sample must pass the gates
// with each of them, or a gate is refusing something the schema allows.
const kindsOf = (u: { options: readonly { shape: { kind: { value: string } } }[] }) => u.options.map((o) => o.shape.kind.value).sort();
const VISUALS = kindsOf(VisualInput);
const WIDGETS = kindsOf(WidgetSchema);

function kindsUsed(lessons: LessonOut[]) {
  const visuals = new Set<string>();
  const widgets = new Set<string>();
  for (const sc of lessons.flatMap((l) => l.scenes)) {
    if (sc.kind === "slide") for (const b of sc.blocks) if (b.type === "visual") visuals.add(b.visual.kind);
    if (sc.kind === "interactive") widgets.add(sc.widget.kind);
  }
  return { visuals: [...visuals].sort(), widgets: [...widgets].sort() };
}

const promptText = (prompt: { content: unknown }[]) =>
  prompt.map((m) => (typeof m.content === "string" ? m.content : (m.content as { text?: string }[]).map((p) => p.text ?? "").join(" "))).join("\n");

describe.skipIf(!runs("writer"))("course writer sample", () => {
  it("30 goals × 3 bands pass the gates, mostly first try, and come back from the cache", async () => {
    const real = REAL ? await realModel("build") : null;
    const base = real ?? mockWriter(SAMPLES);
    const priceAs = real ? real.modelId : "claude-opus-5-5";
    let calls = 0;
    let cost = 0;
    let retryPrompts: string[] = [];
    let drafts: { retry: boolean; output: string }[] = [];
    const model = metered(
      wrapLanguageModel({
        model: base,
        middleware: {
          wrapGenerate: async ({ doGenerate, params }) => {
            const text = promptText(params.prompt);
            const retry = text.includes("was rejected for:");
            if (retry) retryPrompts.push(text);
            const r = await doGenerate();
            if (/Write lesson \d+ of/.test(text)) drafts.push({ retry, output: r.content.flatMap((c) => (c.type === "text" ? [c.text] : [])).join("") });
            return r;
          },
        },
      }),
      { start: () => calls++, usage: (_, u) => (cost += costUsd(priceAs, u)) },
    );

    const rows: Row[] = [];
    const passedLessons: LessonOut[] = [];
    for (const s of SAMPLES)
      for (const b of BANDS) {
        const req: CourseRequest = { goal: s.goal, grade: b.grade, subject: s.subject, length: "lesson", locale: s.locale };
        retryPrompts = [];
        drafts = [];
        const events: CourseEvent[] = [];
        let schemaError: string | undefined;
        try {
          for await (const e of writeCourse(req, model)) events.push(e);
        } catch (err) {
          schemaError = (err as Error).message.slice(0, 200);
        }
        for (const e of events)
          if (e.type === "lesson") {
            expect(LessonSchema.safeParse(e.lesson).success).toBe(true);
            passedLessons.push(e.lesson);
          }
        const before = calls;
        const t0 = performance.now();
        const hit = cachedCourse(req);
        const cacheMs = performance.now() - t0;
        expect(calls, "a cache hit makes no model call").toBe(before);
        rows.push({
          goal: s.goal,
          band: b.band,
          locale: s.locale,
          lessons: events.filter((e) => e.type === "lesson").length,
          skipped: events.filter((e) => e.type === "skipped").length,
          retried: retryPrompts.length > 0,
          reasons: retryPrompts.flatMap((p) => (/was rejected for: ([\s\S]*?)\. Fix that\./.exec(p)?.[1] ?? "").split("; ").filter(Boolean)),
          schemaError,
          cached: !!hit,
          cacheMs,
          rejectedDrafts: drafts.filter((d, i) => drafts[i + 1]?.retry || (i === drafts.length - 1 && !events.some((e) => e.type === "lesson"))).map((d) => parsed(d.output)),
        });
      }

    const attempted = rows.filter((r) => !r.schemaError);
    const firstTry = attempted.filter((r) => r.lessons === 1 && !r.retried).length / attempted.length;
    const passed = attempted.filter((r) => r.lessons === 1).length / attempted.length;
    const reasons: Record<string, number> = {};
    for (const r of rows) for (const why of r.reasons) reasons[why.replace(/".*"/, '"…"')] = (reasons[why.replace(/".*"/, '"…"')] ?? 0) + 1;
    const used = kindsUsed(passedLessons);
    const notUsed = (all: string[], seen: string[]) => all.filter((k) => !seen.includes(k));
    const summary = {
      mode: real ? `real model (${real.modelId})` : "mock writer",
      courses: rows.length,
      firstTryPassRate: firstTry,
      passRate: passed,
      skipped: rows.reduce((a, r) => a + r.skipped, 0),
      schemaFailures: rows.filter((r) => r.schemaError).length,
      cachedAfterwards: rows.filter((r) => r.cached).length,
      slowestCacheHitMs: Math.max(...rows.filter((r) => r.cached).map((r) => r.cacheMs), 0),
      modelCalls: calls,
      costTotalUsd: cost,
      rejections: reasons,
      pictureKindsPassed: used.visuals,
      interactiveKindsPassed: used.widgets,
    };
    const md = [
      `# Course writer sample — ${summary.mode}`,
      "",
      new Date().toISOString(),
      "",
      `- Lessons passing the gates on the first try: **${pct(firstTry)}** — bar: 80%`,
      `- Lessons passing after the one retry: ${pct(passed)}; skipped and named to the family: ${summary.skipped}`,
      `- Outputs the schema refused: ${summary.schemaFailures}`,
      `- Courses served from the cache on the second request: ${summary.cachedAfterwards} / ${rows.length}, slowest ${summary.slowestCacheHitMs.toFixed(2)} ms, no model calls`,
      real ? `- Model calls: ${calls}; estimated cost ${usd(cost)} from the provider's token counts at list price` : `- Model calls: ${calls}; mock token counts, not a cost estimate (${usd(cost)} if billed as claude-opus-5-5)`,
      `- Picture kinds in passing lessons: ${used.visuals.length} / ${VISUALS.length}${notUsed(VISUALS, used.visuals).length ? ` (never passed: ${notUsed(VISUALS, used.visuals).join(", ")})` : ""}; interactive kinds: ${used.widgets.length} / ${WIDGETS.length}${notUsed(WIDGETS, used.widgets).length ? ` (never passed: ${notUsed(WIDGETS, used.widgets).join(", ")})` : ""}`,
      "",
      "## Why first drafts were rejected",
      "",
      ...(Object.keys(reasons).length ? Object.entries(reasons).sort((a, b) => b[1] - a[1]).map(([why, n]) => `- ${why}: ${n}`) : ["- none"]),
      "",
      "## Sample",
      "",
      "| Goal | Band | Language | Result |",
      "|---|---|---|---|",
      ...rows.map((r) => `| ${r.goal} | ${r.band} | ${r.locale} | ${r.schemaError ? `schema refused: ${r.schemaError}` : r.lessons ? (r.retried ? `passed on retry (${r.reasons.join("; ")})` : "passed first try") : `skipped (${r.reasons.join("; ")})`} |`),
      "",
    ].join("\n");
    const out = writeReport("writer", { summary, rows }, md);
    process.stdout.write(`\nWriter sample (${summary.mode}): ${pct(firstTry)} first try, ${pct(passed)} after retry, ${summary.cachedAfterwards}/${rows.length} cached. Report: ${out}writer.md\n`);

    expect(rows).toHaveLength(90);
    expect(firstTry).toBeGreaterThanOrEqual(0.8);
    if (!real) {
      // The mock follows the schema exactly, so every rejection must be a rule the writer was given.
      expect(summary.schemaFailures).toBe(0);
      expect(passed).toBe(1);
      expect(summary.cachedAfterwards).toBe(90);
      expect(summary.slowestCacheHitMs).toBeLessThan(50);
      // Every kind the schema allows passed the gates somewhere in the sample.
      expect(used.visuals).toEqual(VISUALS);
      expect(used.widgets).toEqual(WIDGETS);
      expect(Object.keys(reasons).sort()).toEqual(['does not start by showing the idea', 'exclamation mark', 'hint gives the answer in "…"', "no quiz to check it"]);
    }
  });
});
