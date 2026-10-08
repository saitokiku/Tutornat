import { describe, expect, it } from "vitest";
import { assertSpoken, cardinal, dateWords, digitWords, formBefore, fractionWords, moneyWords, numberWords, ordinal, readLiteral, timeWords, unitWords, yearWords } from "./numbers";

// The speller's parts on their own. What whole sentences sound like is in speakable.golden.test.ts.

describe("cardinals", () => {
  it.each([
    [0, "zero", "cero"],
    [15, "fifteen", "quince"],
    [21, "twenty-one", "veintiuno"],
    [99, "ninety-nine", "noventa y nueve"],
    [100, "one hundred", "cien"],
    [101, "one hundred one", "ciento uno"],
    [500, "five hundred", "quinientos"],
    [1000, "one thousand", "mil"],
    [1250, "one thousand two hundred fifty", "mil doscientos cincuenta"],
    [21000, "twenty-one thousand", "veintiún mil"],
    [1_000_000, "one million", "un millón"],
    [3_000_001, "three million one", "tres millones uno"],
    [-4, "negative four", "menos cuatro"],
  ])("%d", (n, en, es) => {
    expect(cardinal(n, "en")).toBe(en);
    expect(cardinal(n, "es")).toBe(es);
  });

  it("reads past 999,999,999 digit by digit rather than guess", () => {
    expect(cardinal(1_000_000_000, "en")).toBe("one zero zero zero zero zero zero zero zero zero");
  });

  it("says a Spanish one the way the noun after it needs", () => {
    expect(cardinal(1, "es", "f")).toBe("una");
    expect(cardinal(21, "es", "m")).toBe("veintiún");
    expect(cardinal(31, "es", "f")).toBe("treinta y una");
    expect(cardinal(300, "es", "f")).toBe("trescientas");
    expect(formBefore("manzanas", "es")).toBe("f");
    expect(formBefore("canción", "es")).toBe("f");
    expect(formBefore("libros", "es")).toBe("m");
    expect(formBefore("días", "es")).toBe("m");
    expect(formBefore("y", "es")).toBe("alone");
    expect(formBefore("apples", "en")).toBe("alone");
  });
});

describe("ordinals, fractions, dates", () => {
  it("ordinals", () => {
    expect(ordinal(1, "en")).toBe("first");
    expect(ordinal(22, "en")).toBe("twenty-second");
    expect(ordinal(40, "en")).toBe("fortieth");
    expect(ordinal(3, "es")).toBe("tercero");
    expect(ordinal(3, "es", "m", true)).toBe("tercer");
    expect(ordinal(2, "es", "f")).toBe("segunda");
    expect(ordinal(21, "es")).toBe("veintiuno");
  });

  it("fractions: named up to twentieths, hundredths and thousandths; 'over' otherwise", () => {
    expect(fractionWords(1, 4, "en")).toBe("one fourth");
    expect(fractionWords(5, 16, "en")).toBe("five sixteenths");
    expect(fractionWords(3, 100, "en")).toBe("three hundredths");
    expect(fractionWords(5, 17, "en")).toBe("five seventeenths");
    expect(fractionWords(5, 23, "en")).toBe("five over twenty-three");
    expect(fractionWords(1, 2, "en", { mixed: true })).toBe("a half");
    expect(fractionWords(1, 2, "es", { mixed: true })).toBe("medio");
    expect(fractionWords(5, 16, "es")).toBe("cinco dieciseisavos");
    expect(fractionWords(1, 12, "es")).toBe("un doceavo");
    expect(fractionWords(5, 23, "es")).toBe("cinco sobre veintitrés");
    expect(fractionWords(1, 0, "es")).toBeNull();
  });

  it("a Spanish half agrees with the noun after it, and other fractions take 'de'", () => {
    expect(fractionWords(1, 2, "es", { form: "f" })).toBe("media");
    expect(fractionWords(1, 2, "es", { form: "m" })).toBe("medio");
    expect(fractionWords(1, 2, "es")).toBe("un medio");
    expect(fractionWords(1, 2, "es", { mixed: true, form: "f" })).toBe("media");
    expect(fractionWords(3, 4, "es", { form: "f" })).toBe("tres cuartos de");
    expect(fractionWords(3, 4, "es", { mixed: true, form: "f" })).toBe("tres cuartos");
    for (const noun of ["parte", "vez", "base", "clase", "noche", "tarde", "llave", "flor", "imagen", "unidad"]) expect(formBefore(noun, "es"), noun).toBe("f");
    for (const noun of ["coche", "parque", "nombre", "kilo"]) expect(formBefore(noun, "es"), noun).toBe("m");
  });

  it("years in pairs (English)", () => {
    expect(yearWords(1999)).toBe("nineteen ninety-nine");
    expect(yearWords(1905)).toBe("nineteen oh five");
    expect(yearWords(1900)).toBe("nineteen hundred");
    expect(yearWords(1100)).toBe("eleven hundred");
  });

  it("dates by each language's order", () => {
    expect(dateWords(10, 12, "en")).toBe("October twelfth");
    expect(dateWords(3, 4, "es")).toBe("tres de abril");
    expect(dateWords(1, 5, "es")).toBe("primero de mayo");
    expect(dateWords(13, 40, "en")).toBeNull();
  });
});

describe("times, money, units, digits", () => {
  it("clock times", () => {
    expect(timeWords(3, 30, "en")).toBe("three thirty");
    expect(timeWords(3, 5, "en")).toBe("three oh five");
    expect(timeWords(3, 0, "en")).toBe("three o'clock");
    expect(timeWords(3, 0, "en", true)).toBe("three");
    expect(timeWords(3, 30, "es")).toBe("tres y media");
    expect(timeWords(3, 15, "es")).toBe("tres y cuarto");
    expect(timeWords(1, 0, "es")).toBe("una en punto");
    expect(timeWords(3, 75, "en")).toBeNull();
  });

  it("money", () => {
    expect(moneyWords(2, 50, "en")).toBe("two dollars and fifty cents");
    expect(moneyWords(0, 1, "en")).toBe("one cent");
    expect(moneyWords(1, 0, "es")).toBe("un dólar");
    expect(moneyWords(0, 0, "es")).toBe("cero dólares");
  });

  it("units, with Spanish gender and square/cubic", () => {
    expect(unitWords("cm", "en", true)?.words).toBe("centimeter");
    expect(unitWords("cm²", "en", false)?.words).toBe("square centimeters");
    expect(unitWords("in", "es", true)).toEqual({ words: "pulgada", gender: "f" });
    expect(unitWords("m³", "es", false)?.words).toBe("metros cúbicos");
    expect(unitWords("cats", "en", false)).toBeNull();
  });

  it("separators by language", () => {
    expect(readLiteral("1,250", "en")).toEqual({ int: "1250", frac: "", sep: null });
    expect(readLiteral("1.250", "es")).toEqual({ int: "1250", frac: "", sep: null });
    expect(readLiteral("3,5", "es")).toEqual({ int: "3", frac: "5", sep: "," });
    expect(numberWords("3.75", "es")).toBe("tres punto setenta y cinco");
    expect(numberWords("3.1416", "es")).toBe("tres punto uno cuatro uno seis");
    expect(numberWords("3.125", "es")).toBe("tres mil ciento veinticinco"); // a "." before three digits groups thousands
    expect(numberWords("0.05", "en")).toBe("zero point zero five");
    expect(numberWords("abc", "en")).toBeNull();
    expect(digitWords("741741", "en")).toBe("seven four one seven four one");
  });

  it("warns in development when a digit would reach a voice", () => {
    const warn = console.warn;
    const seen: unknown[] = [];
    console.warn = (...a: unknown[]) => void seen.push(a);
    try {
      assertSpoken("three fourths", "test");
      assertSpoken("3 fourths", "test");
      assertSpoken("Which one?", "test");
      assertSpoken("four ? equals twenty-eight", "test"); // a blank nobody said
    } finally {
      console.warn = warn;
    }
    expect(seen).toHaveLength(2);
  });
});
