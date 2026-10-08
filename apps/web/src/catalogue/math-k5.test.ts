import { describe, expect, it } from "vitest";
import { fractionLabel } from "@/components/stage/visuals";
import type { InteractiveScene, QuizQuestion, Scene, Visual } from "@/lib/types";
import { getSkill } from "@/practice/skills";
import decimals from "./math-decimals";
import hundreds from "./math-hundreds-tens-ones";
import hundredsEs from "./math-hundreds-tens-ones-es";
import multiplication from "./math-multiplication";
import multiplicationEs from "./math-multiplication-es";
import bigger from "./math-multiply-bigger";
import numbers from "./math-numbers-to-10";
import numbersEs from "./math-numbers-to-10-es";
import type { CatalogueEntry } from "./types";

// The K-5 math courses. Every quiz key, widget target and sorter answer is recomputed here from the
// numbers in its own prompt (and, for "which one" questions, a rule on each choice), never from a copy
// of those numbers. So an edited number in a prompt, or a reordered choice, cannot leave a wrong key
// behind. A key is a literal only when the prompt has no number to compute from (count-to-10/q3).

const COURSES = [numbers, hundreds, multiplication, bigger, decimals];
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
/** Float noise off: 3.27 × 100 is 327, not 327.00000000000006. */
const exact = (v: number) => Number(v.toFixed(9));
const whole = (n: number) => n.toLocaleString("en-US");
/** The numerals in a text, in order, as written but without thousands commas: "4 × 1,326" → ["4", "1326"]. */
const numerals = (s: string): string[] => s.replace(/(\d),(?=\d{3})/g, "$1").match(/\d+(?:\.\d+)?/g) ?? [];
const nums = (s: string) => numerals(s).map(Number);
const P = (q: QuizQuestion) => nums(q.prompt);
const total = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
const times = (xs: number[]) => xs.reduce((s, x) => s * x, 1);
const places = (numeral: string) => numeral.split(".")[1]?.length ?? 0;
/** The one sum, difference, product or quotient written in a text: "What is 4 × 1,326?" → 5304. */
function calc(s: string): number {
  const found = s.match(/\d[\d.,]*(?:\s*[×÷+−]\s*\d[\d.,]*)+/g) ?? [];
  if (found.length !== 1) throw new Error(`no single expression in "${s}"`);
  return evaluate(found[0]);
}
/** The first sentence: the task, before the hints a prompt adds. */
const first = (s: string) => s.split(/(?<=\.) /)[0];
/** The parts of a whole number by place value: 245 → [200, 40, 5]. */
const byPlace = (n: number) => [...String(n)].map((d, i, all) => Number(d) * 10 ** (all.length - 1 - i)).filter(Boolean);
const SUPER = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const WORD: Record<string, number> = { six: 6, twelve: 12 };

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

// Every quiz key, computed from the question's own prompt.
const KEYS: Record<string, Record<string, (q: QuizQuestion) => string>> = {
  "math-numbers-to-10": {
    "count-to-10/q1": (q) => String(P(q).length), // the numbers said while counting, once each
    "count-to-10/q2": (q) => String(P(q)[0]), // spreading them out keeps the count
    "count-to-10/q3": () => "No", // one dot counted twice is a wrong count
    "more-and-less/q1": (q) => String(Math.max(...P(q))),
    "more-and-less/q2": (q) => String(P(q)[0] - 1),
    "more-and-less/q3": (q) => {
      const [mia, raj] = P(q);
      return mia === raj ? "They have the same" : mia > raj ? "Mia" : "Raj";
    },
    "number-pairs/q1": (q) => String(P(q)[0] - P(q)[1]),
    "number-pairs/q2": (q) => only(q, (c) => total(nums(c)) === P(q)[0]),
    "number-pairs/q3": (q) => String(P(q)[0] - P(q)[1]),
    "make-10/q1": (q) => String(P(q)[1] - P(q)[0]),
    "make-10/q2": (q) => String(10 - P(q)[0]), // a ten-frame has 10 boxes
    "make-10/q3": (q) => only(q, (c) => total(nums(c)) === P(q)[0]),
  },
  "math-hundreds-tens-ones": {
    "ten-tens/q1": (q) => String((P(q)[0] * 100) / 10),
    "ten-tens/q2": (q) => String(P(q)[0] * 100),
    "ten-tens/q3": (q) => String(P(q)[0] * 10 + P(q)[1]),
    "three-digits/q1": (q) => {
      const [digit, n] = numerals(q.prompt);
      return String(Number(digit) * 10 ** (n.length - 1 - n.indexOf(digit)));
    },
    "three-digits/q2": (q) => String(P(q)[0] * 100 + P(q)[1] * 10 + P(q)[2]),
    "three-digits/q3": (q) => String(calc(q.prompt)),
    "skip-count/q1": (q) => String(P(q)[1] + P(q)[0]),
    "skip-count/q2": (q) => String(P(q)[1] - P(q)[0]),
    "skip-count/q3": (q) => String(P(q).at(-1)! + P(q)[1] - P(q)[0]),
    "compare/q1": (q) => String(Math.max(...P(q))),
    "compare/q2": (q) =>
      only(q, (c) => {
        const [a, op, b] = c.split(" ");
        return op === "<" ? +a < +b : op === ">" ? +a > +b : +a === +b;
      }),
    "compare/q3": (q) => (P(q)[0] > P(q)[1] ? "Yes" : "No"), // "Kai says a is greater than b"
  },
  "math-multiplication": {
    "equal-groups/q1": (q) => only(q, (c) => evaluate(c) === times(P(q))),
    "equal-groups/q2": (q) => String(times(P(q))),
    "equal-groups/q3": (q) =>
      only(q, (c) => {
        const m = c.match(/^(\d+) bags with (\d+) marbles in each bag$/);
        return !!m && Number(m[1]) === P(q)[0] && Number(m[2]) === P(q)[1]; // the first number is the groups
      }),
    "arrays/q1": (q) => String(times(P(q))),
    "arrays/q2": (q) => String(calc(q.prompt.split(". ").at(-1)!)),
    "arrays/q3": (q) => only(q, (c) => times(nums(c)) === P(q)[0]),
    "facts-patterns/q1": (q) => String(calc(q.prompt)),
    "facts-patterns/q2": (q) => String(times(P(q))),
    "facts-patterns/q3": (q) => only(q, (c) => Number(c) % 5 === 0), // count by fives
    "break-apart/q1": (q) => only(q, (c) => total(c.split(" and ").map(evaluate)) === P(q)[0] * P(q)[1]),
    "break-apart/q2": (q) => String(calc(q.prompt)),
    "break-apart/q3": (q) => String(calc(q.prompt.split(". ").at(-1)!)),
  },
  "math-multiply-bigger": {
    "tens-hundreds/q1": (q) => whole(calc(q.prompt)),
    "tens-hundreds/q2": (q) => whole(calc(q.prompt)),
    "tens-hundreds/q3": (q) => {
      const [n, digit] = numerals(q.prompt);
      const at = n.indexOf(digit);
      return `It is ${10 ** (n.indexOf(digit, at + 1) - at)} times as much`;
    },
    "split-place-value/q1": (q) => whole(calc(q.prompt)),
    "split-place-value/q2": (q) => only(q, (c) => evaluate(c) === calc(q.prompt)),
    "split-place-value/q3": (q) => whole(P(q)[0] * Math.round(P(q)[1] / 100) * 100), // round to the nearest hundred
    "columns/q1": (q) => whole(calc(q.prompt)),
    "columns/q2": (q) => whole(calc(q.prompt)),
    "columns/q3": (q) => {
      const [a, n] = P(q);
      const near = Math.round(n / 1000) * 1000;
      return only(q, (c) => c.includes(`${a} × ${whole(near)} = ${whole(a * near)}`));
    },
    "two-by-two/q1": (q) => whole(calc(q.prompt)),
    "two-by-two/q2": (q) => whole(times(P(q).slice(0, 2).map((n) => n - (n % 10)))), // tens times tens
    "two-by-two/q3": (q) => whole(times(P(q))),
  },
  "math-decimals": {
    "tenths-hundredths/q1": (q) => (P(q)[0] / 10).toFixed(1),
    "tenths-hundredths/q2": (q) => (P(q)[0] / P(q)[1]).toFixed(String(P(q)[1]).length - 1),
    "tenths-hundredths/q3": (q) => only(q, (c) => same(Number(c), P(q)[0])),
    "thousandths/q1": (q) => {
      const [digit, n] = numerals(q.prompt);
      return `${digit} ${["tenths", "hundredths", "thousandths"][n.split(".")[1].indexOf(digit)]}`;
    },
    "thousandths/q2": (q) => (P(q)[0] === P(q)[1] ? "They are equal" : String(Math.max(...P(q)))),
    "thousandths/q3": (q) => String(Math.round(P(q)[0])),
    "thousandths/q4": (q) => {
      const [, ones, parts] = q.prompt.match(/“(\w+) and (\w+) thousandths”/)!;
      return ((WORD[ones] * 1000 + WORD[parts]) / 1000).toFixed(3);
    },
    "powers-of-ten/q1": (q) => whole(exact(calc(q.prompt))),
    "powers-of-ten/q2": (q) => String(exact(calc(q.prompt))),
    "powers-of-ten/q3": (q) => {
      const [, base, power] = q.prompt.match(/(\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/)!;
      return whole(Number(base) ** Number([...power].map((c) => SUPER.indexOf(c)).join("")));
    },
    "powers-of-ten/q4": (q) => {
      const [a, , claimed] = numerals(q.prompt);
      if (exact(Number(a) * 10) === Number(claimed)) return "Nothing. She is right.";
      return claimed === `${a}0` ? "She wrote a 0 at the end instead of moving the digits" : "She should have divided by 10";
    },
    "add-subtract/q1": (q) => exact(calc(q.prompt)).toFixed(Math.max(...numerals(q.prompt).map(places))),
    "add-subtract/q2": (q) => exact(calc(q.prompt)).toFixed(Math.max(...numerals(q.prompt).map(places))),
    "add-subtract/q3": (q) => `$${exact(total(P(q))).toFixed(2)}`,
    "add-subtract/q4": (q) => {
      const [a, b, claimed] = P(q);
      const right = exact(a + b);
      return right === claimed ? "Nothing. He is right." : only(q, (c) => c.endsWith(`is ${right}`));
    },
  },
};

type Target = number | { parts: number; shaded: number };
// Every number-line and fraction-bar target, computed from the scene's prompt.
const TARGETS: Record<string, Record<string, (prompt: string) => Target>> = {
  "math-numbers-to-10": {
    "count-to-10/s5": (p) => nums(p).at(-1)!, // "Stop at 9."
    "more-and-less/s3": (p) => nums(p)[0] + 1,
    "number-pairs/s4": (p) => total(nums(p)),
    "make-10/s4": (p) => nums(p)[1], // jump until you reach 10
  },
  "math-hundreds-tens-ones": {
    "ten-tens/s4": (p) => nums(p)[0] + 10 * nums(p)[1],
    "skip-count/s4": (p) => nums(p)[0] + 10 * nums(p)[1],
    "skip-count/s5": (p) => total(nums(p)),
  },
  "math-multiplication": {
    "equal-groups/s4": (p) => calc(first(p)),
    "arrays/s4": (p) => times(nums(p).slice(0, 2)),
    "facts-patterns/s4": (p) => calc(first(p)),
    "break-apart/s3": (p) => calc(first(p)),
  },
  "math-multiply-bigger": {
    "tens-hundreds/s4": (p) => calc(first(p)),
    "split-place-value/s4": (p) => calc(first(p)),
    "columns/s4": (p) => nums(p)[0] * Math.round(nums(p)[1] / 1000) * 1000,
    "two-by-two/s4": (p) => times(nums(p).slice(0, 2).map((n) => Math.round(n / 10) * 10)),
  },
  "math-decimals": {
    "tenths-hundredths/s4": (p) => ({ parts: nums(p)[0], shaded: Math.round(nums(p)[0] * nums(p)[1]) }),
    "tenths-hundredths/s5": (p) => nums(p).at(-1)!,
    "thousandths/s6": (p) => Math.round(nums(p)[0] * 10) / 10,
    "powers-of-ten/s4": (p) => calc(first(p)),
    "add-subtract/s4": (p) => calc(first(p)),
  },
};

// Every sorter item's category (an index; -1 = no numeric rule), from its text and the scene's prompt.
const ratioOff = (t: string) => {
  const [lhs, claimed] = t.split(" = ");
  return Math.abs(evaluate(claimed) / evaluate(lhs) - 1);
};
const SORTERS: Record<string, Record<string, (prompt: string) => (text: string) => number>> = {
  "math-numbers-to-10": {
    "more-and-less/s4": (p) => (t) => (Number(t) < nums(p)[0] ? 0 : 1),
    "number-pairs/s3": (p) => (t) => (total(nums(t)) === nums(p)[0] ? 0 : 1),
    "make-10/s3": (p) => (t) => (total(nums(t)) === nums(p)[0] ? 0 : 1),
  },
  "math-hundreds-tens-ones": {
    "three-digits/s4": (p) => (t) => t.indexOf(String(nums(p)[0])), // Hundreds, Tens, Ones: the digit's position
    "compare/s4": (p) => (t) => (Number(t) < nums(p)[0] ? 0 : 1),
  },
  "math-multiplication": {
    "equal-groups/s5": () => () => -1,
    "arrays/s5": (p) => (t) => (times(nums(t)) === times(nums(p).slice(0, 2)) ? 0 : 1), // "3 rows of 8"
    "facts-patterns/s5": () => (t) => (same(evaluate(t.split(" = ")[0]), Number(t.split(" = ")[1])) ? 0 : 1),
    "break-apart/s4": (p) => (t) => (evaluate(t) === calc(p) ? 0 : 1),
  },
  "math-multiply-bigger": {
    "tens-hundreds/s5": (p) => (t) => (evaluate(t) === nums(p)[0] ? 0 : 1),
    "split-place-value/s5": (p) => {
      const [n, by] = nums(p);
      return (t) => (ratioOff(t) === 0 && nums(t)[0] === by && byPlace(n).includes(nums(t)[1]) ? 0 : 1);
    },
    "columns/s5": () => (t) => (ratioOff(t) < 0.25 ? 0 : 1),
    "two-by-two/s5": (p) => {
      const [a, b] = nums(p).slice(-2); // "partial products of 36 × 24"
      return (t) => (ratioOff(t) === 0 && byPlace(a).includes(nums(t)[0]) && byPlace(b).includes(nums(t)[1]) ? 0 : 1);
    },
  },
  "math-decimals": {
    "thousandths/s5": (p) => (t) => (Number(t) < nums(p)[0] ? 0 : 1),
    "powers-of-ten/s5": (p) => (t) => (same(evaluate(t), nums(p)[0]) ? 0 : 1),
    "add-subtract/s5": () => (t) => (ratioOff(t) < 0.25 ? 0 : 1),
  },
};

/** The strings a learner reads or hears in a course, picture descriptions too unless `alt` is false. Choices are left out: a wrong choice may be written wrong on purpose. */
function texts(c: CatalogueEntry, alt = true): string[] {
  const out: string[] = [c.summary];
  for (const l of c.lessons) {
    out.push(l.summary);
    for (const s of l.scenes) {
      if (s.kind === "slide") for (const b of s.blocks) out.push(...(b.type === "text" ? [b.text] : b.type === "points" ? b.items : alt ? [b.alt] : []));
      if (s.kind === "quiz") for (const q of s.questions) out.push(q.prompt, q.hint, q.explain);
      if (s.kind === "interactive") out.push(s.prompt);
      if (s.kind === "project") out.push(s.brief, ...s.steps);
    }
  }
  return out;
}
const pictures = (c: CatalogueEntry): { where: string; visual: Visual; alt: string }[] =>
  c.lessons.flatMap((l) =>
    l.scenes.flatMap((s) => (s.kind === "slide" ? s.blocks.flatMap((b) => (b.type === "visual" ? [{ where: `${c.id}/${l.id}/${s.id}`, visual: b.visual, alt: b.alt }] : [])) : [])),
  );

describe("K-5 math courses", () => {
  it("every quiz key is the answer computed from its prompt, and the hint does not hand it over", () => {
    for (const c of COURSES) {
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

  it("an edited number in a prompt changes the computed key", () => {
    // The table reads the prompt, so a key left behind after an edit fails the check above.
    const q = question(bigger, "columns", "q1");
    const edited = { ...q, prompt: q.prompt.replace("1,326", "1,327") };
    expect(KEYS[bigger.id]["columns/q1"](edited)).toBe(whole(4 * 1327));
    expect(KEYS[bigger.id]["columns/q1"](edited)).not.toBe(key(q));
  });

  it("every widget target and sorter answer follows from its prompt", () => {
    for (const c of COURSES) {
      const lines = c.lessons.flatMap((l) => l.scenes.flatMap((s) => (s.kind === "interactive" && s.widget.kind !== "sorter" ? [`${l.id}/${s.id}`] : [])));
      expect(Object.keys(TARGETS[c.id]).sort(), c.id).toEqual(lines.sort());
      for (const [where, compute] of Object.entries(TARGETS[c.id])) {
        const s = scene(c, ...(where.split("/") as [string, string])) as InteractiveScene;
        const want = compute(s.prompt);
        const w = s.widget;
        if (w.kind === "number-line") expect(same(w.target ?? NaN, want as number), `${c.id}/${where}`).toBe(true);
        else if (w.kind === "fraction-bar") expect(w.target, `${c.id}/${where}`).toEqual(want);
        else throw new Error(`${c.id}/${where} is a ${w.kind}`);
      }
      const sorters = c.lessons.flatMap((l) => l.scenes.flatMap((s) => (s.kind === "interactive" && s.widget.kind === "sorter" ? [`${l.id}/${s.id}`] : [])));
      expect(Object.keys(SORTERS[c.id]).sort(), c.id).toEqual(sorters.sort());
      for (const [where, ruleFor] of Object.entries(SORTERS[c.id])) {
        const s = scene(c, ...(where.split("/") as [string, string])) as InteractiveScene;
        if (s.widget.kind !== "sorter") throw new Error(where);
        const rule = ruleFor(s.prompt);
        for (const item of s.widget.items) if (rule(item.text) >= 0) expect(item.answer, `${c.id}/${where}/${item.id}`).toBe(rule(item.text));
      }
    }
  });

  it("spreads the keys so that no choice position gives answers away", () => {
    for (const c of COURSES) {
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

  it("names practice skills that exist for every lesson", () => {
    for (const c of COURSES)
      for (const l of c.lessons) {
        expect(l.practice?.length, `${c.id}/${l.id}`).toBeGreaterThan(0);
        for (const id of l.practice ?? []) expect(getSkill(id), `${c.id}/${l.id} → ${id}`).toBeDefined();
      }
  });

  it("draws a cut rectangle whose parts add up to its sides, with every part's area in its description", () => {
    const cut = COURSES.flatMap(pictures).filter((p) => p.visual.kind === "rect" && p.visual.splits);
    expect(cut.length).toBeGreaterThan(0);
    for (const { where, visual, alt } of cut) {
      if (visual.kind !== "rect" || !visual.splits) continue;
      expect([total(visual.splits.w), total(visual.splits.h)], where).toEqual([visual.w, visual.h]);
      for (const h of visual.splits.h) for (const w of visual.splits.w) expect(nums(alt), `${where}: ${w} × ${h}`).toContain(w * h);
    }
  });

  it("writes thousands the way the number lines label them", () => {
    expect([12000, 1000, 999, -2500, 0.35].map((v) => fractionLabel(v))).toEqual(["12,000", "1,000", "999", "−2,500", "0.35"]);
    expect([1000, 20000].map((v) => fractionLabel(v, undefined, "es"))).toEqual(["1000", "20,000"]);
    // English text groups every whole number from 1,000 up; Spanish keeps four digits together.
    for (const c of COURSES) for (const t of texts(c)) expect(t.match(/(?<![\d.,])\d{4,}(?![\d.,]*\d)/g), `${c.id}: ${t}`).toBeNull();
    for (const [, es] of MIRRORS) for (const t of texts(es)) expect(t.match(/(?<![\d.,])\d,\d{3}(?![\d,])/g), `${es.id}: ${t}`).toBeNull();
  });

  it("keeps each Spanish course in step with its English one", () => {
    const shape = (c: CatalogueEntry) =>
      c.lessons.map((l) => ({
        id: l.id,
        minutes: l.minutes,
        practice: l.practice,
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
    for (const c of [numbers, numbersEs, hundreds, hundredsEs])
      for (const t of texts(c, false))
        for (const sentence of t.split(/(?<=[.?!])\s+/)) expect(sentence.split(/\s+/).length, `${c.id}: ${sentence}`).toBeLessThanOrEqual(10);
  });
});
