import { describe, expect, it } from "vitest";
import { check, parseNumber } from "./answer";
import { equivalent, isFactored, parse } from "./expr";

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

  it("text answers ignore case, accents and punctuation", () => {
    expect(check({ kind: "text", accept: ["their"] }, " Their. ").correct).toBe(true);
    expect(check({ kind: "text", accept: ["sustantivo"] }, "Sustantívo").correct).toBe(true);
    expect(check({ kind: "text", accept: ["there"] }, "their").correct).toBe(false);
  });

  it("choices", () => {
    expect(check({ kind: "choice", index: 2 }, 2).correct).toBe(true);
    expect(check({ kind: "choice", index: 2 }, 1).correct).toBe(false);
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
