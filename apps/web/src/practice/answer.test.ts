import { describe, expect, it } from "vitest";
import { answerText, check, misconceptionOf, normTime, parseNumber } from "./answer";
import { equivalent, isFactored, parse } from "./expr";
import type { Answer, ItemBody } from "./types";

const eq = (a: string, b: string) => equivalent(parse(a)!, parse(b)!);

describe("parseNumber", () => {
  it("reads the ways people type numbers", () => {
    expect(parseNumber("12")?.value).toBe(12);
    expect(parseNumber("−3")?.value).toBe(-3);
    expect(parseNumber(".5")?.value).toBe(0.5);
    expect(parseNumber("1,200")?.value).toBe(1200);
    expect(parseNumber("3/4")).toEqual({ value: 0.75, n: 3, d: 4 });
    expect(parseNumber("1 1/2")).toEqual({ value: 1.5, n: 3, d: 2 });
    expect(parseNumber("-2/3")?.value).toBeCloseTo(-2 / 3);
    expect(parseNumber("x = 4")?.value).toBe(4);
    expect(parseNumber("3/0")).toBeNull();
    expect(parseNumber("abc")).toBeNull();
  });
});

describe("check", () => {
  it("numbers", () => {
    expect(check({ kind: "number", value: 7 }, "7").correct).toBe(true);
    expect(check({ kind: "number", value: 7 }, "7.0").correct).toBe(true);
    expect(check({ kind: "number", value: 7 }, "8").correct).toBe(false);
    expect(check({ kind: "number", value: 7 }, "").correct).toBe(false);
    expect(check({ kind: "number", value: 31.4, tolerance: 0.05 }, "31.42").correct).toBe(true);
  });

  it("fractions: equivalent values, and simplest form when asked", () => {
    const half = { kind: "fraction", n: 1, d: 2 } as const;
    expect(check(half, "2/4").correct).toBe(true);
    expect(check(half, "0.5").correct).toBe(true);
    expect(check({ ...half, simplest: true }, "2/4")).toEqual({ correct: false, form: "simplest" });
    expect(check({ ...half, simplest: true }, "1/2").correct).toBe(true);
    expect(check({ kind: "fraction", n: 7, d: 4, simplest: true }, "1 3/4").correct).toBe(true);
    expect(check({ kind: "fraction", n: 7, d: 4, simplest: true }, "7/4").correct).toBe(true);
    expect(check({ kind: "fraction", n: 6, d: 3, simplest: true }, "2").correct).toBe(true);
    expect(check({ kind: "fraction", n: 6, d: 3, simplest: true }, "6/3").correct).toBe(false);
  });

  it("remainders", () => {
    expect(check({ kind: "remainder", q: 7, r: 2 }, "7 R 2").correct).toBe(true);
    expect(check({ kind: "remainder", q: 7, r: 2 }, "7r2").correct).toBe(true);
    expect(check({ kind: "remainder", q: 7, r: 0 }, "7").correct).toBe(true);
    expect(check({ kind: "remainder", q: 7, r: 2 }, "7 R 3")).toEqual({ correct: false, form: "remainder" });
  });

  it("sets and pairs", () => {
    expect(check({ kind: "set", values: [2, -3] }, "-3, 2").correct).toBe(true);
    expect(check({ kind: "set", values: [2, -3] }, "x = 2 or x = −3").correct).toBe(true);
    expect(check({ kind: "set", values: [2, -3] }, "2 or -3").correct).toBe(true);
    expect(check({ kind: "set", values: [2, -3] }, "2").correct).toBe(false);
    expect(check({ kind: "pair", x: 3, y: -1 }, "(3, -1)").correct).toBe(true);
    expect(check({ kind: "pair", x: 3, y: -1 }, "(-1, 3)").correct).toBe(false);
  });

  it("expressions, with form rules", () => {
    expect(check({ kind: "expr", expr: "2x+6" }, "2(x+3)").correct).toBe(true);
    expect(check({ kind: "expr", expr: "2x+6", form: "expanded" }, "2(x+3)")).toEqual({ correct: false, form: "expanded" });
    expect(check({ kind: "expr", expr: "x^2+5x+6", form: "factored" }, "(x+2)(x+3)").correct).toBe(true);
    expect(check({ kind: "expr", expr: "x^2+5x+6", form: "factored" }, "x^2+5x+6")).toEqual({ correct: false, form: "factored" });
    expect(check({ kind: "expr", expr: "3x-4" }, "y = 3x − 4").correct).toBe(true);
    // Typing the question back is not simplifying it.
    expect(check({ kind: "expr", expr: "x^7", form: "simplified" }, "x^4*x^3")).toEqual({ correct: false, form: "simplified" });
    expect(check({ kind: "expr", expr: "x^7", form: "simplified" }, "x^7").correct).toBe(true);
    expect(check({ kind: "expr", expr: "5x+2", form: "expanded" }, "3x + 2x + 2")).toEqual({ correct: false, form: "expanded" });
    expect(check({ kind: "expr", expr: "5x+2", form: "expanded" }, "2 + 5x").correct).toBe(true);
  });

  it("expanded and simplified answers have the arithmetic done", () => {
    // Distributing without working out the products is not the expanded answer.
    const expanded = (expr: string) => (typed: string) => check({ kind: "expr", expr, form: "expanded" }, typed);
    const key = expanded("16t + 64");
    for (const typed of ["8*8 + 8*2t", "64 + 2t*8", "8·2t + 64", "16t + 8*8", "-8*-8 + 16t", "32t/2 + 64", "2^4t + 64"]) {
      expect(key(typed), typed).toEqual({ correct: false, form: "expanded" });
    }
    for (const typed of ["16t + 64", "64 + 16t", "t*16 + 64", "16 t+64"]) expect(key(typed).correct, typed).toBe(true);
    expect(expanded("8p + 4")("4*1 + 4*2p")).toEqual({ correct: false, form: "expanded" });
    expect(expanded("21 + 28x")("7*3 + 7*4x")).toEqual({ correct: false, form: "expanded" });
    expect(expanded("21 + 28x")("21 + 4x*7")).toEqual({ correct: false, form: "expanded" });
    // A fraction coefficient, a decimal and π are worked-out numbers.
    expect(expanded("x/2 + 3")("1/2x + 3").correct).toBe(true);
    expect(expanded("x/2 + 3")("x/2 + 3").correct).toBe(true);
    expect(expanded("0.5x + 3")("0.5x + 3").correct).toBe(true);
    expect(expanded("2πr + 6")("2πr + 6").correct).toBe(true);
    expect(check({ kind: "expr", expr: "6x^5", form: "simplified" }, "2*3x^5")).toEqual({ correct: false, form: "simplified" });
    expect(check({ kind: "expr", expr: "6x^5", form: "simplified" }, "6x^5").correct).toBe(true);
  });

  it("text answers ignore case, accents and punctuation", () => {
    expect(check({ kind: "text", accept: ["their"] }, " Their. ").correct).toBe(true);
    expect(check({ kind: "text", accept: ["sustantivo"] }, "Sustantívo").correct).toBe(true);
    expect(check({ kind: "text", accept: ["there"] }, "their").correct).toBe(false);
  });

  it("choices", () => {
    expect(check({ kind: "choice", index: 2 }, 2).correct).toBe(true);
    expect(check({ kind: "choice", index: 2 }, 1).correct).toBe(false);
    // The index as text never counts (a choice labelled "2" must not be read as the choice at index 2).
    expect(check({ kind: "choice", index: 2 }, answerText({ kind: "choice", index: 2 })).correct).toBe(false);
    expect(check({ kind: "choice", index: 2 }, " 2 ").correct).toBe(false);
    expect(check({ kind: "choice", index: 0 }, "").correct).toBe(false);
    expect(check({ kind: "choice", index: 2 }, "1").correct).toBe(false);
    expect(check({ kind: "choice", index: 2 }, "2.5").correct).toBe(false);
  });

  it("a choice response is the chosen index, never its label (callers map a label to its index)", () => {
    const answer: Answer = { kind: "choice", index: 1 };
    const choices = [{ label: "5/12" }, { label: "5/6" }];
    expect(answerText(answer, choices)).toBe("5/6");
    expect(check(answer, answerText(answer, choices)).correct).toBe(false);
    expect(check(answer, "1").correct).toBe(false);
    expect(check(answer, choices.findIndex((c) => c.label === "5/6")).correct).toBe(true);
  });
});

describe("expressions", () => {
  it("implicit multiplication and powers", () => {
    expect(eq("2x", "x+x")).toBe(true);
    expect(eq("(x+1)(x-2)", "x^2-x-2")).toBe(true);
    expect(eq("3(x+1)", "3x+3")).toBe(true);
    expect(eq("x²", "x*x")).toBe(true);
    expect(eq("-x^2", "-(x^2)")).toBe(true);
    expect(eq("2x+3y", "3y+2x")).toBe(true);
    expect(eq("x^-2", "1/x^2")).toBe(true);
    expect(eq("x+1", "x+2")).toBe(false);
  });

  it("rejects what it cannot read", () => {
    expect(parse("2**x")).toBeNull();
    expect(parse("(x+1")).toBeNull();
    expect(parse("alert(1)")).toBeNull();
    expect(parse("")).toBeNull();
  });

  it("knows factored form", () => {
    expect(isFactored(parse("(x+2)(x+3)")!)).toBe(true);
    expect(isFactored(parse("2(x+1)(x-1)")!)).toBe(true);
    expect(isFactored(parse("(x+3)^2")!)).toBe(true);
    expect(isFactored(parse("x^2+5x+6")!)).toBe(false);
    expect(isFactored(parse("x(x+5)")!)).toBe(true);
  });
});

describe("touch-pad responses", () => {
  it("number line: a tapped point is a number or a fraction", () => {
    expect(check({ kind: "number", value: -2 }, "-2").correct).toBe(true);
    expect(check({ kind: "number", value: -2 }, "−2").correct).toBe(true);
    expect(check({ kind: "number", value: -2 }, "2").correct).toBe(false);
    expect(check({ kind: "number", value: 0.75 }, "3/4").correct).toBe(true);
    expect(check({ kind: "fraction", n: 3, d: 4 }, "3/4").correct).toBe(true);
    expect(check({ kind: "fraction", n: 5, d: 4 }, "5/4").correct).toBe(true);
    expect(check({ kind: "fraction", n: 3, d: 4 }, "4/3").correct).toBe(false);
    expect(check({ kind: "fraction", n: 1, d: 4 }, "-1/4").correct).toBe(false);
  });

  it("fraction bar: shaded over parts, any equal amount", () => {
    expect(check({ kind: "fraction", n: 3, d: 4 }, "3/4").correct).toBe(true);
    expect(check({ kind: "fraction", n: 3, d: 4 }, "6/8").correct).toBe(true);
    expect(check({ kind: "fraction", n: 3, d: 4 }, "3/8").correct).toBe(false);
    expect(check({ kind: "fraction", n: 3, d: 4 }, "0/4").correct).toBe(false);
    expect(check({ kind: "fraction", n: 2, d: 3 }, "2/3").correct).toBe(true);
  });

  it("clock: h:mm, with a leading zero or another separator read as the same time", () => {
    const at: Answer = { kind: "text", accept: ["3:05"] };
    expect(check(at, "3:05").correct).toBe(true);
    expect(check(at, "03:05").correct).toBe(true);
    expect(check(at, "3.05").correct).toBe(true);
    expect(check(at, " 3 : 05 ").correct).toBe(true);
    expect(check(at, "3:50").correct).toBe(false);
    expect(check(at, "5:03").correct).toBe(false);
    expect(check(at, "305").correct).toBe(false);
    expect(check({ kind: "text", accept: ["12:00"] }, "12:00").correct).toBe(true);
    expect(check({ kind: "text", accept: ["12:00"] }, "2:00").correct).toBe(false);
    expect(check({ kind: "text", accept: ["03:30"] }, "3:30").correct).toBe(true);
  });

  it("normTime only reads clock times", () => {
    expect(normTime("03:05")).toBe("3:05");
    expect(normTime("12:30")).toBe("12:30");
    expect(normTime("7h15")).toBe("7:15");
    expect(normTime("3:5")).toBeNull();
    expect(normTime("3:75")).toBeNull();
    expect(normTime("noon")).toBeNull();
  });

  it("answerText writes times the way the clock pad does", () => {
    expect(answerText({ kind: "text", accept: ["03:05"] })).toBe("3:05");
    expect(answerText({ kind: "text", accept: ["noun", "nouns"] })).toBe("noun");
    expect(answerText({ kind: "number", value: -2 })).toBe("-2");
    expect(answerText({ kind: "fraction", n: 6, d: 8 })).toBe("3/4");
  });
});

describe("misconceptionOf", () => {
  const base = { hints: [], steps: [], seconds: 10, prompt: [], say: "" };
  const choiceItem: ItemBody = {
    ...base,
    input: "choices",
    choices: [{ label: "5/12", why: "added-denominators" }, { label: "5/6" }, { label: "1/6", why: "subtracted" }],
    answer: { kind: "choice", index: 1 },
  };

  it("names the misconception of a chosen distractor", () => {
    expect(misconceptionOf(choiceItem, 0)).toBe("added-denominators");
    expect(misconceptionOf(choiceItem, 2)).toBe("subtracted");
    expect(misconceptionOf(choiceItem, 1)).toBeUndefined();
    expect(misconceptionOf({ ...choiceItem, choices: choiceItem.choices!.map((c) => ({ label: c.label })) }, 0)).toBeUndefined();
  });

  it("matches a typed wrong value under the checker's own normalization", () => {
    const frac: ItemBody = { ...base, input: "fraction", answer: { kind: "fraction", n: 5, d: 6 }, wrong: [{ value: "5/12", why: "added-denominators" }, { value: "2", why: "added-everything" }] };
    expect(misconceptionOf(frac, "5/12")).toBe("added-denominators");
    expect(misconceptionOf(frac, "10/24")).toBe("added-denominators");
    expect(misconceptionOf(frac, "2/1")).toBe("added-everything");
    expect(misconceptionOf(frac, "10/12")).toBeUndefined();
    expect(misconceptionOf(frac, "1/12")).toBeUndefined();
    expect(misconceptionOf(frac, "")).toBeUndefined();

    const num: ItemBody = { ...base, input: "keypad", answer: { kind: "number", value: 12 }, wrong: [{ value: "-12", why: "kept-the-sign" }] };
    expect(misconceptionOf(num, "−12")).toBe("kept-the-sign");
    expect(misconceptionOf(num, "-12.0")).toBe("kept-the-sign");
    expect(misconceptionOf(num, "12")).toBeUndefined();
  });

  it("works for clock times, words, remainders and expressions", () => {
    const clock: ItemBody = { ...base, input: "clock", answer: { kind: "text", accept: ["3:30"] }, wrong: [{ value: "6:15", why: "swapped-hands" }] };
    expect(misconceptionOf(clock, "06:15")).toBe("swapped-hands");
    expect(misconceptionOf(clock, "3:30")).toBeUndefined();
    const word: ItemBody = { ...base, input: "text", answer: { kind: "text", accept: ["their"] }, wrong: [{ value: "there", why: "homophone" }] };
    expect(misconceptionOf(word, "There.")).toBe("homophone");
    const rem: ItemBody = { ...base, input: "remainder", answer: { kind: "remainder", q: 7, r: 2 }, wrong: [{ value: "7 R 9", why: "remainder-too-big" }] };
    expect(misconceptionOf(rem, "7r9")).toBe("remainder-too-big");
    const ex: ItemBody = { ...base, input: "expr", answer: { kind: "expr", expr: "2x+6" }, wrong: [{ value: "2x+3", why: "distributed-to-first-term" }] };
    expect(misconceptionOf(ex, "3 + 2x")).toBe("distributed-to-first-term");
    expect(misconceptionOf(ex, "2(x+3)")).toBeUndefined();
  });
});
