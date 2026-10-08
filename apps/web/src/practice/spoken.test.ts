import { describe, expect, it } from "vitest";
import { check } from "./answer";
import { makeItem, SKILLS } from "./skills";
import { readSpoken, voiceAnswerable } from "./spoken";
import type { Answer, ItemBody } from "./types";

// Spoken answers to the pad's responses, in English and Spanish. Each row: what the recognizer wrote,
// the item's answer, and the response the pad would have sent (null: can't tell, ask again). The
// code checker then decides, exactly as for a typed answer.

type Item = Pick<ItemBody, "answer" | "choices" | "input">;
const num = (value: number): Item => ({ answer: { kind: "number", value }, input: "keypad" });
const frac = (n: number, d: number, simplest = false): Item => ({ answer: { kind: "fraction", n, d, simplest }, input: "fraction" });
const time = (t: string): Item => ({ answer: { kind: "text", accept: [t] }, input: "clock" });
const choice = (labels: string[], index: number, say?: string[]): Item => ({ answer: { kind: "choice", index }, choices: labels.map((label, i) => ({ label, say: say?.[i] })), input: "choices" });
const set = (values: number[]): Item => ({ answer: { kind: "set", values }, input: "text" });
const pair = (x: number, y: number): Item => ({ answer: { kind: "pair", x, y }, input: "text" });
const rem = (q: number, r: number): Item => ({ answer: { kind: "remainder", q, r }, input: "remainder" });
const mixed: Item = { answer: { kind: "text", accept: ["5 1/2", "5 1 / 2", "5 and 1/2", "5 y 1/2"] }, input: "text" };

type Row = [locale: "en" | "es", said: string, item: Item, response: string | number | null];

const EN: Row[] = [
  // whole numbers
  ["en", "Twelve.", num(12), "12"],
  ["en", "twelve", num(12), "12"],
  ["en", "12", num(12), "12"],
  ["en", "zero", num(0), "0"],
  ["en", "Seven.", num(7), "7"],
  ["en", "nineteen", num(19), "19"],
  ["en", "twenty-one", num(21), "21"],
  ["en", "forty five", num(45), "45"],
  ["en", "a hundred", num(100), "100"],
  ["en", "one hundred and five", num(105), "105"],
  ["en", "one hundred five", num(105), "105"],
  ["en", "two hundred fifty four", num(254), "254"],
  ["en", "nine hundred ninety nine", num(999), "999"],
  ["en", "one thousand", num(1000), "1000"],
  ["en", "twelve hundred", num(1200), "1200"],
  ["en", "1,200", num(1200), "1200"],
  ["en", "nine thousand seven hundred sixty", num(9760), "9760"],
  // negatives
  ["en", "negative two", num(-2), "-2"],
  ["en", "minus two", num(-2), "-2"],
  ["en", "negative nine.", num(-9), "-9"],
  ["en", "-3", num(-3), "-3"],
  // decimals
  ["en", "three point five", num(3.5), "3.5"],
  ["en", "zero point one", num(0.1), "0.1"],
  ["en", "fifteen point one", num(15.1), "15.1"],
  ["en", "point five", num(0.5), null],
  ["en", "6.3", num(6.3), "6.3"],
  // fractions
  ["en", "three fourths", frac(3, 4), "3/4"],
  ["en", "three quarters", frac(3, 4), "3/4"],
  ["en", "three over four", frac(3, 4), "3/4"],
  ["en", "3/4", frac(3, 4), "3/4"],
  ["en", "one half", frac(1, 2), "1/2"],
  ["en", "a half", frac(1, 2), "1/2"],
  ["en", "half", frac(1, 2), "1/2"],
  ["en", "a third", frac(1, 3), "1/3"],
  ["en", "two thirds", frac(2, 3), "2/3"],
  ["en", "five eighths", frac(5, 8), "5/8"],
  ["en", "one thirtieth", frac(1, 30), null],
  ["en", "one over thirty", frac(1, 30), "1/30"],
  ["en", "thirteen fifteenths", frac(13, 15), "13/15"],
  ["en", "negative three halves", frac(-3, 2), "-3/2"],
  // mixed numbers
  ["en", "two and a half", frac(5, 2), "2 1/2"],
  ["en", "two and three fourths", frac(11, 4), "2 3/4"],
  ["en", "one and a half", frac(3, 2), "1 1/2"],
  ["en", "five and a half", mixed, "5 1/2"],
  // times
  ["en", "three thirty", time("3:30"), "3:30"],
  ["en", "half past three", time("3:30"), "3:30"],
  ["en", "quarter past three", time("3:15"), "3:15"],
  ["en", "a quarter to four", time("3:45"), "3:45"],
  ["en", "quarter to one", time("12:45"), "12:45"],
  ["en", "three o'clock", time("3:00"), "3:00"],
  ["en", "one o'clock", time("1:00"), "1:00"],
  ["en", "three oh five", time("3:05"), "3:05"],
  ["en", "It's three fifteen.", time("3:15"), "3:15"],
  ["en", "3:30", time("3:30"), "3:30"],
  // choices
  ["en", "the second one", choice(["sun", "dog", "hat"], 0), 1],
  ["en", "the last one", choice(["sun", "dog", "hat"], 0), 2],
  ["en", "B", choice(["sun", "dog", "hat"], 0), 1],
  ["en", "letter c", choice(["sun", "dog", "hat"], 0), 2],
  ["en", "Sun.", choice(["sun", "dog", "hat"], 0), 0],
  ["en", "I think it's the sun", choice(["sun", "dog", "hat"], 0), 0],
  ["en", "thirteen", choice(["13", "11", "10", "14"], 0), 0],
  ["en", "two", choice(["3", "1", "2", "4"], 2), 2],
  ["en", "less than", choice(["<", ">", "="], 0), 0],
  ["en", "it's greater than", choice(["<", ">", "="], 1), 1],
  ["en", "they're equal", choice(["<", ">", "="], 2), null],
  ["en", "equal", choice(["<", ">", "="], 2), 2],
  ["en", "nine o'clock", choice(["9:00", "3:00", "1:00", "5:00"], 0), 0],
  ["en", "not living", choice(["Not living", "Living"], 0), 0],
  ["en", "living", choice(["Not living", "Living"], 1), 1],
  ["en", "b", choice(["m", "d", "p", "b"], 3), 3],
  ["en", "the sun or the dog", choice(["sun", "dog", "hat"], 0), null],
  // lead-ins, self-corrections, units
  ["en", "I think it's twelve.", num(12), "12"],
  ["en", "Is it twelve?", num(12), "12"],
  ["en", "the answer is forty", num(40), "40"],
  ["en", "ten, no, twelve", num(12), "12"],
  ["en", "ten I mean twelve", num(12), "12"],
  ["en", "twenty centimeters", num(20), "20"],
  ["en", "five apples", num(5), "5"],
  // sets, pairs, remainders
  ["en", "negative eight", set([-8]), "-8"],
  ["en", "three and negative two", set([3, -2]), "3, -2"],
  ["en", "zero, negative three", pair(0, -3), "(0, -3)"],
  ["en", "x is zero and y is negative three", pair(0, -3), "(0, -3)"],
  ["en", "four hundred eighty eight remainder one", rem(488, 1), "488 R 1"],
  ["en", "forty", rem(40, 0), "40"],
  // can't tell: ask again, never call it wrong
  ["en", "I think it's", num(12), null],
  ["en", "twelve or thirteen", num(12), null],
  ["en", "I don't know", num(12), null],
  ["en", "banana", num(12), null],
  ["en", "", num(12), null],
];

const ES: Row[] = [
  ["es", "doce", num(12), "12"],
  ["es", "Doce.", num(12), "12"],
  ["es", "cero", num(0), "0"],
  ["es", "dieciséis", num(16), "16"],
  ["es", "veintiuno", num(21), "21"],
  ["es", "treinta y cinco", num(35), "35"],
  ["es", "cien", num(100), "100"],
  ["es", "ciento cinco", num(105), "105"],
  ["es", "doscientos cincuenta y cuatro", num(254), "254"],
  ["es", "mil", num(1000), "1000"],
  ["es", "mil doscientos", num(1200), "1200"],
  ["es", "dos mil trescientos", num(2300), "2300"],
  ["es", "menos dos", num(-2), "-2"],
  ["es", "menos nueve", num(-9), "-9"],
  ["es", "tres punto cinco", num(3.5), "3.5"],
  ["es", "tres coma cinco", num(3.5), "3.5"],
  ["es", "tres punto setenta y cinco", num(3.75), "3.75"],
  ["es", "cero coma cero cinco", num(0.05), "0.05"],
  ["es", "3,5", num(3.5), "3.5"],
  ["es", "tres cuartos", frac(3, 4), "3/4"],
  ["es", "un medio", frac(1, 2), "1/2"],
  ["es", "medio", frac(1, 2), "1/2"],
  ["es", "dos tercios", frac(2, 3), "2/3"],
  ["es", "un quinto", frac(1, 5), "1/5"],
  ["es", "cinco octavos", frac(5, 8), "5/8"],
  ["es", "siete doceavos", frac(7, 12), "7/12"],
  ["es", "cinco dieciseisavos", frac(5, 16), "5/16"],
  ["es", "tres sobre cuatro", frac(3, 4), "3/4"],
  ["es", "un centésimo", frac(1, 100), "1/100"],
  ["es", "dos y medio", frac(5, 2), "2 1/2"],
  ["es", "dos y tres cuartos", frac(11, 4), "2 3/4"],
  ["es", "dos enteros y tres cuartos", frac(11, 4), "2 3/4"],
  ["es", "cinco y medio", mixed, "5 1/2"],
  ["es", "las tres y media", time("3:30"), "3:30"],
  ["es", "tres y cuarto", time("3:15"), "3:15"],
  ["es", "cuarto para las cuatro", time("3:45"), "3:45"],
  ["es", "las cuatro menos cuarto", time("3:45"), "3:45"],
  ["es", "la una y media", time("1:30"), "1:30"],
  ["es", "las tres en punto", time("3:00"), "3:00"],
  ["es", "tres y cinco", time("3:05"), "3:05"],
  ["es", "son las tres treinta", time("3:30"), "3:30"],
  ["es", "la segunda", choice(["sol", "perro", "gato"], 0), 1],
  ["es", "la última", choice(["sol", "perro", "gato"], 0), 2],
  ["es", "la b", choice(["sol", "perro", "gato"], 0), 1],
  ["es", "el sol", choice(["sol", "perro", "gato"], 0), 0],
  ["es", "trece", choice(["13", "11", "10", "14"], 0), 0],
  ["es", "menor que", choice(["<", ">", "="], 0), 0],
  ["es", "es mayor que", choice(["<", ">", "="], 1), 1],
  ["es", "creo que es doce", num(12), "12"],
  ["es", "es doce", num(12), "12"],
  ["es", "son doce", num(12), "12"],
  ["es", "diez, no, doce", num(12), "12"],
  ["es", "diez digo doce", num(12), "12"],
  ["es", "veinte centímetros", num(20), "20"],
  ["es", "cinco manzanas", num(5), "5"],
  ["es", "menos ocho", set([-8]), "-8"],
  ["es", "tres y menos dos", set([3, -2]), "3, -2"],
  ["es", "cero, menos tres", pair(0, -3), "(0, -3)"],
  ["es", "cuatrocientos ochenta y ocho resto uno", rem(488, 1), "488 R 1"],
  ["es", "no sé", num(12), null],
  ["es", "creo que es", num(12), null],
  ["es", "doce o trece", num(12), null],
];

describe("spoken answers", () => {
  it("has at least 80 rows across English and Spanish", () => {
    expect(EN.length + ES.length).toBeGreaterThanOrEqual(80);
    expect(ES.length).toBeGreaterThanOrEqual(40);
  });

  it.each([...EN, ...ES])("%s: %j", (locale, said, item, response) => {
    const r = readSpoken(said, item, locale);
    expect(r?.response ?? null).toBe(response);
  });

  it("every reading the rows expect is judged right by the code checker (an independent route)", () => {
    for (const [locale, said, item, response] of [...EN, ...ES]) {
      // Choice rows pick different choices of one item; only the one that is its answer must be right.
      if (response == null || (item.answer.kind === "choice" && response !== item.answer.index)) continue;
      const r = readSpoken(said, item, locale)!;
      expect(check(item.answer as Answer, r.response).correct, `${locale}: ${said}`).toBe(true);
    }
  });

  it("knows a plain answer from a hedged one", () => {
    expect(readSpoken("Twelve.", num(12), "en")?.certainty).toBe("sure");
    expect(readSpoken("Twelve?", num(12), "en")?.certainty).toBe("unsure");
    expect(readSpoken("maybe twelve", num(12), "en")?.certainty).toBe("unsure");
    expect(readSpoken("tal vez doce", num(12), "es")?.certainty).toBe("unsure");
  });

  it("shows the reading big: the number, the fraction, the time, the choice's label", () => {
    expect(readSpoken("seven", num(7), "en")?.reading).toBe("7");
    expect(readSpoken("three fourths", frac(3, 4), "en")?.reading).toBe("3/4");
    expect(readSpoken("half past three", time("3:30"), "en")?.reading).toBe("3:30");
    expect(readSpoken("the second one", choice(["sun", "dog", "hat"], 1), "en")?.reading).toBe("dog");
  });

  it("a wrong spoken answer is wrong by the checker, and a right value in the wrong form is reported as form", () => {
    expect(check(num(12).answer, readSpoken("thirteen", num(12), "en")!.response).correct).toBe(false);
    const v = check(frac(1, 2, true).answer, readSpoken("six twelfths", frac(1, 2, true), "en")!.response);
    expect(v).toEqual({ correct: false, form: "simplest" });
  });

  it("can't be answered by voice: spelling-like skills and algebra expressions", () => {
    const expr = { answer: { kind: "expr", expr: "x+1" } as Answer, input: "expr" as const };
    expect(voiceAnswerable("m.expr.simplify", expr)).toBe(false);
    expect(readSpoken("x plus one", expr, "en")).toBeNull();
    for (const id of ["e.cvc.words", "e.capitals", "e.homophones", "e.contractions", "e.commas"]) expect(voiceAnswerable(id, choice(["a", "b"], 0)), id).toBe(false);
    expect(voiceAnswerable("m.add.10", num(2))).toBe(true);
  });

  it("every voice-answerable item's own answer, said in words, reads back as right", () => {
    // The independent route: the answer key, spoken the way a learner would, through the reader and the checker.
    const ORDINAL = ["first", "second", "third", "fourth"];
    const say: Record<string, (a: Answer) => string | null> = {
      number: (a) => (a.kind === "number" && Number.isInteger(a.value) && a.value >= 0 && a.value < 1000 ? words(a.value) : null),
      fraction: (a) => (a.kind === "fraction" && a.n > 0 && a.n < a.d && a.d <= 12 ? `${words(a.n)} over ${words(a.d)}` : null),
      choice: (a) => (a.kind === "choice" && a.index < ORDINAL.length ? `the ${ORDINAL[a.index]} one` : null),
    };
    let tried = 0;
    for (const s of SKILLS)
      for (let lv = 1; lv <= s.levels; lv++) {
        const item = makeItem(s.id, lv, 3, "en");
        if (!voiceAnswerable(s.id, item)) continue;
        const spoken = say[item.answer.kind]?.(item.answer);
        if (!spoken) continue;
        const r = readSpoken(spoken, item, "en");
        expect(r, `${s.id} ${spoken}`).not.toBeNull();
        expect(check(item.answer, r!.response).correct, `${s.id} L${lv}: ${spoken}`).toBe(true);
        tried++;
      }
    expect(tried).toBeGreaterThan(80);
  });
});

/** 0–999 in English words, written here independently of the reader. */
function words(n: number): string {
  const ones = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(" ");
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ` ${ones[n % 10]}` : "");
  return `${ones[Math.floor(n / 100)]} hundred${n % 100 ? ` ${words(n % 100)}` : ""}`;
}
