import { describe, expect, it } from "vitest";
import type { Locale } from "@/lib/types";
import { answerText, check } from "../answer";
import { evaluate, parse } from "../expr";
import { makeItem } from "../skills";
import type { Answer, Item } from "../types";
import { EVENTS, MATH_K_2_MORE, NAMES, ROW_STORIES, SHAPES, STORY_10, STORY_100, STORY_THREE, type Pair, type ShapeEntry, type Story } from "./k2-more";

// K–2 to 1.0 depth. Every key is re-derived here by a different route than the generator used:
// counting the counters in the picture one by one, putting the answer back into the story
// (start + change = end), reading number words with this file's own word lists, comparing
// three-digit numbers as strings, walking a number line one tick at a time, adding coin values
// from the words on screen, and a hand-kept table of shape facts for the draft bank.

const PLAN = [
  ["m.count.100", "K", "K.CC.A.1", ["m.next.number"], 3, "computed"],
  ["m.write.20", "K", "K.CC.A.3", ["m.count.20"], 3, "computed"],
  ["m.compare.groups", "K", "K.CC.C.6", ["m.compare.10"], 3, "computed"],
  ["m.teen.numbers", "K", "K.NBT.A.1", ["m.count.20", "m.write.20"], 3, "computed"],
  ["m.decompose.10", "K", "K.OA.A.3", ["m.add.5"], 2, "computed"],
  ["m.story.10", "K", "K.OA.A.2", ["m.add.5", "m.sub.5"], 3, "computed"],
  ["m.shapes.name", "K", "K.G.B.4", [], 2, "draft"],
  ["m.add.three", "1", "1.OA.A.2", ["m.add.20"], 3, "computed"],
  ["m.addsub.20", "1", "1.OA.C.6", ["m.add.20", "m.sub.20"], 3, "computed"],
  ["m.mental.100", "1", "1.NBT.C.4", ["m.place.tens", "m.add.20"], 3, "computed"],
  ["m.measure.units", "1", "1.MD.A.2", ["m.count.20"], 3, "computed"],
  ["m.time.set", "1", "1.MD.B.3", ["m.time.clock"], 3, "computed"],
  ["m.data.picture", "1", "1.MD.C.4", ["m.count.20", "m.sub.10"], 3, "computed"],
  ["m.shares.halves", "1", "1.G.A.3", ["m.shapes.name"], 3, "computed"],
  ["m.story.100", "2", "2.OA.A.1", ["m.add.2digit", "m.sub.2digit"], 3, "computed"],
  ["m.place.1000", "2", "2.NBT.A.1", ["m.place.tens"], 3, "computed"],
  ["m.compare.1000", "2", "2.NBT.A.4", ["m.compare.100", "m.place.1000"], 3, "computed"],
  ["m.odd.even", "2", "2.OA.C.3", ["m.skip.count"], 3, "computed"],
  ["m.array.add", "2", "2.OA.C.4", ["m.skip.count", "m.add.three"], 3, "computed"],
  ["m.numberline.100", "2", "2.MD.B.6", ["m.mental.100"], 3, "computed"],
  ["m.money.count", "2", "2.MD.C.8", ["m.skip.count", "m.add.2digit"], 3, "computed"],
  ["m.time.5min", "2", "2.MD.C.7", ["m.time.set", "m.skip.count"], 3, "computed"],
  ["m.measure.ruler", "2", "2.MD.A.1", ["m.measure.units"], 3, "computed"],
  ["m.data.chart", "2", "2.MD.D.10", ["m.data.picture", "m.sub.2digit"], 3, "computed"],
  ["m.shares.thirds", "2", "2.G.A.3", ["m.shares.halves"], 3, "computed"],
] as const;

const SEEDS = Array.from({ length: 240 }, (_, i) => i * 104729 + 11);
const LOCALES: Locale[] = ["en", "es"];
const levelsOf = (id: string) => Array.from({ length: MATH_K_2_MORE.find((s) => s.id === id)!.levels }, (_, i) => i + 1);
const items = (id: string, level: number, locale: Locale = "en") => SEEDS.map((seed) => makeItem(id, level, seed, locale));
const both = (id: string, level: number) => SEEDS.map((seed) => [makeItem(id, level, seed, "en"), makeItem(id, level, seed, "es")] as const);

/** The prompt as one string, the blank shown as "▢". */
const text = (it: Item) => it.prompt.map((p) => (typeof p === "string" ? p : "blank" in p ? "▢" : "")).join("");
const ints = (s: string) => (s.match(/\d+/g) ?? []).map(Number);
const KEBAB = /^[a-z]+(-[a-z0-9]+)*$/;
/** Inputs answered by doing on a touch pad; each needs a matching `pad`. */
const PADDED = new Set<string>(["number-line", "fraction-bar", "clock"]);
function num(a: Answer) {
  if (a.kind !== "number") throw new Error(`expected a number answer, got ${a.kind}`);
  return a.value;
}
function frac(a: Answer) {
  if (a.kind !== "fraction") throw new Error(`expected a fraction answer, got ${a.kind}`);
  return a;
}
function keyLabel(it: Item) {
  if (it.answer.kind !== "choice") throw new Error(`expected a choice answer, got ${it.answer.kind}`);
  return it.choices![it.answer.index].label;
}
const wrongLabels = (it: Item) => it.choices!.filter((_, i) => it.answer.kind === "choice" && i !== it.answer.index).map((c) => c.label);
/** Adds and subtracts a displayed line like "50 + 20 − 3" left to right, without a parser. */
function sumLine(s: string) {
  const toks = s.replace(/−/g, "-").replace(/\s+/g, "").match(/[+-]?\d+/g) ?? [];
  return toks.reduce((acc, t) => acc + Number(t), 0);
}
/** "4 + 4 + 4" → its terms. */
const terms = (s: string) => s.split("+").map((x) => Number(x.trim()));
/** Evaluates a displayed expression with the answer checker's own parser. */
const shown = (s: string) => evaluate(parse(s.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-"))!, {});
/** Equations shown in hints and steps ("8 + 2 = 10", "So 8 = 6 + 2"); an operator or "?" before the left side means it is not a whole equation. */
const EQUATION = /(?<![\d.\/:?+−]\s*)(\d+(?:\s*[+−]\s*\d+)*)\s*=\s*(\d+(?:\s*[+−]\s*\d+)*)(?![\d\/:¢]|\.\d|\s*[+−?])/g;
function equations(line: string) {
  return [...line.matchAll(EQUATION)].map((m) => [m[1], m[2]] as const);
}
/** Worked comparisons in words: "7 is more than 4", "5 hundreds is less than 9 hundreds", "5 centenas son más que 3 centenas". */
const COMPARISON = /\b(\d+)(?: [a-z]+)? (?:is|es|son) (more|less|mayor|menor|más|menos) (?:than|que) (\d+)\b/g;
const sentences = (s: string) => s.split(/[.?!:;\n]+/).map((x) => x.trim()).filter(Boolean);
const wordCount = (s: string) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
/** Names in a story, in order of appearance. */
function namesIn(s: string) {
  return NAMES.filter((n) => new RegExp(`\\b${n}\\b`).test(s)).sort((a, b) => s.search(new RegExp(`\\b${a}\\b`)) - s.search(new RegExp(`\\b${b}\\b`)));
}
/** Finds the story template an item was written from, and checks the Spanish says the same thing. */
function storyOf(bank: readonly Story[], en: Item, es: Item) {
  const t = text(en), x = ints(t);
  const [n = "", m = ""] = namesIn(t);
  const s = bank.find((st) => st.en(x, n, m) === t);
  if (!s) throw new Error(`no template for "${t}"`);
  expect(s.es(x, n, m), "Spanish tells the same story").toBe(text(es));
  return { s, x };
}

// Number words, kept here independently of the generator: a token table, summed.
const EN_NUM: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90,
};
function readEn(words: string) {
  let total = 0, cur = 0;
  for (const w of words.toLowerCase().split(/[\s-]+/)) {
    if (w === "hundred") {
      cur *= 100;
      total += cur;
      cur = 0;
    } else if (w in EN_NUM) cur += EN_NUM[w];
    else throw new Error(`not an English number word: ${w}`);
  }
  return total + cur;
}
const ES_NUM: Record<string, number> = {
  cero: 0, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13,
  catorce: 14, quince: 15, dieciséis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21, veintidós: 22,
  veintitrés: 23, veinticuatro: 24, veinticinco: 25, veintiséis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29, treinta: 30,
  cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100, doscientos: 200, trescientos: 300,
  cuatrocientos: 400, quinientos: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900,
};
function readEs(words: string) {
  return words
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w !== "y")
    .reduce((s, w) => {
      if (!(w in ES_NUM)) throw new Error(`not a Spanish number word: ${w}`);
      return s + ES_NUM[w];
    }, 0);
}
const readWords = (s: string, locale: Locale) => (locale === "es" ? readEs(s) : readEn(s));

describe("MATH_K_2_MORE skill list", () => {
  it("matches the plan exactly, in teaching order", () => {
    expect(MATH_K_2_MORE.map((s) => s.id)).toEqual(PLAN.map((p) => p[0]));
    PLAN.forEach(([id, grade, standard, prereqs, levels, content], i) => {
      const s = MATH_K_2_MORE[i];
      expect({ id: s.id, subject: s.subject, grade: s.grade, standard: s.standard, prereqs: s.prereqs, levels: s.levels, content: s.content }).toEqual({
        id,
        subject: "math",
        grade,
        standard,
        prereqs: [...prereqs],
        levels,
        content,
      });
      expect(s.title.en.trim() && s.title.es.trim() && s.title.en !== s.title.es, id).toBeTruthy();
    });
  });
});

describe("K–2 math: every item", () => {
  it("has the brief's shape, the same answer in both languages, tagged mistakes and true arithmetic", () => {
    for (const skill of MATH_K_2_MORE) {
      for (const level of levelsOf(skill.id)) {
        const variety = new Set<string>();
        for (const [en, es] of both(skill.id, level)) {
          const where = `${skill.id} L${level} seed ${en.seed}`;
          expect(es.answer, `${where} answer differs by language`).toEqual(en.answer);
          expect(es.visual, `${where} visual differs by language`).toEqual(en.visual);
          expect([es.input, es.pad, es.markable, es.picture, es.wrong], `${where} pad differs by language`).toEqual([en.input, en.pad, en.markable, en.picture, en.wrong]);
          expect(es.choices?.map((c) => [c.why, c.picture]), `${where} choices differ by language`).toEqual(en.choices?.map((c) => [c.why, c.picture]));
          variety.add(JSON.stringify([en.prompt, en.visual, en.picture, en.choices?.map((c) => c.label)]));
          for (const it of [en, es]) {
            const at = `${where} ${it === en ? "en" : "es"}`;
            expect(it.hints.length, `${at} hints`).toBe(3);
            expect(it.steps.length, `${at} steps`).toBeGreaterThanOrEqual(1);
            expect(it.steps.length, `${at} steps`).toBeLessThanOrEqual(4);
            expect(it.seconds, at).toBeGreaterThan(0);
            expect(it.say, `${at} say`).not.toMatch(/\^|\d\/\d|\{|\}|▢|\$|¢/);
            if (it.visual || it.picture) expect(it.alt?.trim(), `${at} alt`).toBeTruthy();
            const strings = it.prompt.filter((p): p is string => typeof p === "string").join("");
            const copy = [strings, it.say, it.alt ?? "", ...it.hints, ...it.steps, ...(it.choices ?? []).flatMap((c) => [c.label, c.say ?? ""])];
            for (const line of copy) {
              expect(line, `${at} exclamation`).not.toMatch(/[!¡]/);
              expect(line, `${at} emoji in text`).not.toMatch(/\p{Extended_Pictographic}/u);
              expect(line, `${at} praise`).not.toMatch(/\b(great|good job|awesome|excellent|well done|amazing|nice work|muy bien|excelente|genial|bien hecho)\b/i);
            }
            const max = it === en ? 10 : 14;
            for (const line of [strings, it.say, ...it.hints, ...it.steps])
              for (const sen of sentences(line)) expect(wordCount(sen), `${at} too long: "${sen}"`).toBeLessThanOrEqual(max);
            const last = it.steps[it.steps.length - 1];
            for (const h of it.hints) expect(h.includes(last), `${at} hint gives the final step: ${h}`).toBe(false);
            for (const line of [...it.hints, ...it.steps]) {
              for (const [l, r] of equations(line)) expect(sumLine(l), `${at} false equation "${line}"`).toBe(sumLine(r));
              for (const m of line.matchAll(COMPARISON)) {
                const [p, q] = [Number(m[1]), Number(m[3])];
                expect(/more|mayor|más/.test(m[2]) ? p > q : p < q, `${at} false comparison "${line}"`).toBe(true);
              }
            }
            if (it.markable) expect(["dots", "ten-frame", "array"], `${at} markable`).toContain(it.visual?.kind);
            if (it.input === "choices") {
              const keyIdx = it.answer.kind === "choice" ? it.answer.index : -1;
              it.choices!.forEach((c, i) => {
                expect(c.say?.trim(), `${at} choice say`).toBeTruthy();
                if (i === keyIdx) expect(c.why, `${at} key carries a tag`).toBeUndefined();
                else expect(c.why ?? "", `${at} wrong choice "${c.label}" needs a kebab-case tag`).toMatch(KEBAB);
              });
              expect(it.wrong, at).toBeUndefined();
            } else {
              const key = answerText(it.answer, it.choices);
              const values = (it.wrong ?? []).map((w) => w.value);
              expect(new Set(values).size, `${at} repeated wrong values`).toBe(values.length);
              for (const w of it.wrong ?? []) {
                expect(w.why, `${at} wrong tag`).toMatch(KEBAB);
                expect(check(it.answer, w.value).correct, `${at} wrong value ${w.value} checks as right (key ${key})`).toBe(false);
              }
            }
            expect(it.pad?.kind, `${at} pad`).toBe(PADDED.has(it.input) ? it.input : undefined);
            if (it.pad?.kind === "clock") {
              if (it.answer.kind !== "text") throw new Error(`${at} clock needs a text answer`);
              const m = /^(1[0-2]|[1-9]):([0-5]\d)$/.exec(it.answer.accept[0]);
              expect(m, `${at} clock answer ${it.answer.accept[0]}`).not.toBeNull();
              expect(Number(m![2]) % it.pad.stepMinutes, at).toBe(0);
              for (const w of it.wrong ?? []) expect(Number(w.value.split(":")[1]) % it.pad.stepMinutes, `${at} wrong ${w.value} not settable`).toBe(0);
            }
            if (it.pad?.kind === "number-line") {
              const v = num(it.answer);
              expect(v >= it.pad.min && v <= it.pad.max && (v - it.pad.min) % it.pad.step === 0, `${at} ${v} not on the line`).toBe(true);
              for (const w of it.wrong ?? []) expect(Number(w.value) >= it.pad.min && Number(w.value) <= it.pad.max, `${at} wrong ${w.value} off the line`).toBe(true);
            }
            if (it.pad?.kind === "fraction-bar") {
              const f = frac(it.answer);
              const parts = it.pad.parts;
              const reachable = (k: number) => (f.n * k) % f.d === 0;
              if (parts) expect(reachable(parts), at).toBe(true);
              else expect([2, 3, 4].slice(0, it.pad.maxParts - 1).some(reachable), at).toBe(true);
            }
          }
        }
        expect(variety.size, `${skill.id} L${level} variety`).toBeGreaterThanOrEqual(5);
      }
    }
  }, 60_000);

  it("keeps the fact drill at fact-recall pace", () => {
    for (const level of levelsOf("m.addsub.20"))
      for (const it of items("m.addsub.20", level)) {
        expect(it.seconds).toBeGreaterThanOrEqual(4);
        expect(it.seconds).toBeLessThanOrEqual(6);
      }
  });
});

// ======================= Kindergarten =======================

describe("m.count.100", () => {
  it("the blank continues the run, counted from the first number by the step the words name", () => {
    for (const level of levelsOf("m.count.100"))
      for (const [en, es] of both("m.count.100", level))
        for (const it of [en, es]) {
          const at = it.prompt.findIndex((p) => typeof p === "object" && "blank" in p);
          const before = ints(it.prompt.slice(0, at).filter((p): p is string => typeof p === "string").join(""));
          const after = ints(it.prompt.slice(at + 1).filter((p): p is string => typeof p === "string").join(""));
          const seq = [...before, Number(keyLabel(it)), ...after];
          expect(seq.length).toBe(4);
          const step = /tens|diez en diez/.test(text(it)) ? 10 : 1;
          let v = seq[0];
          for (const s of seq) {
            expect(s).toBe(v);
            v += step;
          }
          expect(Math.max(...seq)).toBeLessThanOrEqual(100);
          expect(Math.min(...seq)).toBeGreaterThanOrEqual(1);
          if (level === 1) expect([step, after.length]).toEqual([10, 0]);
          if (level === 2) expect([step, Number(keyLabel(it)) % 10]).toEqual([1, 0]);
        }
  });
});

describe("m.write.20", () => {
  it("levels 1–2: the key is the number of filled boxes, counted one by one; level 3: the number word read back", () => {
    for (const level of levelsOf("m.write.20"))
      for (const [en, es] of both("m.write.20", level)) {
        if (level < 3) {
          const v = en.visual!;
          if (v.kind !== "ten-frame") throw new Error("expected a ten-frame");
          const boxes = (v.frames ?? 1) * 10;
          let filled = 0;
          for (let k = 0; k < boxes; k++) if (k < v.filled) filled++;
          expect(num(en.answer)).toBe(filled);
          if (level === 1) expect(boxes === 10 && filled <= 10).toBe(true);
          else expect(boxes === 20 && filled >= 11 && filled <= 20).toBe(true);
        } else
          for (const it of [en, es]) {
            const w = /(?:number|número) (.+)\.$/.exec(text(it))![1];
            expect(readWords(w, it === en ? "en" : "es")).toBe(num(it.answer));
          }
      }
  });
});

describe("m.compare.groups", () => {
  it("the key follows from counting both groups and the word more or fewer", () => {
    const seen = new Set<string>();
    for (const level of levelsOf("m.compare.groups"))
      for (const [en, es] of both("m.compare.groups", level)) {
        const v = en.visual!;
        if (v.kind !== "dots") throw new Error("expected dots");
        const [a, b] = v.groups.map((g) => Array.from({ length: g }).length);
        const more = /more/.test(text(en));
        expect(/más/.test(text(es))).toBe(more);
        const want = a === b ? "Same" : (more ? a > b : a < b) ? "Left" : "Right";
        expect(keyLabel(en)).toBe(want);
        expect(en.choices!.map((c) => c.label)).toEqual(["Left", "Right", "Same"]);
        expect(es.choices!.map((c) => c.label)).toEqual(["Izquierda", "Derecha", "Iguales"]);
        if (level === 1) expect(more).toBe(true);
        if (level === 2) expect(more).toBe(false);
        seen.add(want);
      }
    expect([...seen].sort()).toEqual(["Left", "Right", "Same"]);
  });
});

describe("m.teen.numbers", () => {
  it("10 and the ones make the teen number, checked by adding back", () => {
    for (const level of levelsOf("m.teen.numbers"))
      for (const [en, es] of both("m.teen.numbers", level))
        for (const it of [en, es]) {
          const key = Number(keyLabel(it));
          const t = text(it);
          if (t.includes("=")) {
            const [l, r] = t.replace("▢", String(key)).split("=");
            expect(shown(l)).toBe(shown(r));
            expect(level).toBe(3);
          } else {
            const v = it.visual!;
            if (v.kind !== "ten-frame") throw new Error("expected a ten-frame");
            const nums = ints(t);
            if (/how many more|cuántos más/.test(t)) {
              const n = nums.find((x) => x > 10)!;
              expect(10 + key).toBe(n);
              expect(v.filled).toBe(n);
            } else {
              const k = nums.find((x) => x < 10)!;
              expect(key - 10).toBe(k);
              expect(v.filled).toBe(key);
            }
          }
          expect(key >= 1 && key <= 19).toBe(true);
        }
  });
});

describe("m.decompose.10", () => {
  it("level 1: the missing part makes the total and matches the second group; level 2: only the key pair makes the total", () => {
    for (const [en] of both("m.decompose.10", 1)) {
      const key = Number(keyLabel(en));
      const [l, r] = text(en).replace("▢", String(key)).split("=");
      expect(shown(l)).toBe(shown(r));
      const v = en.visual!;
      if (v.kind !== "dots") throw new Error("expected dots");
      expect(v.groups[1]).toBe(key);
      expect(shown(l)).toBeLessThanOrEqual(10);
    }
    for (const locale of LOCALES)
      for (const it of items("m.decompose.10", 2, locale)) {
        const n = ints(text(it))[0];
        expect(sumLine(keyLabel(it))).toBe(n);
        for (const w of wrongLabels(it)) expect(sumLine(w), `${w} also makes ${n}`).not.toBe(n);
        expect(n).toBeLessThanOrEqual(10);
      }
  });
});

describe("m.story.10", () => {
  it("the answer put back into the story gives the start, and the dots show the same story", () => {
    const kinds = new Set<string>();
    for (const level of levelsOf("m.story.10"))
      for (const [en, es] of both("m.story.10", level)) {
        const { s, x } = storyOf(STORY_10, en, es);
        const [a, b] = x;
        const key = Number(keyLabel(en));
        if (s.kind === "add") expect([key - b, key - a]).toEqual([a, b]);
        else expect(key + b).toBe(a);
        expect(key).toBeLessThanOrEqual(10);
        expect(en.picture).toBe(s.pic);
        if (level === 1) expect([s.kind, en.visual]).toEqual(["add", { kind: "dots", groups: [a, b] }]);
        if (level === 2) expect([s.kind, en.visual]).toEqual(["take", { kind: "dots", groups: [a], crossed: b }]);
        if (level === 3) expect(en.visual).toBeUndefined();
        kinds.add(`${level}${s.kind}`);
      }
    expect([...kinds].sort()).toEqual(["1add", "2take", "3add", "3take"]);
  });
});

// The shape bank is draft: checked entry by entry, then against facts written down separately here.
describe("m.shapes.name (draft bank)", () => {
  const pick = (p: Pair, locale: Locale) => (locale === "es" ? p[1] : p[0]);
  const isBinary = (labels: string[]) => ["Yes,No", "Flat,Solid", "Solid,Flat"].includes(labels.join(",")) || labels.join(",") === "No,Yes";
  const containsPhrase = (s: string, phrase: string) => new RegExp(`(^|[^\\p{L}])${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}]|$)`, "iu").test(s);
  const promptOf = (it: Item) => text(it);

  it("has one bank per level, each with at least 12 distinct, well-formed entries", () => {
    expect(SHAPES.length).toBe(2);
    SHAPES.forEach((level, li) => {
      const where = `L${li + 1}`;
      expect(level.items.length, where).toBeGreaterThanOrEqual(12);
      for (const locale of LOCALES) {
        const keys = level.items.map((e) => `${pick(e.q, locale)}|${e.alt ? pick(e.alt, locale) : ""}`);
        expect(new Set(keys).size, `${where} ${locale} duplicates`).toBe(keys.length);
      }
      level.items.forEach((e, ei) => {
        const at = `${where} #${ei} "${e.q[0]}"`;
        expect(e.a.length, at).toBeLessThanOrEqual(4);
        expect(e.a.length >= 3 || (e.a.length === 2 && isBinary(e.a.map((c) => c.t[0]))), `${at} needs 3 choices unless yes/no-type`).toBe(true);
        for (const locale of LOCALES) {
          const labels = e.a.map((c) => pick(c.t, locale));
          expect(new Set(labels.map((l) => l.toLowerCase())).size, `${at} ${locale} duplicate labels`).toBe(labels.length);
        }
        expect(e.a[0].why, `${at} key tagged`).toBeUndefined();
        for (const c of e.a.slice(1)) expect(c.why ?? "", `${at} "${c.t[0]}" tag`).toMatch(KEBAB);
        const pairs: Pair[] = [e.q, ...(e.alt ? [e.alt] : []), ...e.a.map((c) => c.t), ...e.h, ...e.s, level.strat];
        for (const [en, es] of pairs) {
          expect(en.trim() && es.trim(), at).toBeTruthy();
          for (const s of sentences(en)) expect(wordCount(s), `${at} EN long "${s}"`).toBeLessThanOrEqual(10);
          for (const s of sentences(es)) expect(wordCount(s), `${at} ES long "${s}"`).toBeLessThanOrEqual(14);
        }
        expect(e.q[0], `${at} untranslated`).not.toBe(e.q[1]);
        expect(e.s.length >= 1 && e.s.length <= 4, at).toBe(true);
        if (e.pic) expect(e.alt, `${at} alt`).toBeTruthy();
        expect(Boolean(e.pic) || e.a.every((c) => c.pic), `${at} pre-readers need a picture`).toBe(true);
        for (const locale of LOCALES) {
          const key = pick(e.a[0].t, locale);
          if (key.length < 4) continue;
          for (const h of e.h) expect(containsPhrase(pick(h, locale), key), `${at} ${locale} hint names the key`).toBe(false);
          if (e.alt) expect(containsPhrase(pick(e.alt, locale), key), `${at} ${locale} alt names the key`).toBe(false);
        }
      });
    });
  });

  it("builds the same entry in both languages, with the bank's key, and reaches 12+ entries per level", () => {
    for (const level of [1, 2]) {
      const bank = SHAPES[level - 1].items;
      const reached = new Set<number>();
      for (const [en, es] of both("m.shapes.name", level)) {
        const found = [en, es].map((it, i) => bank.findIndex((e) => pick(e.q, LOCALES[i]) === promptOf(it) && (e.alt ? pick(e.alt, LOCALES[i]) : undefined) === it.alt && e.pic === it.picture));
        expect(found[0]).toBeGreaterThanOrEqual(0);
        expect(found[1]).toBe(found[0]);
        const e = bank[found[0]];
        expect(keyLabel(en)).toBe(e.a[0].t[0]);
        expect(keyLabel(es)).toBe(e.a[0].t[1]);
        reached.add(found[0]);
      }
      expect(reached.size, `L${level} distinct entries reached`).toBeGreaterThanOrEqual(12);
    }
  });

  // Facts, written down here independently: [question, picture, key].
  const FACTS: [string, string | undefined, string][] = [
    ["What shape is this?", "🔺", "Triangle"],
    ["What shape is this?", "🟩", "Square"],
    ["What shape is this?", "🔵", "Circle"],
    ["How many sides does this shape have?", "🔺", "3"],
    ["How many sides does this shape have?", "🟩", "4"],
    ["How many corners does this shape have?", "🔺", "3"],
    ["How many corners does this shape have?", "🟩", "4"],
    ["How many corners does a circle have?", "🔵", "0"],
    ["What shape is a dollar bill?", "💵", "Rectangle"],
    ["How many corners does a dollar bill have?", "💵", "4"],
    ["What shape is this door?", "🚪", "Rectangle"],
    ["What shape is this cookie?", "🍪", "Circle"],
    ["Which shape has 3 sides?", undefined, "Triangle"],
    ["Which shape has no corners?", undefined, "Circle"],
    ["Which shape has 4 equal sides?", undefined, "Square"],
    ["Is this shape a triangle?", "🔻", "Yes"],
    ["What shape is this ball?", "⚽", "Sphere"],
    ["What shape is this die?", "🎲", "Cube"],
    ["What shape is this can?", "🥫", "Cylinder"],
    ["What shape is the part you hold?", "🍦", "Cone"],
    ["What shape is Earth?", "🌍", "Sphere"],
    ["What shape is this piece of ice?", "🧊", "Cube"],
    ["What shape is this drum?", "🥁", "Cylinder"],
    ["What shape is this roll of paper?", "🧻", "Cylinder"],
    ["Is a square flat or solid?", "🟩", "Flat"],
    ["Is a ball flat or solid?", "⚽", "Solid"],
    ["What shape is each flat face of this die?", "🎲", "Square"],
    ["What shape is the flat top of this can?", "🥫", "Circle"],
    ["Which shape can roll and also stack?", undefined, "Cylinder"],
    ["Which shape has no flat faces?", undefined, "Sphere"],
    ["Which shape comes to a point?", undefined, "Cone"],
  ];
  it("every key matches the fact table, and the table covers every entry", () => {
    const all: ShapeEntry[] = SHAPES.flatMap((l) => l.items);
    expect(all.length).toBe(FACTS.length);
    for (const e of all) {
      const f = FACTS.find(([q, pic]) => q === e.q[0] && pic === e.pic);
      expect(f, `no fact for "${e.q[0]}" ${e.pic}`).toBeDefined();
      expect(e.a[0].t[0], e.q[0]).toBe(f![2]);
    }
  });
  it("in 'which shape' items exactly one choice has the asked property", () => {
    const SIDES: Record<string, number> = { Triangle: 3, Square: 4, Rectangle: 4, Circle: 0 };
    const EQUAL4 = new Set(["Square"]);
    const ROLLS = new Set(["Sphere", "Cylinder", "Cone"]), STACKS = new Set(["Cube", "Cylinder"]), NO_FLAT = new Set(["Sphere"]), POINT = new Set(["Cone"]);
    const has: Record<string, (s: string) => boolean> = {
      "Which shape has 3 sides?": (s) => SIDES[s] === 3,
      "Which shape has no corners?": (s) => SIDES[s] === 0,
      "Which shape has 4 equal sides?": (s) => EQUAL4.has(s),
      "Which shape can roll and also stack?": (s) => ROLLS.has(s) && STACKS.has(s),
      "Which shape has no flat faces?": (s) => NO_FLAT.has(s),
      "Which shape comes to a point?": (s) => POINT.has(s),
    };
    for (const e of SHAPES.flatMap((l) => l.items)) {
      const p = has[e.q[0]];
      if (!p) continue;
      const yes = e.a.filter((c) => p(c.t[0]));
      expect(yes.map((c) => c.t[0]), e.q[0]).toEqual([e.a[0].t[0]]);
    }
  });
});

// ======================= Grade 1 =======================

describe("m.add.three", () => {
  it("the sum of the three shown numbers, put back: total minus two of them leaves the third", () => {
    for (const level of levelsOf("m.add.three"))
      for (const [en, es] of both("m.add.three", level)) {
        const key = num(en.answer);
        let x: number[];
        if (level === 3) x = storyOf(STORY_THREE, en, es).x;
        else x = ints(text(en));
        expect(x.length).toBe(3);
        expect(key - x[0] - x[1]).toBe(x[2]);
        expect(key).toBeLessThanOrEqual(20);
        if (level === 1) {
          const v = en.visual!;
          if (v.kind !== "dots") throw new Error("expected dots");
          let dots = 0;
          for (const g of v.groups) for (let k = 0; k < g; k++) dots++;
          expect(dots).toBe(key);
        }
        if (level === 2) expect(x.some((p, i) => x.some((q, j) => i !== j && (p + q === 10 || p === q)))).toBe(true);
      }
  });
});

describe("m.addsub.20", () => {
  it("adding back the part gives the whole; level 1 stays within 10, level 2 crosses 10", () => {
    for (const level of levelsOf("m.addsub.20"))
      for (const it of items("m.addsub.20", level)) {
        const m = /^(\d+) ([+−]) (\d+) = ▢$/.exec(text(it))!;
        const [a, op, b] = [Number(m[1]), m[2], Number(m[3])];
        const key = num(it.answer);
        if (op === "+") expect(key - b).toBe(a);
        else expect(key + b).toBe(a);
        expect(key >= 0 && Math.max(a, b, key) <= 20).toBe(true);
        const crosses = op === "+" ? a < 10 && b < 10 && a + b > 10 : a > 10 && b < 10 && a - 10 < b;
        if (level === 1) expect(Math.max(a, key)).toBeLessThanOrEqual(10);
        if (level === 2) expect(crosses).toBe(true);
      }
  });
});

describe("m.mental.100", () => {
  it("10 more / 10 less change only the tens; sums are checked by the expression parser", () => {
    for (const level of levelsOf("m.mental.100"))
      for (const it of items("m.mental.100", level)) {
        const key = num(it.answer);
        if (level === 1) {
          const m = /10 (more|less) than (\d+)/.exec(text(it))!;
          const n = Number(m[2]);
          if (m[1] === "more") expect(key - 10).toBe(n);
          else expect(key + 10).toBe(n);
          expect(String(key).slice(-1)).toBe(String(n).slice(-1));
          const v = it.visual!;
          if (v.kind !== "base-ten") throw new Error("expected blocks");
          expect(v.tens * 10 + v.ones).toBe(n);
        } else {
          const left = text(it).split("=")[0];
          expect(shown(left)).toBe(key);
          const [p, q] = ints(left);
          if (level === 2) expect(q % 10).toBe(0);
          if (level === 3) expect(q).toBeLessThan(10);
          expect(p).toBeGreaterThanOrEqual(10);
        }
        expect(key >= 10 && key <= 99).toBe(true);
      }
  });
});

describe("m.measure.units", () => {
  it("level 1: the cubes in the row, counted; level 2: the shorter length plus the answer is the longer; level 3: gaps undercount, overlaps overcount", () => {
    for (const it of items("m.measure.units", 1)) {
      const v = it.visual!;
      if (v.kind !== "array") throw new Error("expected a row of cubes");
      expect(v.rows).toBe(1);
      let cubes = 0;
      for (let k = 0; k < v.cols; k++) cubes++;
      expect(num(it.answer)).toBe(cubes);
    }
    for (const locale of LOCALES)
      for (const it of items("m.measure.units", 2, locale)) {
        const [a, b] = ints(text(it));
        expect(b + num(it.answer)).toBe(a);
      }
    const seen = new Set<string>();
    for (const [en] of both("m.measure.units", 3)) {
      const t = text(en);
      const want = /leaves gaps/.test(t) ? "Too small" : /overlap/.test(t) ? "Too big" : /end to end/.test(t) ? "Just right" : "?";
      expect(keyLabel(en)).toBe(want);
      seen.add(want);
    }
    expect(seen.size).toBe(3);
  });
});

describe("m.time.set", () => {
  const fromEn = (t: string) => {
    let m = /Show (\d{1,2}):(\d\d) on/.exec(t);
    if (m) return `${m[1]}:${m[2]}`;
    m = /Show (\d{1,2}) o'clock/.exec(t);
    if (m) return `${m[1]}:00`;
    m = /Show half past (\d{1,2})/.exec(t);
    return m ? `${m[1]}:30` : "?";
  };
  const fromEs = (t: string) => {
    let m = /Marca (las?) (\d{1,2}):(\d\d) en/.exec(t);
    if (m) return [m[1], `${m[2]}:${m[3]}`];
    m = /Marca (las?) (\d{1,2}) en punto/.exec(t);
    if (m) return [m[1], `${m[2]}:00`];
    m = /Marca (las?) (\d{1,2}) y media/.exec(t);
    return m ? [m[1], `${m[2]}:30`] : ["?", "?"];
  };
  it("the clock answer is the time the words ask for, in both languages", () => {
    for (const level of levelsOf("m.time.set"))
      for (const [en, es] of both("m.time.set", level)) {
        if (en.answer.kind !== "text") throw new Error("expected a clock answer");
        const want = fromEn(text(en));
        const [article, esWant] = fromEs(text(es));
        expect(en.answer.accept).toEqual([want]);
        expect(esWant).toBe(want);
        expect(article).toBe(want.startsWith("1:") ? "la" : "las");
        const minutes = want.split(":")[1];
        if (level === 1) expect(minutes).toBe("00");
        if (level === 2) expect(minutes).toBe("30");
      }
  });
});

describe("m.data.picture", () => {
  it("every answer is recounted from the dots under the category the question names", () => {
    for (const level of levelsOf("m.data.picture"))
      for (const it of items("m.data.picture", level)) {
        const t = text(it);
        const cats = /Left to right: (.+?)\./.exec(t)![1].split(", ");
        const v = it.visual!;
        if (v.kind !== "dots") throw new Error("expected dots");
        const count = (name: string) => {
          let n = 0;
          for (let k = 0; k < v.groups[cats.indexOf(name)]; k++) n++;
          return n;
        };
        let m: RegExpExecArray | null;
        if ((m = /How many more kids picked (.+) than (.+)\?$/.exec(t))) expect(num(it.answer)).toBe(count(m[1]) - count(m[2]));
        else if ((m = /How many fewer kids picked (.+) than (.+)\?$/.exec(t))) expect(num(it.answer)).toBe(count(m[2]) - count(m[1]));
        else if ((m = /How many kids picked (.+)\?$/.exec(t))) expect(num(it.answer)).toBe(count(m[1]));
        else if (/voted in all/.test(t)) expect(num(it.answer)).toBe(cats.reduce((s, c) => s + count(c), 0));
        else {
          const most = /most/.test(t);
          const best = cats.filter((c) => cats.every((o) => (most ? count(c) >= count(o) : count(c) <= count(o))));
          expect(best.length).toBe(1);
          expect(keyLabel(it).toLowerCase()).toBe(best[0].toLowerCase());
        }
        if (it.input === "keypad") expect(num(it.answer)).toBeGreaterThan(0);
        for (const g of v.groups) expect(g >= 2 && g <= 5).toBe(true);
      }
  });
});

describe("m.shares.halves", () => {
  const VALUE: Record<string, [number, number]> = { "one half": [1, 2], "one fourth": [1, 4], "one quarter": [1, 4], "both halves": [2, 2], "all 4 fourths": [4, 4], "all 4 quarters": [4, 4], "the whole bar": [1, 1] };
  const PARTS: Record<string, number> = { halves: 2, fourths: 4, quarters: 4 };
  it("the shaded amount is the share the words name, by cross-multiplying", () => {
    for (const level of [1, 2])
      for (const it of items("m.shares.halves", level)) {
        const t = text(it);
        const [n, d] = VALUE[/Shade (.+)\.$/.exec(t)![1]];
        const a = frac(it.answer);
        expect(a.n * d).toBe(n * a.d);
        if (it.pad?.kind !== "fraction-bar") throw new Error("expected a fraction bar");
        if (level === 1) expect([it.pad.parts, a.d]).toEqual([ints(t)[0], ints(t)[0]]);
        else expect([it.pad.parts, a.d]).toEqual([undefined, PARTS[/into (\w+)\./.exec(t)![1]]]);
      }
  });
  it("level 3: names the shaded share, compares a half with a fourth, counts the shares in a whole", () => {
    for (const it of items("m.shares.halves", 3)) {
      const t = text(it);
      if (/What part/.test(t)) {
        const v = it.visual!;
        if (v.kind !== "fraction") throw new Error("expected a bar");
        expect(keyLabel(it)).toBe(v.shaded === v.parts ? "The whole bar" : v.parts === 2 ? "One half" : "One fourth");
      } else if (/Which share/.test(t)) {
        const half = 1 / 2, fourth = 1 / 4;
        expect(keyLabel(it)).toBe(/bigger/.test(t) === half > fourth ? "One half" : "One fourth");
      } else {
        const d = PARTS[/How many (\w+) make/.exec(t)![1]];
        const v = it.visual!;
        if (v.kind !== "fraction") throw new Error("expected a bar");
        expect([Number(keyLabel(it)), v.parts]).toEqual([d, d]);
      }
    }
  });
});

// ======================= Grade 2 =======================

describe("m.story.100", () => {
  // How the numbers in each kind of story relate to the answer, written as the check, not the computation.
  const RELATION: Record<string, (x: number[], a: number) => boolean> = {
    "add-to": ([p, q], a) => a - q === p,
    "put-together": ([p, q], a) => a - p === q,
    "take-from": ([p, q], a) => a + q === p,
    "change-add": ([s, e], a) => s + a === e,
    "change-take": ([s, e], a) => s - a === e,
    "start-add": ([q, e], a) => a + q === e,
    compare: ([big, small], a) => small + a === big,
    fewer: ([p, d], a) => a + d === p,
    more: ([p, d], a) => a - d === p,
    "add-take": ([p, q, r], a) => a + r - q === p,
    "take-add": ([p, q, r], a) => a - r + q === p,
    "take-take": ([p, q, r], a) => a + q + r === p,
    goal: ([p, q, r], a) => p + q + a === r,
  };
  const LEVEL_KINDS = [["add-to", "put-together", "take-from"], ["change-add", "change-take", "start-add", "compare", "fewer", "more"], ["add-take", "take-add", "take-take", "goal"]];
  // Plain-language cues each kind must carry, so a story's wording matches its arithmetic.
  const CUE: Record<string, RegExp> = {
    "add-to": /more/, "put-together": /in all/, "take-from": /left|still out/, "change-add": /some/, "change-take": /Some/, "start-add": /at first/,
    compare: /How many more/, fewer: /fewer/, more: /more/, "add-take": /now/, "take-add": /now/, "take-take": /left|still in/, goal: /goal/,
  };
  it("putting the answer back into the story makes it true, at every level", () => {
    for (const level of levelsOf("m.story.100")) {
      const kinds = new Set<string>();
      for (const [en, es] of both("m.story.100", level)) {
        const { s, x } = storyOf(STORY_100, en, es);
        const key = num(en.answer);
        expect(RELATION[s.kind](x, key), `${s.kind} ${x} → ${key}`).toBe(true);
        expect(LEVEL_KINDS[level - 1]).toContain(s.kind);
        expect(text(en)).toMatch(CUE[s.kind]);
        expect(key >= 1 && key <= 100 && Math.max(...x) <= 100).toBe(true);
        kinds.add(s.kind);
      }
      expect([...kinds].sort()).toEqual([...LEVEL_KINDS[level - 1]].sort());
    }
  });
});

describe("m.place.1000", () => {
  it("blocks are counted one by one; expanded form is evaluated; a digit's value comes from its position; number words are read back", () => {
    for (const it of items("m.place.1000", 1)) {
      const v = it.visual!;
      if (v.kind !== "base-ten") throw new Error("expected blocks");
      let total = 0;
      for (let k = 0; k < (v.hundreds ?? 0); k++) total += 100;
      for (let k = 0; k < v.tens; k++) total += 10;
      for (let k = 0; k < v.ones; k++) total += 1;
      expect(num(it.answer)).toBe(total);
    }
    for (const it of items("m.place.1000", 2)) {
      const t = text(it);
      const m = /value of the (\d) in (\d+)/.exec(t);
      if (m) {
        const digits = m[2].split("");
        expect(digits.filter((d) => d === m[1]).length).toBe(1);
        const pos = digits.indexOf(m[1]);
        expect(keyLabel(it)).toBe(m[1] + "0".repeat(digits.length - 1 - pos));
      } else expect(shown(t.split("=")[0])).toBe(num(it.answer));
    }
    for (const [en, es] of both("m.place.1000", 3))
      for (const it of [en, es]) {
        const locale: Locale = it === en ? "en" : "es";
        const t = text(it);
        const w = /(?:number|número) (.+)\.$/.exec(t);
        if (w) expect(readWords(w[1], locale)).toBe(num(it.answer));
        else {
          const n = ints(t)[0];
          expect(readWords(keyLabel(it), locale)).toBe(n);
          for (const lab of wrongLabels(it)) expect(readWords(lab, locale)).not.toBe(n);
        }
      }
  });
});

describe("m.compare.1000", () => {
  it("the symbol matches comparing the two numbers as zero-padded strings", () => {
    for (const level of levelsOf("m.compare.1000"))
      for (const it of items("m.compare.1000", level)) {
        const [leftText, right] = text(it).split(" ▢ ");
        const a = leftText.includes("+") ? shown(leftText) : Number(leftText);
        const b = Number(right);
        const [sa, sb] = [String(a).padStart(3, "0"), String(b).padStart(3, "0")];
        const want = sa < sb ? "<" : sa > sb ? ">" : "=";
        expect(keyLabel(it)).toBe(want);
        expect(it.choices!.map((c) => c.label)).toEqual(["<", ">", "="]);
        if (level === 1) expect(sa[0]).not.toBe(sb[0]);
        if (level === 2) expect([sa[0] === sb[0], sa[1] !== sb[1]]).toEqual([true, true]);
        expect(a >= 100 && b >= 100 && a <= 999 && b <= 999).toBe(true);
      }
  });
});

describe("m.odd.even", () => {
  const parity = (n: number) => ("02468".includes(String(n).slice(-1)) ? "Even" : "Odd");
  it("pairing off the dots, the last digit, and doubles all agree with the key", () => {
    for (const it of items("m.odd.even", 1)) {
      const v = it.visual!;
      if (v.kind !== "dots") throw new Error("expected dots");
      let left = v.groups[0];
      while (left >= 2) left -= 2;
      expect(keyLabel(it)).toBe(left === 0 ? "Even" : "Odd");
    }
    for (const it of items("m.odd.even", 2)) expect(keyLabel(it)).toBe(parity(ints(text(it))[0]));
    for (const it of items("m.odd.even", 3)) {
      const t = text(it);
      if (/double/.test(t)) {
        const n = ints(t)[0];
        const [p, q] = terms(keyLabel(it));
        expect([p, p + q]).toEqual([q, n]);
        for (const w of wrongLabels(it)) {
          const [x, y] = terms(w);
          expect(x === y && x + y === n, `${w} is also a double of ${n}`).toBe(false);
        }
      } else {
        const want = /even/.test(t) ? "Even" : "Odd";
        expect(parity(Number(keyLabel(it)))).toBe(want);
        for (const w of wrongLabels(it)) expect(parity(Number(w))).not.toBe(want);
      }
    }
  });
});

describe("m.array.add", () => {
  it("rows of equal dots, added row by row; the matching addition has one term per row", () => {
    for (const level of levelsOf("m.array.add"))
      for (const [en, es] of both("m.array.add", level)) {
        let rows: number, cols: number;
        if (level === 3) [rows, cols] = storyOf(ROW_STORIES, en, es).x;
        else {
          const v = en.visual!;
          if (v.kind !== "array") throw new Error("expected an array");
          [rows, cols] = [v.rows, v.cols];
        }
        let total = 0;
        for (let k = 0; k < rows; k++) total += cols;
        expect(rows <= 5 && cols <= 5 && rows >= 2 && cols >= 2).toBe(true);
        if (level === 2) {
          const ts = terms(keyLabel(en));
          expect(ts.length).toBe(rows);
          expect(ts.every((x) => x === cols)).toBe(true);
          for (const w of wrongLabels(en)) expect(terms(w).reduce((s, x) => s + x, 0), `${w} also totals ${total}`).not.toBe(total);
        } else expect(num(en.answer)).toBe(total);
      }
  });
});

describe("m.numberline.100", () => {
  it("walking the line one tick (or one ten) at a time lands on the key, inside the pad", () => {
    for (const level of levelsOf("m.numberline.100"))
      for (const [en, es] of both("m.numberline.100", level)) {
        const m = /^Start at (\d+)\. Jump (forward|back) (\d+)(?:, (\d) times)?\. Tap where you land\.$/.exec(text(en))!;
        const start = Number(m[1]), dir = m[2] === "forward" ? 1 : -1, size = Number(m[3]), times = m[4] ? Number(m[4]) : 1;
        let at = start;
        for (let k = 0; k < times; k++) for (let u = 0; u < size; u++) at += dir;
        expect(num(en.answer)).toBe(at);
        expect(ints(text(es)).slice(0, 2)).toEqual(times > 1 ? [start, 10] : [start, size]);
        const v = en.visual!;
        if (v.kind !== "number-line" || en.pad?.kind !== "number-line") throw new Error("expected a number line");
        expect(v.marker).toBe(start);
        expect([v.min, v.max]).toEqual([en.pad.min, en.pad.max]);
        expect(start >= en.pad.min && start <= en.pad.max).toBe(true);
        expect(at >= 0 && at <= 100).toBe(true);
        if (level === 1) expect([dir, size < 10]).toEqual([1, true]);
        if (level === 2) expect([dir, size < 10]).toEqual([-1, true]);
        if (level === 3) expect(size % 10).toBe(0);
      }
  });
});

describe("m.money.count", () => {
  const COIN: Record<string, number> = { penny: 1, pennies: 1, nickel: 5, nickels: 5, dime: 10, dimes: 10, quarter: 25, quarters: 25 };
  const coinsEn = (s: string) => [...s.matchAll(/(\d+) (pennies|penny|nickels?|dimes?|quarters?)\b/g)].reduce((t, m) => t + Number(m[1]) * COIN[m[2]], 0);
  const coinsEs = (s: string) => [...s.matchAll(/(\d+) (?:monedas? )?de (\d+)¢/g)].reduce((t, m) => t + Number(m[1]) * Number(m[2]), 0);
  const billsEn = (s: string) => [...s.matchAll(/(one|\d+) \$(\d+) bills?/g)].reduce((t, m) => t + (m[1] === "one" ? 1 : Number(m[1])) * Number(m[2]), 0);
  const billsEs = (s: string) => [...s.matchAll(/(un|\d+) billetes? de \$(\d+)/g)].reduce((t, m) => t + (m[1] === "un" ? 1 : Number(m[1])) * Number(m[2]), 0);
  it("adds the coin and bill values named on screen, in both languages", () => {
    for (const level of levelsOf("m.money.count"))
      for (const [en, es] of both("m.money.count", level)) {
        const [te, ts] = [text(en), text(es)];
        if (/Which coins make (\d+)¢/.test(te)) {
          const target = Number(/make (\d+)¢/.exec(te)![1]);
          expect(coinsEn(keyLabel(en))).toBe(target);
          expect(coinsEs(keyLabel(es))).toBe(target);
          for (const w of wrongLabels(en)) expect(coinsEn(w), `${w} also makes ${target}¢`).not.toBe(target);
          expect(level).toBe(3);
        } else if (/dollars/.test(te)) {
          expect([billsEn(te), billsEs(ts)]).toEqual([num(en.answer), num(en.answer)]);
          expect(level).toBe(3);
        } else {
          expect([coinsEn(te), coinsEs(ts)]).toEqual([num(en.answer), num(en.answer)]);
          expect(/quarter/.test(te)).toBe(level === 2);
          expect(num(en.answer)).toBeLessThan(100);
        }
      }
  });
});

describe("m.time.5min", () => {
  const fromEn = (t: string) => {
    let m = /Show (\d{1,2}):(\d\d) on/.exec(t);
    if (m) return `${m[1]}:${m[2]}`;
    m = /Show (\d+) minutes after (\d{1,2})/.exec(t);
    if (m) return `${m[2]}:${m[1].padStart(2, "0")}`;
    m = /Show quarter past (\d{1,2})/.exec(t);
    if (m) return `${m[1]}:15`;
    m = /Show half past (\d{1,2})/.exec(t);
    return m ? `${m[1]}:30` : "?";
  };
  const fromEs = (t: string) => {
    let m = /las? (\d{1,2}):(\d\d) en/.exec(t);
    if (m) return `${m[1]}:${m[2]}`;
    m = /las? (\d{1,2}) y (\d+|cuarto|media) en/.exec(t);
    if (!m) return "?";
    const mm = m[2] === "cuarto" ? 15 : m[2] === "media" ? 30 : Number(m[2]);
    return `${m[1]}:${String(mm).padStart(2, "0")}`;
  };
  // When each event happens, kept apart from the bank: morning events are a.m., the rest p.m.
  const MORNING = /breakfast|School starts|Morning recess|wake up|sun rises|school bus/;
  const LATER = /lunch|School ends|after school|dinner|go to bed|sun sets|bedtime/;
  it("the clock answer is the time asked for; a.m. and p.m. follow the time of day", () => {
    for (const level of [1, 2])
      for (const [en, es] of both("m.time.5min", level)) {
        if (en.answer.kind !== "text") throw new Error("expected a clock answer");
        const want = fromEn(text(en));
        expect(en.answer.accept).toEqual([want]);
        expect(fromEs(text(es))).toBe(want);
        expect(Number(want.split(":")[1])).toBeGreaterThan(0);
        if (level === 2) expect(Number(want.split(":")[1])).toBeLessThanOrEqual(30);
      }
    for (const it of items("m.time.5min", 3)) {
      const t = text(it);
      const morning = MORNING.test(t), later = LATER.test(t);
      expect(morning !== later, t).toBe(true);
      expect(keyLabel(it)).toBe(morning ? "a.m." : "p.m.");
      if (/ 12:/.test(t)) expect(it.choices!.find((c) => c.why)?.why).toBe("thought-noon-is-am");
    }
    expect(EVENTS.length).toBeGreaterThanOrEqual(12);
  });
});

describe("m.measure.ruler", () => {
  it("length is the end mark minus the start mark; the shorter length plus the answer is the longer; centimeters give the bigger count", () => {
    for (const level of [1, 2])
      for (const it of items("m.measure.ruler", level)) {
        const s = Number(/starts at (\d+)/.exec(text(it))![1]);
        const v = it.visual!;
        if (v.kind !== "number-line") throw new Error("expected a ruler");
        expect(v.marks).toEqual(Array.from({ length: v.max + 1 }, (_, i) => i));
        expect(v.marker! - s).toBe(num(it.answer));
        expect(v.marker! <= v.max && num(it.answer) >= 1).toBe(true);
        expect(s === 0).toBe(level === 1);
      }
    for (const locale of LOCALES)
      for (const it of items("m.measure.ruler", 3, locale)) {
        const t = text(it);
        if (it.input === "keypad") {
          const [a, b] = ints(t);
          expect(b + num(it.answer)).toBe(a);
        } else if (locale === "en") {
          const m = /^(\w+) measures a [\w ]+ in (inches|centimeters)\. (\w+) measures it in (inches|centimeters)\./.exec(t)!;
          expect(keyLabel(it)).toBe(m[2] === "centimeters" ? m[1] : m[3]);
          expect(m[2]).not.toBe(m[4]);
        }
      }
  });
});

describe("m.data.chart", () => {
  it("every answer is worked from the chart rows the question names", () => {
    for (const level of levelsOf("m.data.chart"))
      for (const it of items("m.data.chart", level)) {
        const lines = text(it).split("\n");
        const question = lines[lines.length - 1];
        const rows = new Map(lines.slice(1, -1).map((l) => {
          const m = /^(.+): (\d+)$/.exec(l)!;
          return [m[1].toLowerCase(), Number(m[2])] as const;
        }));
        expect(rows.size).toBe(4);
        const c = (name: string) => rows.get(name.toLowerCase())!;
        let total = 0;
        for (const v of rows.values()) total += v;
        let m: RegExpExecArray | null;
        let want: number;
        if ((m = /^How many more \w+ for (.+) than for (.+)\?$/.exec(question))) want = c(m[1]) - c(m[2]);
        else if ((m = /^How many fewer \w+ for (.+) than for (.+)\?$/.exec(question))) want = c(m[2]) - c(m[1]);
        else if ((m = /^How many \w+ for (.+) and (.+) together\?$/.exec(question))) want = c(m[1]) + c(m[2]);
        else if (/^How many \w+ in all\?$/.test(question)) want = total;
        else if ((m = /^(.+) and (.+) together: how many more \w+ than (.+)\?$/.exec(question))) want = c(m[1]) + c(m[2]) - c(m[3]);
        else if ((m = /^How many \w+ were not for (.+)\?$/.exec(question))) want = total - c(m[1]);
        else throw new Error(`unknown question: ${question}`);
        expect(num(it.answer), question).toBe(want);
        expect(want).toBeGreaterThan(0);
      }
  });
});

describe("m.shares.thirds", () => {
  const D: Record<string, number> = { halves: 2, thirds: 3, fourths: 4, half: 2, third: 3, fourth: 4 };
  const NAME: Record<number, string> = { 2: "half", 3: "third", 4: "fourth" };
  it("the share named in words matches the parts; more parts make smaller shares", () => {
    for (const it of items("m.shares.thirds", 1)) {
      const t = text(it);
      const d = D[/^Cut the bar into (\w+)\./.exec(t)![1]];
      const a = frac(it.answer);
      const one = /Shade one (\w+)\.$/.exec(t);
      if (one) expect([D[one[1]], a.n * d]).toEqual([d, a.d]);
      else {
        expect(t).toMatch(d === 2 ? /Shade both halves\.$/ : new RegExp(`Shade all ${d} \\w+\\.$`));
        expect(a.n).toBe(a.d);
      }
    }
    for (const it of items("m.shares.thirds", 2)) {
      const v = it.visual!;
      if (v.kind !== "fraction") throw new Error("expected a bar");
      expect(v.shaded).toBe(1);
      const t = text(it);
      const plural = /How many (\w+)/.exec(t)?.[1];
      if (plural) expect([D[plural], keyLabel(it)]).toEqual([v.parts, `${v.parts} ${plural}`]);
      else expect(keyLabel(it)).toBe(`One ${NAME[v.parts]}`);
    }
    for (const it of items("m.shares.thirds", 3)) {
      const t = text(it);
      const cut = [...t.matchAll(/cut into (\w+)\./g)].map((m) => D[m[1]]);
      if (cut.length === 2) {
        const [p, q] = cut;
        const bigger = 1 / p > 1 / q ? p : q, smaller = bigger === p ? q : p;
        expect(keyLabel(it)).toBe(`One ${NAME[/bigger/.test(t) ? bigger : smaller]}`);
      } else expect(keyLabel(it)).toBe(`One ${NAME[ints(t)[0]]}`);
    }
  });
});
