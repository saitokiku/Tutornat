import { describe, expect, it } from "vitest";
import { isBackchannel, isFillerOnly, isHolding, words } from "./backchannel";
import { echoScore, echoVerdict, foldWords } from "./bargein";

describe("backchannel filter", () => {
  it.each(["mhm", "Mhm.", "mm-hmm", "Mmmhmm", "uh-huh", "ok", "OK.", "okay okay", "yeah", "yes", "oh okay", "got it", "I see", "hmm"])("%s is a backchannel", (t) => {
    expect(isBackchannel(t)).toBe(true);
  });

  it.each(["ajá", "aja", "sí", "si", "Sí, sí.", "vale", "claro", "ya", "de acuerdo", "bueno"])("%s es una señal de escucha", (t) => {
    expect(isBackchannel(t)).toBe(true);
  });

  it.each(["no", "wait", "stop", "ok but why", "yes it's twelve", "espera", "no entiendo", "twelve", "I don't get it", "", "   "])("%j is not", (t) => {
    expect(isBackchannel(t)).toBe(false);
  });

  it("normalizes case, accents, hyphens and long letter runs", () => {
    expect(words("Mm-HMMMM! Sí…")).toEqual(["mmhmm", "si"]);
  });

  it("knows holding phrases: the learner asks for time", () => {
    for (const t of ["wait", "Hold on.", "um, let me think", "espera", "a ver", "déjame pensar", "un momento"]) expect(isHolding(t), t).toBe(true);
    expect(isHolding("it's seven, wait", true)).toBe(true);
    expect(isHolding("it's seven, wait")).toBe(false);
    for (const t of ["seven", "um", "wait it's seven"]) expect(isHolding(t, true), t).toBe(false);
  });

  it("knows floor-holding fillers", () => {
    expect(isFillerOnly("um")).toBe(true);
    expect(isFillerOnly("uh, hmm")).toBe(true);
    expect(isFillerOnly("este")).toBe(true);
    expect(isFillerOnly("um twelve")).toBe(false);
    expect(isFillerOnly("")).toBe(false);
  });
});

describe("echo by word order (recognizers without word times)", () => {
  it("echo verdicts", () => {
    expect(echoVerdict("three fourths", "three fourths of it")).toBe("echo");
    expect(echoVerdict("three", "three fourths")).toBe("maybe");
    expect(echoVerdict("seven", "three fourths")).toBe("no");
    expect(echoVerdict("I think seven", "three fourths")).toBe("no");
  });

  it("echo follows the tutor's words in order; an answer built from them doesn't", () => {
    const q = "Which is bigger, three fourths or two thirds?";
    expect(echoVerdict("two thirds is bigger", q)).toBe("no");
    expect(echoVerdict("bigger is which", q)).toBe("no");
    expect(echoVerdict("which is bigger three fourths", q)).toBe("echo");
    expect(echoVerdict("which is bigger tree fourths", q)).toBe("echo"); // one word misheard
    expect(echoScore(foldWords("two thirds is bigger"), foldWords(q))).toBe(0.5);
  });

  it("compares numbers the way the voice says them, however the recognizer writes them", () => {
    expect(foldWords("5 times 2 equals 10")).toEqual(["five", "times", "two", "equals", "ten"]);
    expect(echoVerdict("5 times 2 equals 10", "five times two equals ten")).toBe("echo");
    expect(echoVerdict("3/4", "Shade 3/4 of it")).toBe("echo");
  });
});
