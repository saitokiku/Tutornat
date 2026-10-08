import { describe, expect, it } from "vitest";
import type { Locale } from "@/lib/types";
import { counterCell, isMarkable, layoutCounters } from "@/components/practice/MarkCounters";
import { barText, CLOCK_START } from "@/components/practice/pad-math";
import { answerText, check, misconceptionOf } from "../answer";
import { evaluate, parse } from "../expr";
import { makeItem } from "../skills";
import type { Answer, Item, Pad } from "../types";
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
  ["m.read.1000", "2", "2.NBT.A.3", ["m.place.1000"], 3, "computed"],
  ["m.compare.1000", "2", "2.NBT.A.4", ["m.compare.100", "m.place.1000"], 3, "computed"],
  ["m.odd.even", "2", "2.OA.C.3", ["m.skip.count"], 3, "computed"],
  ["m.array.add", "2", "2.OA.C.4", ["m.skip.count", "m.add.three"], 3, "computed"],
  ["m.numberline.100", "2", "2.MD.B.6", ["m.mental.100"], 3, "computed"],
  ["m.money.count", "2", "2.MD.C.8", ["m.skip.count", "m.add.2digit"], 3, "computed"],
  ["m.time.5min", "2", "2.MD.C.7", ["m.time.set", "m.skip.count"], 3, "computed"],
  ["m.measure.ruler", "2", "2.MD.A.1", ["m.measure.units"], 3, "computed"],
  ["m.data.chart", "2", "2.OA.A.1", ["m.data.picture", "m.sub.2digit"], 3, "computed"],
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
/** A run of counted numbers ending in an ellipsis: "1, 2, 3…", "4, …", "1… 2…". */
const COUNT_RUN = /\d+(?:(?:,\s*|…\s*)\d+)*(?:,\s*)?…/g;
/** The number a count starts from: "starting at 10", "Start at 3", "Count up from 4", "desde el 10". */
const STARTS_AT = /(?:starting at|start at|from|desde el|desde|empieza en) (\d+)/gi;
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
        const variety = new Set<string>(), varietyEs = new Set<string>();
        for (const [en, es] of both(skill.id, level)) {
          const where = `${skill.id} L${level} seed ${en.seed}`;
          expect(es.answer, `${where} answer differs by language`).toEqual(en.answer);
          expect(es.visual, `${where} visual differs by language`).toEqual(en.visual);
          expect([es.input, es.pad, es.markable, es.picture, es.wrong], `${where} pad differs by language`).toEqual([en.input, en.pad, en.markable, en.picture, en.wrong]);
          expect(es.choices?.map((c) => [c.why, c.picture]), `${where} choices differ by language`).toEqual(en.choices?.map((c) => [c.why, c.picture]));
          // The task is what the child is shown: words and pictures. Choices do not count, so a level
          // with few questions cannot pass on its wrong answers alone.
          variety.add(JSON.stringify([en.prompt, en.visual, en.picture]));
          varietyEs.add(JSON.stringify([es.prompt, es.visual, es.picture]));
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
            // A hint's arithmetic never hands over the answer, unless the prompt already shows that number.
            const keyText = answerText(it.answer, it.choices);
            if (!ints(strings).includes(Number(keyText)))
              for (const h of it.hints) {
                for (const [l, r] of equations(h)) expect([...ints(l), ...ints(r)].map(String), `${at} hint "${h}" shows the answer`).not.toContain(keyText);
                // Nor does a counted run ("count on: 4, …", "1, 2, 3…", "1… 2…") or the number a count starts from.
                for (const m of h.matchAll(COUNT_RUN)) expect(ints(m[0]).map(String), `${at} hint "${h}" counts to the answer`).not.toContain(keyText);
                for (const m of h.matchAll(STARTS_AT)) expect(m[1], `${at} hint "${h}" starts from the answer`).not.toBe(keyText);
              }
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
              // The pad starts at 12:00 and sends it untouched, so 12:00 is never the answer.
              expect(it.answer.accept[0], `${at} right without touching the clock`).not.toBe(CLOCK_START);
              expect(it.wrong?.length ?? 0, `${at} names no likely wrong setting`).toBeGreaterThanOrEqual(1);
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
              // Bars are checked exactly: the answer is the pad's own "shaded/parts" response, one the pad can make.
              if (it.answer.kind !== "text") throw new Error(`${at} a bar needs an exact answer`);
              expect(it.answer.accept.length, at).toBe(1);
              const [n, d] = it.answer.accept[0].split("/").map(Number);
              expect(Number.isInteger(n) && n >= 1 && n <= d && d <= it.pad.maxParts, `${at} ${it.answer.accept[0]}`).toBe(true);
              if (it.pad.parts) expect(d, at).toBe(it.pad.parts);
            }
          }
        }
        // The brief's floor: 12 distinct items per level, so a set is not memorized.
        expect(variety.size, `${skill.id} L${level} variety`).toBeGreaterThanOrEqual(12);
        expect(varietyEs.size, `${skill.id} L${level} Spanish variety`).toBeGreaterThanOrEqual(12);
      }
    }
  }, 60_000);

  it("a question about left and right is drawn in one row on a 320 px phone", () => {
    // Tap-to-mark counters wrap groups onto new lines when the room runs out; the plain picture never
    // does. So an item that names groups by position is either plain, or its marked layout keeps every
    // group on the first line at phone width (the room the Runner gives counters there).
    const PHONE_ROOM = 320 - 2 * 16 - 2;
    let positional = 0;
    for (const skill of MATH_K_2_MORE)
      for (const level of levelsOf(skill.id))
        for (const locale of LOCALES)
          for (const it of items(skill.id, level, locale)) {
            const copy = [text(it), it.say, it.alt ?? "", ...it.hints, ...it.steps, ...(it.choices ?? []).flatMap((c) => [c.label, c.say ?? ""])].join(" ");
            if (!/\b(left|right)\b|izquierda|derecha/i.test(copy)) continue;
            positional++;
            if (!it.markable) continue;
            if (!isMarkable(it.visual)) throw new Error(`${skill.id} markable without counters`);
            const lay = layoutCounters(it.visual, PHONE_ROOM, counterCell(true));
            expect(new Set(lay.counters.filter((c) => c.row === 0).map((c) => c.y)).size, `${skill.id} L${level} groups wrap`).toBe(1);
          }
    expect(positional).toBeGreaterThan(500);
  });

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
          expect(Math.min(...seq)).toBeGreaterThanOrEqual(step === 10 ? 0 : 1);
          if (level === 1) expect(step).toBe(10);
          if (level === 2) expect([step, Number(keyLabel(it)) % 10]).toEqual([1, 0]);
          // A number already on screen is never filler "off-by-one"/"miscounted": picking it is copying, not miscounting.
          for (const w of wrongLabels(it))
            if ([...before, ...after].includes(Number(w))) expect(["off-by-one", "miscounted"]).not.toContain(it.choices!.find((c) => c.label === w)?.why);
        }
  });
});

describe("m.write.20", () => {
  it("levels 1–2: the key is the number of filled boxes, counted one by one; level 3: the number word read back", () => {
    for (const level of levelsOf("m.write.20"))
      for (const [en, es] of both("m.write.20", level)) {
        if (level < 3) {
          const v = en.visual!;
          let counted = 0;
          if (v.kind === "ten-frame") {
            const boxes = (v.frames ?? 1) * 10;
            for (let k = 0; k < boxes; k++) if (k < v.filled) counted++;
            expect(boxes).toBe(level === 1 ? 10 : 20);
            // "Counted the empty boxes" (on from a full first frame) is offered only when a box is empty.
            const empty = boxes - counted;
            for (const w of en.wrong ?? []) if (w.why === "counted-empty-boxes") expect([empty > 0, Number(w.value)]).toEqual([true, boxes === 10 ? empty : 10 + empty]);
          } else if (v.kind === "dots") {
            expect(v.groups.length).toBe(1);
            for (let k = 0; k < v.groups[0]; k++) counted++;
            expect((en.wrong ?? []).some((w) => w.why === "counted-empty-boxes")).toBe(false);
          } else throw new Error("expected a ten-frame or dots");
          expect(num(en.answer)).toBe(counted);
          if (level === 1) expect(counted <= 10).toBe(true);
          else expect(counted >= 11 && counted <= 20).toBe(true);
          expect(/dots|puntos/.test(text(es))).toBe(v.kind === "dots");
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
            // The picture's counters, counted one by one: two ten-frames, or a group of 10 dots and the ones.
            let pictured = 0;
            if (v.kind === "ten-frame") for (let k = 0; k < (v.frames ?? 1) * 10; k++) pictured += k < v.filled ? 1 : 0;
            else if (v.kind === "dots") {
              expect(v.groups[0]).toBe(10);
              for (const g of v.groups) for (let k = 0; k < g; k++) pictured++;
            } else throw new Error("expected a ten-frame or dots");
            const nums = ints(t);
            if (/how many more|cuántos más/.test(t)) {
              const n = nums.find((x) => x > 10)!;
              expect(10 + key).toBe(n);
              expect(pictured).toBe(n);
            } else {
              const k = nums.find((x) => x < 10)!;
              expect(key - 10).toBe(k);
              expect(pictured).toBe(key);
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
      for (const h of en.hints) {
        expect(h, "1 are").not.toMatch(/\b1 are\b/);
        expect(h, "the second group is the answer").not.toMatch(/second group/);
      }
    }
    for (const it of items("m.decompose.10", 1, "es")) for (const h of it.hints) expect(h, "1 están").not.toMatch(/\b1 están\b/);
    for (const locale of LOCALES)
      for (const it of items("m.decompose.10", 2, locale)) {
        const n = ints(text(it))[0];
        expect(sumLine(keyLabel(it))).toBe(n);
        for (const w of wrongLabels(it)) expect(sumLine(w), `${w} also makes ${n}`).not.toBe(n);
        expect(n).toBeLessThanOrEqual(10);
        // "1 + 10" and "10 + 1" are one choice to a child who knows order does not matter.
        const pairs = it.choices!.map((c) => terms(c.label).sort((a, b) => a - b).join("+"));
        expect(new Set(pairs).size, `swapped pair in ${it.choices!.map((c) => c.label)}`).toBe(pairs.length);
        // "Another way": the way on screen is never offered again, in either order.
        const shownWay = /^\d+ = (\d+) \+ (\d+)\./.exec(text(it));
        if (shownWay) {
          expect(Number(shownWay[1]) + Number(shownWay[2])).toBe(n);
          expect(pairs, text(it)).not.toContain([Number(shownWay[1]), Number(shownWay[2])].sort((a, b) => a - b).join("+"));
        }
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
  // Typical lengths in inches, kept here apart from the generator: a longer thing is never said to be shorter.
  const TYPICAL: Record<string, number> = { pencil: 7, crayon: 3.5, spoon: 6, key: 2.5, carrot: 7, paintbrush: 8, caterpillar: 1.5, banana: 7, ribbon: 6, sock: 8, book: 10 };
  it("level 1: the blocks in the row, counted; level 2: the shorter length plus the answer is the longer; level 3: gaps undercount, overlaps overcount", () => {
    for (const it of items("m.measure.units", 1)) {
      const v = it.visual!;
      // Units laid end to end: one bar of equal parts, every part a block (no gaps, unlike a row of dots).
      if (v.kind !== "fraction") throw new Error("expected a row of touching blocks");
      expect(v.shaded).toBe(v.parts);
      let blocks = 0;
      for (let k = 0; k < v.parts; k++) blocks++;
      expect(num(it.answer)).toBe(blocks);
      expect(it.markable).toBeUndefined();
      const thing = /long is the (\w+)\?$/.exec(text(it))![1];
      expect(Math.abs(blocks - TYPICAL[thing]), `a ${blocks}-inch ${thing}`).toBeLessThanOrEqual(4);
    }
    for (const locale of LOCALES)
      for (const it of items("m.measure.units", 2, locale)) {
        const [a, b] = ints(text(it));
        expect(b + num(it.answer)).toBe(a);
        if (locale === "en") {
          const [, A, B] = /^The (\w+) is \d+ blocks long\. The (\w+) is/.exec(text(it))!;
          expect(TYPICAL[A], `${A} (${a}) longer than ${B} (${b})`).toBeGreaterThan(TYPICAL[B]);
          expect(it.alt).toBe(`A ${A}`);
        }
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

// Equal shares built on the fraction bar, read back from the words with this file's own tables.
const SHARE_EN: Record<string, number> = { half: 2, halves: 2, third: 3, thirds: 3, fourth: 4, fourths: 4, quarter: 4, quarters: 4 };
const SHARE_ES: Record<string, number> = { mitad: 2, mitades: 2, tercio: 3, tercios: 3, cuarto: 4, cuartos: 4 };
/** [shaded, parts] the words ask for: "The waffle has 4 equal parts. Shade one fourth." or "Cut the log into thirds. Shade 2 thirds." */
function barAsked(t: string, locale: Locale): [number, number] {
  const table = locale === "es" ? SHARE_ES : SHARE_EN;
  const fixed = locale === "es" ? /^(.+) tiene (\d) partes iguales\. Colorea (.+)\.$/.exec(t) : /^The (.+) has (\d) equal parts\. Shade (.+)\.$/.exec(t);
  const cut = locale === "es" ? /^Divide (.+) en (\w+)\. Colorea (.+)\.$/.exec(t) : /^Cut the (.+) into (\w+)\. Shade (.+)\.$/.exec(t);
  const m = fixed ?? cut;
  if (!m) throw new Error(`not a bar prompt: ${t}`);
  const parts = fixed ? Number(m[2]) : table[m[2]];
  const what = m[3];
  let k: RegExpExecArray | null;
  if ((k = /^(?:one|una|un) (\w+)$/.exec(what))) return expect(table[k[1]]).toBe(parts), [1, parts];
  if (/^both halves$/.test(what)) return expect(parts).toBe(2), [2, 2];
  if ((k = /^(?:all |(?:las|los) )?(\d) (\w+)$/.exec(what))) return expect(table[k[2]]).toBe(parts), [Number(k[1]), parts];
  if (/^(?:the whole |toda la |todo el )/.test(what)) return [parts, parts];
  throw new Error(`unknown share: ${what}`);
}
/** Every state the bar pad can reach: [shaded, parts]. */
function barStates(pad: Extract<Pad, { kind: "fraction-bar" }>) {
  const out: [number, number][] = [];
  for (const parts of pad.parts ? [pad.parts] : Array.from({ length: pad.maxParts }, (_, i) => i + 1)) for (let s = 0; s <= parts; s++) out.push([s, parts]);
  return out;
}

describe("equal shares on the fraction bar", () => {
  const BARS = [["m.shares.halves", 1], ["m.shares.halves", 2], ["m.shares.thirds", 1]] as const;
  it("exactly one bar the pad can make is right, and it is the cut and shading the words ask for, in both languages", () => {
    for (const [id, level] of BARS)
      for (const [en, es] of both(id, level)) {
        if (en.pad?.kind !== "fraction-bar") throw new Error(`${id} L${level} needs the bar pad`);
        const [k, d] = barAsked(text(en), "en");
        expect(barAsked(text(es), "es"), `${id} L${level} Spanish asks the same`).toEqual([k, d]);
        const right = barStates(en.pad).filter(([s, p]) => check(en.answer, barText(s, p)).correct);
        expect(right, `${id} L${level} "${text(en)}"`).toEqual([[k, d]]);
        if (level === 1 && id === "m.shares.halves") expect(en.pad.parts).toBe(d);
        else expect(en.pad.parts).toBeUndefined();
      }
  });

  it("an uncut bar, or the same amount on another cut, is wrong and named", () => {
    for (const [id, level] of BARS)
      for (const it of items(id, level)) {
        if (it.pad?.kind !== "fraction-bar") throw new Error("pad");
        const [k, d] = barAsked(text(it), "en");
        const states = barStates(it.pad).map(([s, p]) => barText(s, p));
        if (!it.pad.parts) {
          expect(check(it.answer, "1/1").correct).toBe(false);
          expect(misconceptionOf(it, "1/1")).toBe("did-not-cut");
          // Same amount, other cut: 2/4 for one half, 2/2 or 4/4 for all 3 thirds.
          for (const [s, p] of barStates(it.pad)) if (p > 1 && p !== d && s * d === k * p) expect(misconceptionOf(it, barText(s, p)), `${barText(s, p)} for ${k}/${d}`).toMatch(/^made-\w+-not-\w+$/);
        }
        for (const w of it.wrong ?? []) {
          expect(states, `${w.value} cannot be made on the pad`).toContain(w.value);
          expect(misconceptionOf(it, w.value)).toBe(w.why);
        }
        expect(it.wrong?.length ?? 0).toBeGreaterThanOrEqual(1);
      }
  });

  it("the whole the bar stands for varies, so a level is not a handful of items", () => {
    for (const id of ["m.shares.halves", "m.shares.thirds"])
      for (const level of levelsOf(id))
        for (const locale of LOCALES) {
          const seen = new Set(items(id, level, locale).map((it) => JSON.stringify([it.prompt, it.visual, it.picture])));
          expect(seen.size, `${id} L${level} ${locale}`).toBeGreaterThanOrEqual(12);
        }
  });
});

describe("m.shares.halves", () => {
  const PARTS: Record<string, number> = { halves: 2, fourths: 4 };
  it("level 3: names the shaded share, compares a half with a fourth, counts the shares in a whole", () => {
    for (const it of items("m.shares.halves", 3)) {
      const t = text(it);
      let m: RegExpExecArray | null;
      if ((m = /^What part of the (.+) is shaded\?$/.exec(t))) {
        const v = it.visual!;
        if (v.kind !== "fraction") throw new Error("expected a bar");
        expect(keyLabel(it)).toBe(v.shaded === v.parts ? `The whole ${m[1]}` : v.parts === 2 ? "One half" : "One fourth");
      } else if (/Which share/.test(t)) {
        const half = 1 / 2, fourth = 1 / 4;
        expect(keyLabel(it)).toBe(/bigger/.test(t) === half > fourth ? "One half" : "One fourth");
        // The hints never state the rule that answers the question.
        for (const h of it.hints) expect(h).not.toMatch(/means smaller|means bigger/);
      } else {
        const d = PARTS[/^How many (\w+) make the whole/.exec(t)![1]];
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
    compare: /How many (more|\w+ longer)/, fewer: /fewer/, more: /more/, "add-take": /now/, "take-add": /now/, "take-take": /left|still in/, goal: /goal/,
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
        // A hint's arithmetic shows the answer only if the story already shows that number.
        for (const h of en.hints)
          for (const [l, r] of equations(h))
            if ([...ints(l), ...ints(r)].includes(key)) expect(x, `hint "${h}" shows the answer ${key}`).toContain(key);
        // Take some away, then some come back: never more come back than went away.
        if (s.kind === "take-add") expect(x[2], text(en)).toBeLessThanOrEqual(x[1]);
        kinds.add(s.kind);
      }
      expect([...kinds].sort()).toEqual([...LEVEL_KINDS[level - 1]].sort());
    }
  });
});

describe("m.place.1000", () => {
  // Place words, kept here apart from the generator: what one of each is worth.
  const WORTH: Record<string, number> = { hundred: 100, hundreds: 100, ten: 10, tens: 10, one: 1, ones: 1, centena: 100, centenas: 100, decena: 10, decenas: 10, unidad: 1, unidades: 1 };
  it("blocks are counted one by one; a digit's value comes from its position; the missing count or bundle makes the number", () => {
    for (const it of items("m.place.1000", 1)) {
      const v = it.visual!;
      if (v.kind !== "base-ten") throw new Error("expected blocks");
      let total = 0;
      for (let k = 0; k < (v.hundreds ?? 0); k++) total += 100;
      for (let k = 0; k < v.tens; k++) total += 10;
      for (let k = 0; k < v.ones; k++) total += 1;
      expect(num(it.answer)).toBe(total);
      // Never flats alone, where "3 flats make 300" would be the answer.
      expect(v.tens + v.ones).toBeGreaterThan(0);
    }
    for (const it of items("m.place.1000", 2)) {
      const m = /value of the (\d) in (\d+)/.exec(text(it))!;
      const digits = m[2].split("");
      expect(digits.filter((d) => d === m[1]).length).toBe(1);
      const pos = digits.indexOf(m[1]);
      expect(keyLabel(it)).toBe(m[1] + "0".repeat(digits.length - 1 - pos));
    }
    const kinds = new Set<string>();
    for (const locale of LOCALES)
      for (const it of items("m.place.1000", 3, locale)) {
        const key = num(it.answer);
        // Put the key in the blank and add up every "count place" pair on the right of the "=".
        const [left, right] = text(it).replace("▢", String(key)).split(" = ");
        const pairs = [...right.matchAll(/(\d+) (\p{L}+)/gu)].map((m) => Number(m[1]) * WORTH[m[2]]);
        const valueOf = (s: string) => {
          const named = [...s.matchAll(/(\d+) (\p{L}+)/gu)];
          return named.length ? named.reduce((t, m) => t + Number(m[1]) * WORTH[m[2]], 0) : Number(s);
        };
        if (/^\d+$/.test(left)) {
          expect(pairs.length, text(it)).toBe(3);
          expect(pairs.reduce((a, b) => a + b, 0), text(it)).toBe(Number(left));
          expect(key).toBeLessThanOrEqual(9);
          kinds.add("units");
        } else {
          expect(valueOf(left), text(it)).toBe(valueOf(right));
          kinds.add(/hundred|centena/.test(left) ? "hundreds-as-tens" : "tens");
        }
        expect(it.say).toMatch(/blank|espacio|how many|cuántas|what number|qué número/i);
      }
    expect([...kinds].sort()).toEqual(["hundreds-as-tens", "tens", "units"]);
  });
});

describe("m.read.1000", () => {
  it("expanded form is evaluated; number words are read back; the missing expanded part makes the number", () => {
    for (const it of items("m.read.1000", 1)) expect(shown(text(it).split("=")[0])).toBe(num(it.answer));
    for (const [en, es] of both("m.read.1000", 2))
      for (const it of [en, es]) {
        const w = /(?:number|número) (.+)\.$/.exec(text(it))!;
        expect(readWords(w[1], it === en ? "en" : "es")).toBe(num(it.answer));
      }
    const kinds = new Set<string>();
    for (const [en, es] of both("m.read.1000", 3))
      for (const it of [en, es]) {
        const locale: Locale = it === en ? "en" : "es";
        const t = text(it);
        if (it.input === "choices") {
          const n = ints(t)[0];
          expect(readWords(keyLabel(it), locale)).toBe(n);
          for (const lab of wrongLabels(it)) expect(readWords(lab, locale)).not.toBe(n);
          expect(it.choices!.length, `${n}: a guess between two`).toBeGreaterThanOrEqual(3);
          kinds.add("words");
        } else {
          const [n, sum] = t.replace("▢", String(num(it.answer))).split(" = ");
          expect(shown(sum)).toBe(Number(n));
          // Expanded form: each part is one digit followed by zeros.
          for (const p of sum.split(" + ")) expect(p, t).toMatch(/^[1-9]0*$/);
          kinds.add("expanded");
        }
      }
    expect([...kinds].sort()).toEqual(["expanded", "words"]);
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
      for (const c of it.choices!) expect(["looked-at-the-tens-digit", "thought-zero-is-odd"]).not.toContain(c.why);
    }
    for (const it of items("m.odd.even", 2)) expect(keyLabel(it)).toBe(parity(ints(text(it))[0]));
    for (const it of items("m.odd.even", 3)) {
      const t = text(it);
      if (/double and 1 more/.test(t)) {
        // An odd number: the key is a double plus 1, and no wrong choice is one.
        const n = ints(t)[0];
        const [p, q, one] = terms(keyLabel(it));
        expect([p, one, p + q + one, parity(n)]).toEqual([q, 1, n, "Odd"]);
        for (const w of wrongLabels(it)) {
          const [x, y, z] = terms(w);
          expect(x === y && x + y + z === n, `${w} is also a double and 1 for ${n}`).toBe(false);
        }
      } else if (/double/.test(t)) {
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
  // Coins go by their US names in Spanish too, so the Spanish item also asks what each coin is worth.
  const coinsEs = (s: string) => {
    expect(s, "Spanish coin list states a value").not.toMatch(/monedas? de \d|\d+ de \d+¢|\d+ centavos? y/);
    return coinsEn(s);
  };
  /** The same coins, valued by a child who thinks a nickel is 10¢ and a dime 5¢. */
  const SWAPPED: Record<string, number> = { ...COIN, nickel: 10, nickels: 10, dime: 5, dimes: 5 };
  const swappedEn = (s: string) => [...s.matchAll(/(\d+) (pennies|penny|nickels?|dimes?|quarters?)\b/g)].reduce((t, m) => t + Number(m[1]) * SWAPPED[m[2]], 0);
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
          // The swap tag sits on exactly the set a nickel-dime swapper would pick, and nowhere else.
          for (const c of en.choices!) if (c.why) expect(swappedEn(c.label) === target, `${c.label} tagged ${c.why} for ${target}¢`).toBe(c.why === "swapped-nickel-and-dime");
          const key = keyLabel(en);
          if (swappedEn(key) !== target) expect(en.choices!.some((c) => c.why === "swapped-nickel-and-dime"), `${key}: no swap set`).toBe(true);
          expect(en.choices!.length).toBeGreaterThanOrEqual(3);
          expect(level).toBe(3);
        } else if (/dollars/.test(te)) {
          expect([billsEn(te), billsEs(ts)]).toEqual([num(en.answer), num(en.answer)]);
          expect(level).toBe(3);
        } else {
          expect([coinsEn(te), coinsEs(ts)]).toEqual([num(en.answer), num(en.answer)]);
          expect(/quarter/.test(te)).toBe(level === 2);
          expect(num(en.answer)).toBeLessThan(100);
          const swapped = en.wrong?.find((w) => w.why === "swapped-nickel-and-dime");
          if (swappedEn(te) !== coinsEn(te)) expect(Number(swapped?.value)).toBe(swappedEn(te));
          else expect(swapped).toBeUndefined();
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
        // The thing is not drawn on the ruler, so the description must not say it is.
        expect(it.alt).not.toMatch(/lies on|está encima/);
      }
    for (const locale of LOCALES)
      for (const it of items("m.measure.ruler", 3, locale)) {
        const t = text(it);
        if (it.input === "keypad") {
          const [a, b] = ints(t);
          expect(b + num(it.answer)).toBe(a);
          // Read aloud and in the sentence, units are words; the short form only follows the answer box.
          expect(it.say, "unit abbreviation in say").not.toMatch(/\d\s*(in|cm|pulg)\b/);
          expect(t.split("▢")[0], "unit abbreviation in the sentence").not.toMatch(/\d\s*(in|cm|pulg)\b/);
          expect(t.split("▢")[1].trim()).toMatch(locale === "es" ? /^(pulg\.|cm)$/ : /^(in\.|cm)$/);
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
    const shaded = new Set<string>();
    for (const it of items("m.shares.thirds", 1)) {
      const [k, d] = barAsked(text(it), "en");
      expect(answerText(it.answer)).toBe(`${k}/${d}`);
      shaded.add(k === 1 ? "one" : k === d ? "all" : "some");
    }
    expect([...shaded].sort()).toEqual(["all", "one", "some"]);
    for (const it of items("m.shares.thirds", 2)) {
      const v = it.visual!;
      if (v.kind !== "fraction") throw new Error("expected a bar");
      expect(v.shaded).toBe(1);
      const t = text(it);
      const plural = /How many (\w+) make the whole/.exec(t)?.[1];
      if (plural) expect([D[plural], keyLabel(it)]).toEqual([v.parts, `${v.parts} ${plural}`]);
      else {
        expect(t).toMatch(/^What part of the .+ is shaded\?$/);
        expect(keyLabel(it)).toBe(`One ${NAME[v.parts]}`);
      }
    }
    for (const it of items("m.shares.thirds", 3)) {
      const t = text(it);
      const cut = [...t.matchAll(/cut into (\w+)\./g)].map((m) => D[m[1]]);
      if (cut.length === 2) {
        const [p, q] = cut;
        const bigger = 1 / p > 1 / q ? p : q, smaller = bigger === p ? q : p;
        expect(keyLabel(it)).toBe(`One ${NAME[/bigger/.test(t) ? bigger : smaller]}`);
        for (const h of it.hints) expect(h).not.toMatch(/means smaller|means bigger/);
      } else expect(keyLabel(it)).toBe(`One ${NAME[ints(t)[0]]}`);
    }
  });
});
