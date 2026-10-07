import { describe, expect, it } from "vitest";
import { SKILLS } from "@/practice/skills";
import { matchSkills, stem, tokens } from "./skillmatch";

describe("stem and tokens", () => {
  it("lets singular and plural meet in both languages", () => {
    expect(stem("fallacies")).toBe(stem("fallacy"));
    expect(stem("fracciones")).toBe(stem("fraccion"));
    expect(stem("phases")).toBe(stem("phase"));
    expect(stem("raices")).toBe(stem("raiz"));
    expect(stem("glasses")).toBe(stem("glass"));
    expect(stem("gases")).toBe("gas");
    expect(stem("thesis")).toBe("thesis");
  });

  it("drops question frames, articles and accents", () => {
    expect(tokens("What is a logical fallacy?")).toEqual(["logical", "fallacy"]);
    expect(tokens("¿Qué es una falacia?")).toEqual(["falacia"]);
    expect(tokens("Las fases de la Luna")).toEqual(["fas", "luna"]);
  });
});

describe("topic → skill", () => {
  // The learner's own words, as typed into Talk or the magic box, and the skill that must come first.
  const FIRST: [string, string][] = [
    ["what is a logical fallacy", "e.fallacies"],
    ["What's a straw man argument?", "e.fallacies"],
    ["is this an ad hominem", "e.fallacies"],
    ["how do I add fractions with different denominators", "m.frac.addunlike"],
    ["help with long division", "m.div.long"],
    ["why does the moon change shape", "s.earth.sun.moon"],
    ["what is a noun", "e.nouns.verbs"],
    ["what is a metaphor", "e.figurative"],
    ["what is a prime number", "m.factors"],
    ["how do you find the slope of a line", "m.slope"],
    ["what is the pythagorean theorem", "m.pythag"],
    ["what is density", "s.density"],
    ["how does the water cycle work", "s.water.cycle"],
    ["what are the states of matter", "s.states.matter"],
    ["what makes a strong thesis statement", "e.thesis"],
    ["what does ethos mean", "e.appeals"],
    ["how to tell time", "m.time.clock"],
    ["what is an atom", "s.atoms"],
    ["area of a circle", "m.circle"],
    ["equivalent fractions", "m.frac.equiv"],
    ["Newton's three laws", "s.newton.laws"],
    ["force equals mass times acceleration", "s.newton"],
    ["what are rhyming words", "e.rhyme"],
    // Spanish
    ["¿Qué es una falacia?", "e.fallacies"],
    ["¿qué es una falacia lógica?", "e.fallacies"],
    ["cómo sumar fracciones con distinto denominador", "m.frac.addunlike"],
    ["las fases de la luna", "s.earth.sun.moon"],
    ["el ciclo del agua", "s.water.cycle"],
    ["tablas de multiplicar", "m.mult.facts"],
    ["división larga", "m.div.long"],
    ["¿qué es un sustantivo?", "e.nouns.verbs"],
    ["¿qué es una metáfora?", "e.figurative"],
    ["números primos", "m.factors"],
    ["la pendiente de una recta", "m.slope"],
    ["el teorema de Pitágoras", "m.pythag"],
    ["¿qué es la densidad?", "s.density"],
    ["estados de la materia", "s.states.matter"],
    ["decir la hora", "m.time.clock"],
    ["¿qué es un átomo?", "s.atoms"],
    ["porcentajes", "m.percent"],
  ];

  it.each(FIRST)("%s → %s", (text, skill) => {
    expect(matchSkills(text)[0]).toBe(skill);
  });

  it("keeps school words working", () => {
    expect(matchSkills("needs more practice with borrowing")).toContain("m.sub.2digit");
    expect(matchSkills("Telling time to the half hour")).toContain("m.time.clock");
    expect(matchSkills("Multiplication test Friday")).toContain("m.mult.facts");
  });

  it("finds nothing when nothing fits", () => {
    expect(matchSkills("nothing related at all")).toEqual([]);
    expect(matchSkills("what is photosynthesis")).toEqual([]);
    expect(matchSkills("hi")).toEqual([]);
    expect(matchSkills("what is")).toEqual([]);
  });

  it("does not mistake calendar words for practice", () => {
    expect(matchSkills("what time is my test")).toEqual([]);
    expect(matchSkills("give me a tip")).toEqual([]);
  });

  it("limits to a subject and breaks ties toward the learner's grade", () => {
    expect(matchSkills("fractions", "science")).toEqual([]);
    const g4 = matchSkills("fractions", undefined, 3, "4");
    expect(g4[0]).toBe("m.frac.unit");
    expect(g4.slice(1).every((id) => SKILLS.find((s) => s.id === id)!.grade === "4")).toBe(true);
  });

  it("a short question that names a skill finds it", () => {
    expect(matchSkills("fallacy")[0]).toBe("e.fallacies");
    expect(matchSkills("slope")[0]).toBe("m.slope");
    expect(matchSkills("Punnett squares")[0]).toBe("s.genetics");
  });

  it("every skill on the map can be found by its own name", () => {
    for (const s of SKILLS) {
      expect(matchSkills(s.title.en, undefined, 5), s.id).toContain(s.id);
      expect(matchSkills(s.title.es, undefined, 5), `${s.id} es`).toContain(s.id);
    }
  });
});
