import { describe, expect, it } from "vitest";
import { SKILLS } from "@/practice/skills";
import { matchSkills, sameWord, stem, tokens } from "./skillmatch";

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

describe("sameWord", () => {
  it("matches a word to itself across case, accents and plurals, and nothing else", () => {
    expect(sameWord("Fallacies", "fallacy")).toBe(true);
    expect(sameWord("logical fallacy", "Logical fallacies")).toBe(true);
    expect(sameWord("fracción", "fracciones")).toBe(true);
    expect(sameWord("denominator", "denomination")).toBe(false);
    expect(sameWord("logical", "logical fallacy")).toBe(false);
    expect(sameWord("", "")).toBe(false);
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

  it("a multiplication test links facts without also inventing an equal-groups topic", () => {
    // The facts come first and equal groups is never invented; with the full math map, other skills
    // named "multiplication" (its properties) may follow.
    const mult = matchSkills("multiplication", "math");
    expect(mult[0]).toBe("m.mult.facts");
    expect(mult).not.toContain("m.mult.groups");
    expect(matchSkills("equal groups", "math")[0]).toBe("m.mult.groups");
    // Grade 2's arrays-and-repeated-addition skill is the closer match now that it exists.
    expect(["m.array.add", "m.mult.groups"]).toContain(matchSkills("repeated addition", "math")[0]);
  });

  it("finds nothing when nothing fits", () => {
    expect(matchSkills("nothing related at all")).toEqual([]);
    expect(matchSkills("what is photosynthesis")).toEqual([]);
    expect(matchSkills("hi")).toEqual([]);
    expect(matchSkills("what is")).toEqual([]);
  });

  it("does not mistake an everyday compound for a school word", () => {
    for (const q of ["what is a power plant", "what is a prime minister", "who invented the cell phone", "what is a rock band", "what is a volume knob", "¿qué es un primer ministro?", "¿quién inventó el teléfono celular?"])
      expect(matchSkills(q), q).toEqual([]);
    // A compound is one word that matches only itself: "how does a cell phone work" is not "work" alone
    // ("Titles of works"), and a solar cell, a prison cell or an atom bomb is not the cells or atoms skill.
    for (const q of ["how does a cell phone work", "how does a solar cell work", "life in a prison cell", "battery cells", "what is an atom bomb", "¿qué es una célula solar?"])
      expect(matchSkills(q), q).toEqual([]);
    // The school words themselves still work, next to a compound too.
    expect(matchSkills("what is a prime number")[0]).toBe("m.factors");
    expect(matchSkills("what do plants need")[0]).toBe("s.needs");
    expect(matchSkills("animal cells, not the cell phone")).toContain("s.cells");
    expect(matchSkills("the rock cycle")[0]).toBe("s.rocks");
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
    // "Greek and Latin roots" is the unit name at grade 4 (L.4.4b) and grade 6 (L.6.4b): each grade gets its own.
    for (const [q, g, id] of [
      ["Greek and Latin roots", "4", "e.greek.latin.roots"],
      ["Greek and Latin roots", "6", "e.root.clues"],
      ["Greek and Latin roots", "8", "e.root.clues"],
      ["Raíces griegas y latinas", "4", "e.greek.latin.roots"],
      ["Raíces griegas y latinas", "6", "e.root.clues"],
    ] as const)
      expect(matchSkills(q, "english", 3, g)[0], `${q} grade ${g}`).toBe(id);
  });

  it("a topic word a family of skills shares covers the ones at the learner's grade, then the grades before", () => {
    // Dogfood 2026-10-07 #1: a 7th grader's "math test on equations" linked nothing.
    expect(matchSkills("math test on equations", "math", 3, "7")).toEqual(["m.eq.twostep", "m.eq.onestep"]);
    expect(matchSkills("math test on equations", "math", 3, "8")).toEqual(["m.eq.multistep", "m.eq.twostep", "m.eq.onestep"]);
    // A 4th grader has none yet: the first one, never the later ones beside it.
    expect(matchSkills("equations", "math", 3, "4")).toEqual(["m.eq.onestep"]);
    // Plural or singular, English or Spanish.
    expect(matchSkills("equation quiz", "math", 3, "7")[0]).toBe("m.eq.twostep");
    expect(matchSkills("examen de ecuaciones", "math", 3, "7")[0]).toBe("m.eq.twostep");
    expect(matchSkills("integers test", "math", 3, "7")).toEqual(["m.int.addsub", "m.int.multdiv", "m.int.numberline"]);
    expect(matchSkills("inequalities", "math", 3, "6")).toEqual(["m.ineq.graph"]);
    // A skill named outright still wins over the family.
    expect(matchSkills("one-step equations", "math", 3, "8")[0]).toBe("m.eq.onestep");
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
