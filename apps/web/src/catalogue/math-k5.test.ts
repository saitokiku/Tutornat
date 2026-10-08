import { describe, expect, it } from "vitest";
import type { InteractiveScene, QuizQuestion, Scene } from "@/lib/types";
import { getSkill } from "@/practice/skills";
import decimals, { practice as decimalsPractice } from "./math-decimals";
import hundreds, { practice as hundredsPractice } from "./math-hundreds-tens-ones";
import hundredsEs from "./math-hundreds-tens-ones-es";
import multiplication, { practice as multiplicationPractice } from "./math-multiplication";
import multiplicationEs from "./math-multiplication-es";
import bigger, { practice as biggerPractice } from "./math-multiply-bigger";
import numbers, { practice as numbersPractice } from "./math-numbers-to-10";
import numbersEs from "./math-numbers-to-10-es";
import type { CatalogueEntry } from "./types";

// The K-5 math courses: every key, sorter answer and widget target is recomputed here from the numbers
// in the question, so a reordered choice or an edited number cannot leave a wrong key behind.

const COURSES: [CatalogueEntry, Record<string, string[]>][] = [
  [numbers, numbersPractice],
  [hundreds, hundredsPractice],
  [multiplication, multiplicationPractice],
  [bigger, biggerPractice],
  [decimals, decimalsPractice],
];
const MIRRORS: [CatalogueEntry, CatalogueEntry][] = [
  [numbers, numbersEs],
  [hundreds, hundredsEs],
  [multiplication, multiplicationEs],
];

/** Exact enough for these sizes: "4 × 1,000 + 200 + 3", "(7 × 5) + (7 × 1)", "0.045 × 100". */
function evaluate(src: string): number {
  const tokens = src.replace(/(\d),(?=\d{3})/g, "$1").match(/\d+(?:\.\d+)?|[×÷+−()]/g) ?? [];
  let i = 0;
  const atom = (): number => {
    const t = tokens[i++];
    if (t !== "(") return Number(t);
    const v = sum();
    i++;
    return v;
  };
  const product = (): number => {
    let v = atom();
    while (tokens[i] === "×" || tokens[i] === "÷") v = tokens[i++] === "×" ? v * atom() : v / atom();
    return v;
  };
  const sum = (): number => {
    let v = product();
    while (tokens[i] === "+" || tokens[i] === "−") v = tokens[i++] === "+" ? v + product() : v - product();
    return v;
  };
  const v = sum();
  if (i !== tokens.length || Number.isNaN(v)) throw new Error(`cannot evaluate "${src}"`);
  return v;
}
const same = (a: number, b: number) => Math.abs(a - b) < 1e-9;
/** n / 10^places written with exactly that many places: d(475, 2) = "4.75". */
const d = (n: number, places: number) => (n / 10 ** places).toFixed(places);
const whole = (n: number) => n.toLocaleString("en-US");
const nums = (s: string) => (s.replace(/(\d),(?=\d{3})/g, "$1").match(/\d+(?:\.\d+)?/g) ?? []).map(Number);

function scene(c: CatalogueEntry, lesson: string, id: string): Scene {
  const s = c.lessons.find((l) => l.id === lesson)?.scenes.find((x) => x.id === id);
  if (!s) throw new Error(`${c.id}/${lesson}/${id} is missing`);
  return s;
}
const quizzes = (c: CatalogueEntry) =>
  c.lessons.flatMap((l) => l.scenes.flatMap((s) => (s.kind === "quiz" ? [{ lesson: l.id, questions: s.questions }] : [])));
const question = (c: CatalogueEntry, lesson: string, id: string): QuizQuestion => {
  const q = quizzes(c).find((x) => x.lesson === lesson)?.questions.find((x) => x.id === id);
  if (!q) throw new Error(`${c.id}/${lesson}/${id} is missing`);
  return q;
};
const key = (q: QuizQuestion) => q.choices[q.answer];
/** The one choice an independent rule picks out; fails unless exactly one choice passes. */
const only = (q: QuizQuestion, rule: (choice: string) => boolean) => {
  const hits = q.choices.filter(rule);
  expect(hits, q.prompt).toHaveLength(1);
  return hits[0];
};

// Every quiz key, recomputed from the question's own numbers (literal only where the key is a sentence).
const KEYS: Record<string, Record<string, (q: QuizQuestion) => string>> = {
  "math-numbers-to-10": {
    "count-to-10/q1": () => String([1, 2, 3, 4, 5].length),
    "count-to-10/q2": () => "6",
    "count-to-10/q3": () => "No",
    "more-and-less/q1": () => String(Math.max(7, 4)),
    "more-and-less/q2": () => String(6 - 1),
    "more-and-less/q3": () => "They have the same",
    "number-pairs/q1": () => String(8 - 5),
    "number-pairs/q2": (q) => only(q, (c) => nums(c)[0] + nums(c)[1] === 5),
    "number-pairs/q3": () => String(4 - 4),
    "make-10/q1": () => String(10 - 6),
    "make-10/q2": () => String(10 - 2),
    "make-10/q3": (q) => only(q, (c) => nums(c)[0] + nums(c)[1] === 10),
  },
  "math-hundreds-tens-ones": {
    "ten-tens/q1": () => String(100 / 10),
    "ten-tens/q2": () => String(10 * 10),
    "ten-tens/q3": () => String(6 * 10 + 4),
    "three-digits/q1": () => String(6 * 10 ** ("362".length - 1 - "362".indexOf("6"))),
    "three-digits/q2": () => String(2 * 100 + 0 * 10 + 7),
    "three-digits/q3": () => String(500 + 30 + 8),
    "skip-count/q1": () => String(452 + 10),
    "skip-count/q2": () => String(608 - 100),
    "skip-count/q3": () => String(390 + 10),
    "compare/q1": () => String(Math.max(389, 412)),
    "compare/q2": (q) => only(q, (c) => ({ ">": 251 > 215, "<": 251 < 215, "=": false })[c.split(" ")[1] as ">" | "<" | "="]),
    "compare/q3": () => (102 > 98 ? "Yes" : "No"),
  },
  "math-multiplication": {
    "equal-groups/q1": (q) => only(q, (c) => evaluate(c) === 3 + 3 + 3 + 3 + 3),
    "equal-groups/q2": () => String(4 * 6),
    "equal-groups/q3": () => "2 bags with 7 marbles in each bag",
    "arrays/q1": () => String(4 * 6),
    "arrays/q2": () => String(3 * 7),
    "arrays/q3": (q) => only(q, (c) => nums(c)[0] * nums(c)[1] === 12),
    "facts-patterns/q1": () => String(5 * 9),
    "facts-patterns/q2": () => String(0 * 8),
    "facts-patterns/q3": (q) => only(q, (c) => Number(c) % 5 === 0),
    "break-apart/q1": (q) => only(q, (c) => c.split(" and ").reduce((s, part) => s + evaluate(part), 0) === 6 * 8),
    "break-apart/q2": () => String(9 * 7),
    "break-apart/q3": () => String(4 * 7),
  },
  "math-multiply-bigger": {
    "tens-hundreds/q1": () => whole(8 * 50),
    "tens-hundreds/q2": () => whole(36 * 100),
    "tens-hundreds/q3": () => `It is ${700 / 70} times as much`,
    "split-place-value/q1": () => whole(7 * 46),
    "split-place-value/q2": (q) => only(q, (c) => evaluate(c) === 4 * 1203),
    "split-place-value/q3": () => whole(6 * 400),
    "columns/q1": () => whole(4 * 1326),
    "columns/q2": () => whole(7 * 2005),
    "columns/q3": (q) => only(q, (c) => c.includes(`5 × 2,000 = ${whole(5 * 2000)}`)),
    "two-by-two/q1": () => whole(32 * 15),
    "two-by-two/q2": () => whole(40 * 20),
    "two-by-two/q3": () => whole(24 * 18),
  },
  "math-decimals": {
    "tenths-hundredths/q1": () => d(7, 1),
    "tenths-hundredths/q2": () => d(43, 2),
    "tenths-hundredths/q3": (q) => only(q, (c) => same(Number(c), 0.5)),
    "thousandths/q1": () => `7 ${["tenths", "hundredths", "thousandths"]["073".indexOf("7")]}`,
    "thousandths/q2": () => (80 > 75 ? "0.8" : "0.75"),
    "thousandths/q3": () => String(Math.round(564 / 100)),
    "thousandths/q4": () => d(6000 + 12, 3),
    "powers-of-ten/q1": () => whole((327 * 100) / 100),
    "powers-of-ten/q2": () => d(52, 3),
    "powers-of-ten/q3": () => whole(10 ** 3),
    "powers-of-ten/q4": () => "She wrote a 0 at the end instead of moving the digits",
    "add-subtract/q1": () => d(350 + 125, 2),
    "add-subtract/q2": () => d(60 - 27, 1),
    "add-subtract/q3": () => `$${d(475 + 150, 2)}`,
    "add-subtract/q4": (q) => only(q, (c) => c.endsWith(`is ${d(4 + 8, 1)}`)),
  },
};

// Every number-line and fraction-bar target, recomputed from the prompt's story.
const TARGETS: Record<string, Record<string, number | { parts: number; shaded: number }>> = {
  "math-numbers-to-10": { "count-to-10/s5": 9, "more-and-less/s3": 7 + 1, "number-pairs/s4": 4 + 2, "make-10/s4": 6 + 4 },
  "math-hundreds-tens-ones": { "ten-tens/s4": 7 * 10, "skip-count/s4": 170 + 4 * 10, "skip-count/s5": 400 + 300 },
  "math-multiplication": { "equal-groups/s4": 6 * 3, "arrays/s4": 4 * 7, "facts-patterns/s4": 7 * 5, "break-apart/s3": 5 * 8 + 8 },
  "math-multiply-bigger": { "tens-hundreds/s4": 6 * 40, "split-place-value/s4": 5 * 30 + 5 * 4, "columns/s4": 4 * Math.round(2890 / 1000) * 1000, "two-by-two/s4": 40 * 20 },
  "math-decimals": {
    "tenths-hundredths/s4": { parts: 10, shaded: 6 },
    "tenths-hundredths/s5": 35 / 100,
    "thousandths/s6": Math.round(23.6) / 10,
    "powers-of-ten/s4": 7 / 10,
    "add-subtract/s4": (7 + 5) / 10,
  },
};

// Every sorter item's category, from a rule on its text (category index; -1 = no numeric rule).
const ratioOff = (t: string) => {
  const [lhs, claimed] = t.split(" = ");
  return Math.abs(evaluate(claimed) / evaluate(lhs) - 1);
};
const SORTERS: Record<string, Record<string, (text: string) => number>> = {
  "math-numbers-to-10": {
    "more-and-less/s4": (t) => (Number(t) < 5 ? 0 : 1),
    "number-pairs/s3": (t) => (nums(t)[0] + nums(t)[1] === 6 ? 0 : 1),
    "make-10/s3": (t) => (nums(t)[0] + nums(t)[1] === 10 ? 0 : 1),
  },
  "math-hundreds-tens-ones": {
    "three-digits/s4": (t) => t.indexOf("4"), // Hundreds, Tens, Ones: the digit's position in a three-digit number
    "compare/s4": (t) => (Number(t) < 500 ? 0 : 1),
  },
  "math-multiplication": {
    "equal-groups/s5": () => -1,
    "arrays/s5": (t) => (nums(t)[0] * nums(t)[1] === 24 ? 0 : 1),
    "facts-patterns/s5": (t) => (same(evaluate(t.split(" = ")[0]), Number(t.split(" = ")[1])) ? 0 : 1),
    "break-apart/s4": (t) => (evaluate(t) === 7 * 6 ? 0 : 1),
  },
  "math-multiply-bigger": {
    "tens-hundreds/s5": (t) => (evaluate(t) === 1200 ? 0 : 1),
    "split-place-value/s5": (t) => (ratioOff(t) === 0 && [200, 40, 5].includes(nums(t)[1]) ? 0 : 1),
    "columns/s5": (t) => (ratioOff(t) < 0.25 ? 0 : 1),
    "two-by-two/s5": (t) => (ratioOff(t) === 0 && [30, 6].includes(nums(t)[0]) && [20, 4].includes(nums(t)[1]) ? 0 : 1),
  },
  "math-decimals": {
    "thousandths/s5": (t) => (Number(t) < 0.6 ? 0 : 1),
    "powers-of-ten/s5": (t) => (same(evaluate(t), 4.5) ? 0 : 1),
    "add-subtract/s5": (t) => (ratioOff(t) < 0.25 ? 0 : 1),
  },
};

describe("K-5 math courses", () => {
  it("every quiz key is the computed answer, and the hint does not hand it over", () => {
    for (const [c] of COURSES) {
      const table = KEYS[c.id];
      const all = quizzes(c).flatMap((z) => z.questions.map((q) => `${z.lesson}/${q.id}`));
      expect(Object.keys(table).sort(), c.id).toEqual(all.sort());
      for (const [where, compute] of Object.entries(table)) {
        const [lesson, id] = where.split("/");
        const q = question(c, lesson, id);
        expect(key(q), `${c.id}/${where}`).toBe(compute(q));
        expect(new Set(q.choices).size, `${c.id}/${where}`).toBe(q.choices.length);
        // A numeric key may appear in the hint only when the prompt already shows it.
        const k = key(q).replace(/[$.]/g, "\\$&");
        const bare = new RegExp(`(^|[^\\d.,])${k}(?![\\d]|[.,]\\d)`);
        if (/^\$?[\d.,]+$/.test(key(q)) && !bare.test(q.prompt)) expect(bare.test(q.hint), `${c.id}/${where} hint`).toBe(false);
      }
    }
  });

  it("every widget target and sorter answer follows from its numbers", () => {
    for (const [c] of COURSES) {
      for (const [where, want] of Object.entries(TARGETS[c.id])) {
        const s = scene(c, ...(where.split("/") as [string, string])) as InteractiveScene;
        const w = s.widget;
        if (w.kind === "number-line") expect(same(w.target ?? NaN, want as number), `${c.id}/${where}`).toBe(true);
        else if (w.kind === "fraction-bar") expect(w.target, `${c.id}/${where}`).toEqual(want);
        else throw new Error(`${c.id}/${where} is a ${w.kind}`);
      }
      const sorters = c.lessons.flatMap((l) => l.scenes.flatMap((s) => (s.kind === "interactive" && s.widget.kind === "sorter" ? [`${l.id}/${s.id}`] : [])));
      expect(Object.keys(SORTERS[c.id]).sort(), c.id).toEqual(sorters.sort());
      for (const [where, rule] of Object.entries(SORTERS[c.id])) {
        const w = (scene(c, ...(where.split("/") as [string, string])) as InteractiveScene).widget;
        if (w.kind !== "sorter") throw new Error(where);
        for (const item of w.items) if (rule(item.text) >= 0) expect(item.answer, `${c.id}/${where}/${item.id}`).toBe(rule(item.text));
      }
    }
  });

  it("spreads the keys so that no choice position gives answers away", () => {
    for (const [c] of COURSES) {
      const qs = quizzes(c).flatMap((z) => z.questions);
      const three = qs.filter((q) => q.choices.length === 3);
      const counts = [0, 1, 2].map((p) => three.filter((q) => q.answer === p).length);
      expect(Math.max(...counts) - Math.min(...counts), `${c.id} keys by position ${counts}`).toBeLessThanOrEqual(1);
      const two = qs.filter((q) => q.choices.length === 2);
      if (two.length > 1) expect(new Set(two.map((q) => q.answer)).size, `${c.id} two-choice keys`).toBe(2);
      for (const z of quizzes(c))
        z.questions.forEach((q, i) => {
          const run = z.questions.slice(i, i + 3);
          if (run.length === 3) expect(new Set(run.map((x) => x.answer)).size, `${c.id}/${z.lesson} from ${q.id}`).toBeGreaterThan(1);
        });
    }
  });

  it("maps every lesson to practice skills that exist", () => {
    for (const [c, practice] of COURSES) {
      expect(Object.keys(practice).sort(), c.id).toEqual(c.lessons.map((l) => l.id).sort());
      for (const ids of Object.values(practice)) for (const id of ids) expect(getSkill(id), `${c.id} → ${id}`).toBeDefined();
    }
  });

  it("keeps each Spanish course in step with its English one", () => {
    const shape = (c: CatalogueEntry) =>
      c.lessons.map((l) => ({
        id: l.id,
        minutes: l.minutes,
        scenes: l.scenes.map((s) => ({
          id: s.id,
          kind: s.kind,
          visuals: s.kind === "slide" ? s.blocks.flatMap((b) => (b.type === "visual" ? [b.visual] : [])) : [],
          quiz: s.kind === "quiz" ? s.questions.map((q) => ({ id: q.id, n: q.choices.length, answer: q.answer })) : [],
          widget:
            s.kind !== "interactive" ? null : s.widget.kind === "sorter" ? { n: s.widget.categories.length, items: s.widget.items.map((i) => [i.id, i.answer]) } : s.widget,
        })),
      }));
    for (const [en, es] of MIRRORS) {
      expect(es.locale).toBe("es");
      expect(es.id).toBe(`${en.id}-es`);
      expect([es.subject, es.grade]).toEqual([en.subject, en.grade]);
      expect(shape(es), es.id).toEqual(shape(en));
      // Number keys read the same in both languages.
      for (const z of quizzes(en))
        for (const q of z.questions) {
          const qe = question(es, z.lesson, q.id);
          if (/^\$?[\d.,]+$/.test(key(q))) expect(key(qe), `${es.id}/${z.lesson}/${q.id}`).toBe(key(q));
        }
    }
  });

  it("keeps K-2 sentences short", () => {
    for (const c of [numbers, numbersEs, hundreds, hundredsEs]) {
      const text: string[] = [c.summary];
      for (const l of c.lessons) {
        text.push(l.summary);
        for (const s of l.scenes) {
          if (s.kind === "slide") for (const b of s.blocks) text.push(...(b.type === "text" ? [b.text] : b.type === "points" ? b.items : []));
          if (s.kind === "quiz") for (const q of s.questions) text.push(q.prompt, q.hint, q.explain);
          if (s.kind === "interactive") text.push(s.prompt);
          if (s.kind === "project") text.push(s.brief, ...s.steps);
        }
      }
      for (const t of text)
        for (const sentence of t.split(/(?<=[.?!])\s+/)) expect(sentence.split(/\s+/).length, `${c.id}: ${sentence}`).toBeLessThanOrEqual(10);
    }
  });
});
