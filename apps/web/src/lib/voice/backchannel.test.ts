import { describe, expect, it } from "vitest";
import { isBackchannel, isFillerOnly, words } from "./backchannel";
import { echoScore, echoVerdict, echoWords, shouldBargeIn } from "./bargein";

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

  it("knows floor-holding fillers", () => {
    expect(isFillerOnly("um")).toBe(true);
    expect(isFillerOnly("uh, hmm")).toBe(true);
    expect(isFillerOnly("este")).toBe(true);
    expect(isFillerOnly("um twelve")).toBe(false);
    expect(isFillerOnly("")).toBe(false);
  });
});

describe("barge-in rule", () => {
  const base = { speaking: true, onsetAt: 1000, now: 1400 };

  it("cancels on real words after 300 ms of speech", () => {
    expect(shouldBargeIn({ ...base, heard: "wait" })).toBe(true);
    expect(shouldBargeIn({ ...base, heard: "ok so what about the top" })).toBe(true);
  });

  it("does not cancel before 300 ms", () => {
    expect(shouldBargeIn({ ...base, now: 1299, heard: "wait" })).toBe(false);
    expect(shouldBargeIn({ ...base, now: 1300, heard: "wait" })).toBe(true);
  });

  it("never cancels for a backchannel, however long", () => {
    for (const heard of ["mhm", "ok", "ajá", "sí", "yeah yeah", "uh-huh"]) expect(shouldBargeIn({ ...base, now: 5000, heard }), heard).toBe(false);
  });

  it("needs the tutor to be speaking, words, and a known start", () => {
    expect(shouldBargeIn({ ...base, speaking: false, heard: "wait" })).toBe(false);
    expect(shouldBargeIn({ ...base, heard: "" })).toBe(false);
    expect(shouldBargeIn({ ...base, onsetAt: null, heard: "wait" })).toBe(false);
  });

  it("ignores the tutor's own voice coming back through the microphone", () => {
    const tutorRecent = "So we have three fourths of the pizza left";
    expect(shouldBargeIn({ ...base, heard: "three fourths of the pizza", tutorRecent })).toBe(false);
    // One word the tutor just said: wait for the next word before deciding.
    expect(shouldBargeIn({ ...base, heard: "pizza", tutorRecent })).toBe(false);
    expect(shouldBargeIn({ ...base, heard: "pizza is gross", tutorRecent })).toBe(true);
    expect(shouldBargeIn({ ...base, heard: "wait", tutorRecent })).toBe(true);
  });

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
    expect(echoScore(echoWords("two thirds is bigger"), echoWords(q))).toBe(0.5);
  });

  it("compares numbers however the recognizer writes them", () => {
    expect(echoWords("Five times two equals ten")).toEqual(["5", "times", "2", "equals", "10"]);
    expect(echoWords("tres cuartos")).toEqual(["3", "cuartos"]);
    expect(echoVerdict("5 times 2 equals 10", "five times two equals ten")).toBe("echo");
  });
});
