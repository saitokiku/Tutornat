import { describe, expect, it } from "vitest";
import { fractionWords, hasName, speakable, wordAt } from "./speakable";

const say = (s: string, locale: "en" | "es" = "en", names?: string[]) => speakable(s, locale, names).text;

describe("speakable text", () => {
  it("says fractions as words a child hears in class", () => {
    expect(say("Shade 3/4 of the bar.")).toBe("Shade 3 fourths of the bar.");
    expect(say("1/2 is the same as 2/4.")).toBe("one half is the same as 2 fourths.");
    expect(say("Colorea 3/4 de la barra.", "es")).toBe("Colorea 3 cuartos de la barra.");
    expect(say("1/2 y 1/3", "es")).toBe("un medio y un tercio");
    expect(fractionWords(5, 8, "en")).toBe("5 eighths");
    expect(fractionWords(1, 13, "en")).toBeNull();
  });

  it("leaves things that are not small fractions alone", () => {
    expect(say("Due 10/14.")).toBe("Due 10/14.");
    expect(say("and/or")).toBe("and/or");
  });

  it("says math signs in words", () => {
    expect(say("5 × 2 = 10")).toBe("5 times 2 equals 10");
    expect(say("3×4=12")).toBe("3 times 4 equals 12");
    expect(say("2×3×4")).toBe("2 times 3 times 4");
    expect(say("12 ÷ 3 = 4")).toBe("12 divided by 3 equals 4");
    expect(say("7 - 3 = 4")).toBe("7 minus 3 equals 4");
    expect(say("7-3=4")).toBe("7 minus 3 equals 4");
    expect(say("x^2 + 1")).toBe("x squared plus 1");
    expect(say("3 < 5")).toBe("3 is less than 5");
    expect(say("8 − 5 es 3", "es")).toBe("8 menos 5 es 3");
    expect(say("6 × 7 = 42", "es")).toBe("6 por 7 es igual a 42");
  });

  it("does not turn ranges and dashes into minus", () => {
    expect(say("pages 3-5")).toBe("pages 3-5");
    expect(say("Wait — look again.")).toBe("Wait look again.");
  });

  it("strips markdown, links and emoji", () => {
    expect(say("**Look** at the `top` number.")).toBe("Look at the top number.");
    expect(say("- First, count the dots.")).toBe("First, count the dots.");
    expect(say("## Fractions")).toBe("Fractions");
    expect(say("Read [the Moon](https://en.wikipedia.org/wiki/Moon) page.")).toBe("Read the Moon page.");
    expect(say("More at https://example.org today.")).toBe("More at today.");
    expect(say("Nice 🌙 moon ✨.")).toBe("Nice moon .");
    expect(say("This is *really* big.")).toBe("This is really big.");
    expect(say("$\\frac{1}{2}$ of it")).toBe("one half of it");
  });

  it("keeps money", () => {
    expect(say("It costs $3.")).toBe("It costs $3.");
  });

  it("leaves the learner's name out and keeps the sentence ending", () => {
    expect(say("Your turn, Ada.", "en", ["Ada"])).toBe("Your turn.");
    expect(say("Ada, try the next one.", "en", ["Ada"])).toBe("try the next one.");
    expect(say("Is this Ada's book?", "en", ["Ada"])).toBe("Is this your book?");
    expect(say("Ana's turn.", "en", ["Ana"])).toBe("your turn.");
    expect(say("Mary Ann, look.", "en", ["Mary Ann"])).toBe("look.");
    // An all-lowercase word isn't a capitalized name: "sky" stays for a learner called Sky.
    expect(say("The sky is blue.", "en", ["Sky"])).toBe("The sky is blue.");
  });

  it("finds the name whatever its case, accents or punctuation", () => {
    expect(say("Nice work, Sofia.", "en", ["sofia"])).toBe("Nice work.");
    expect(say("Muy bien, Sofía.", "es", ["Sofia"])).toBe("Muy bien.");
    expect(say("Bien, sofia.", "es", ["Sofía"])).toBe("Bien, sofia."); // lowercase while the name is capitalized: a word, not the name
    expect(say("Good job, ADA.", "en", ["Ada"])).toBe("Good job.");
    expect(say("Nice work, Ada—now try this one.", "en", ["Ada"])).toBe("Nice work, now try this one.");
    expect(say("Ada/Ben, look.", "en", ["Ada"])).toBe("Ben, look.");
    expect(say("¿Lista, Ana?", "es", ["Ana"])).toBe("¿Lista?");
  });

  it("keeps a name that is an everyday word unless it addresses the learner", () => {
    expect(say("Will you try the next one?", "en", ["Will"])).toBe("Will you try the next one?");
    expect(say("Nice work, Will.", "en", ["Will"])).toBe("Nice work.");
    expect(say("Will, try the next one.", "en", ["Will"])).toBe("try the next one.");
    expect(say("Hi Will!", "en", ["Will"])).toBe("Hi!");
    expect(say("Your test is in June.", "en", ["June"])).toBe("Your test is in June.");
    expect(say("Vamos al mar.", "es", ["Mar"])).toBe("Vamos al mar.");
    expect(say("May I help?", "en", ["May"])).toBe("May I help?");
  });

  it("knows when text mentions a name at all", () => {
    expect(hasName("Ada Lovelace", ["ada"])).toBe(true);
    expect(hasName("numerator", ["Ada"])).toBe(false);
    expect(hasName("Sofía", ["Sofia"])).toBe(true);
  });

  it("reads a date as a date, not a fraction", () => {
    expect(say("Your test is on 10/12.")).toBe("Your test is on 10/12.");
    expect(say("The project is due 3/4.")).toBe("The project is due 3/4.");
    expect(say("See you Monday 3/4.")).toBe("See you Monday 3/4.");
    expect(say("El examen es el 3/4.", "es")).toBe("El examen es el 3/4.");
    // Without a calendar word, "on 2/3" is still a fraction.
    expect(say("Work on 2/3 first.")).toBe("Work on 2 thirds first.");
  });

  it("maps every spoken word back to the written word it came from", () => {
    const sp = speakable("Shade 3/4 of it, **Ada**.", "en", ["Ada"]);
    expect(sp.text).toBe("Shade 3 fourths of it.");
    expect(sp.words).toEqual([0, 1, 1, 2, 3]);
    const m = speakable("- 5 × 2", "en");
    expect(m.text).toBe("5 times 2");
    expect(m.words).toEqual([1, 2, 3]);
  });
});

describe("wordAt", () => {
  it("finds the spoken word at a character offset", () => {
    const t = "one two three";
    expect(wordAt(t, 0)).toBe(0);
    expect(wordAt(t, 4)).toBe(1);
    expect(wordAt(t, 5)).toBe(1);
    expect(wordAt(t, 8)).toBe(2);
  });
});
