// @vitest-environment node
// Scratch probe against live sources. Never committed.
import { it } from "vitest";
import { define, related, searchBooks, wikiSummary } from "@/knowledge";
import { buildSourceCourse, type Fetchers } from "./source-course";
import type { Grade, Locale } from "./types";

const live: Fetchers = {
  wiki: (t, l) => wikiSummary(t, l),
  related: (w) => related(w),
  define: (w) => define(w),
  books: (q) => searchBooks(q),
};

const CASES: [string, Grade, Locale][] = (process.env.PROBE ?? "volcanoes|4|en;volcanoes|K|en;sharks|1|en;donkeys|1|en;dinosaurs|2|en;volcanes|4|es;Mercury (planet)|5|en;the water cycle|5|en;knitting|4|en")
  .split(";")
  .map((c) => c.split("|") as [string, Grade, Locale]);

it("probe", { timeout: 120_000 }, async () => {
  for (const [goal, grade, locale] of CASES) {
    const steps: unknown[] = [];
    const course = await buildSourceCourse(goal, grade, locale, live, { length: (process.env.LEN as "short") ?? "short", onStep: (s) => steps.push(s) });
    console.log(`\n===== ${goal} | ${grade} | ${locale} | subject ${course.subject}`);
    for (const s of steps) console.log("  step", JSON.stringify(s));
    for (const l of course.lessons) {
      console.log(`  # ${l.title} (${l.minutes} min) — ${l.summary}`);
      for (const sc of l.scenes) {
        if (sc.kind === "slide") console.log(`     [slide] ${sc.title}: ${sc.blocks.map((b) => (b.type === "text" ? b.text : b.type === "points" ? b.items.join(" / ") : b.alt)).join(" | ").slice(0, 900)}`);
        if (sc.kind === "quiz") for (const q of sc.questions) console.log(`     [quiz ${sc.title}] ${q.prompt} :: ${q.choices.join(" / ")} -> ${q.choices[q.answer]}`);
        if (sc.kind === "project") console.log(`     [project] ${sc.steps.join(" / ")}`);
      }
    }
    console.log("  citations", course.citations?.map((c) => `${c.source}: ${c.title}`).join(" ; "));
  }
});
