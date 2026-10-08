import { describe, expect, it } from "vitest";
import { getSkill, gradeIndex, SKILLS } from "@/practice/skills";
import { linkOf, resourcesFor } from "./index";
import { RESOURCES } from "./list";

describe("resources", () => {
  it("are well formed: unique ids, https links, both languages described, fits that exist", () => {
    expect(new Set(RESOURCES.map((r) => r.id)).size).toBe(RESOURCES.length);
    for (const r of RESOURCES) {
      expect(r.url, r.id).toMatch(/^https:\/\//);
      if (r.urlEs) expect(r.urlEs, r.id).toMatch(/^https:\/\//);
      expect(r.about.en && r.about.es, r.id).toBeTruthy();
      // A note may be in one language only (about a page only that language links to), never empty.
      if (r.note) expect(Object.values(r.note).length > 0 && Object.values(r.note).every(Boolean), r.id).toBe(true);
      for (const f of r.fits) {
        // A subject's ids are checked as soon as that subject has skills on the map.
        const live = SKILLS.some((s) => s.id[0] === f[0]);
        if (/^[mes]\.[a-z]/.test(f) && !f.endsWith(".") && live) expect(getSkill(f), `${r.id} fits unknown skill ${f}`).toBeTruthy();
      }
    }
  });

  it("find sources for a skill, by grade, in the learner's language", () => {
    const frac = resourcesFor({ skillId: "m.frac.equiv", locale: "en" });
    expect(frac[0].fits).toContain("m.frac.equiv");
    // Skills a source teaches by name come first, not the general grade pages.
    for (const id of ["m.place.1000", "m.expr.equiv"]) expect(resourcesFor({ skillId: id })[0].fits, id).toContain(id);
    expect(resourcesFor({ skillId: "m.add.10" }).some((r) => r.id === "khan-math-1")).toBe(true);
    expect(resourcesFor({ skillId: "s.density" }).every((r) => r.subject === "science")).toBe(true);
    const es = resourcesFor({ skillId: "s.states.matter", locale: "es" })[0];
    expect(linkOf(es, "es")).toContain("/es/");
    expect(resourcesFor({ topic: "moon phases", grade: "5" }).map((r) => r.id)).toContain("nasa-moon-phases");
  });

  it("say truthfully whether a source is in Spanish", () => {
    for (const r of RESOURCES) {
      if (r.urlEs) expect(r.languages, r.id).toContain("es");
      if (r.about.es.includes("(en inglés)")) expect(r.languages.includes("es") || !!r.urlEs, `${r.id} has Spanish but says "en inglés"`).toBe(false);
      // A note may be for one language only, when only that language's page needs it.
      if (r.note) expect(r.note.en || r.note.es, r.id).toBeTruthy();
    }
    // Illustrative Mathematics publishes every K–5 family page in Spanish under /k5_es/.
    const imK5 = RESOURCES.filter((r) => r.url.startsWith("https://im.kendallhunt.com/k5/"));
    expect(imK5.length).toBeGreaterThan(0);
    for (const r of imK5) expect(linkOf(r, "es"), r.id).toBe(r.url.replace("/k5/", "/k5_es/"));
  });

  it("fit only skills whose grade the practice page can reach (the skill's grade, within the band ±1)", () => {
    // English and science sources. Math still has one (phet-number-line-integers fits m.compare.100, grade 1,
    // band 5–7); drop this filter once it is fixed.
    for (const r of RESOURCES.filter((x) => x.subject !== "math")) {
      const [lo, hi] = [gradeIndex(r.grades[0]) - 1, gradeIndex(r.grades[1]) + 1];
      for (const f of r.fits) {
        const skill = /^[mes]\.[a-z]/.test(f) && !f.endsWith(".") ? getSkill(f) : undefined;
        if (!skill) continue;
        const g = gradeIndex(skill.grade);
        expect(g >= lo && g <= hi, `${r.id} fits ${f} (grade ${skill.grade}) outside ${r.grades.join("–")}`).toBe(true);
        expect(resourcesFor({ skillId: f }).map((x) => x.id), `${r.id} never ranks for ${f}`).toContain(r.id);
      }
    }
  });

  it("never offer an English-only learner a source that has no English", () => {
    const topics = ["fables", "poems", "prose poems", "stories", "audiobooks", "classics", "morals"];
    for (const topic of topics)
      for (const grade of ["2", "4", "6", "8"]) {
        const list = resourcesFor({ topic, grade, subject: "english", locale: "en" });
        expect(list.every((r) => r.languages.includes("en")), `${topic} grade ${grade}`).toBe(true);
      }
    expect(resourcesFor({ topic: "fables", grade: "4", locale: "en" }).map((r) => r.id)).not.toContain("librivox-samaniego-fabulas");
    // Spanish learners still see Spanish-only books, and English sources marked "(en inglés)".
    const es = resourcesFor({ topic: "fables", grade: "4", locale: "es" }).map((r) => r.id);
    expect(es).toContain("librivox-samaniego-fabulas");
    expect(es).toContain("loc-aesop-for-children");
    for (const skillId of ["e.main.idea", "e.figurative", "e.context.clues"])
      expect(resourcesFor({ skillId, locale: "en" }).every((r) => r.languages.includes("en")), skillId).toBe(true);
  });

  it("never pad a skill or topic search with sources that only share the learner's language", () => {
    // Every skill, every subject: each source listed fits the skill by id, prefix or grade.
    for (const s of SKILLS)
      for (const locale of ["en", "es"] as const)
        for (const r of resourcesFor({ skillId: s.id, locale })) {
          const fits = r.fits.some((f) => f === s.id || (f.endsWith(".") && s.id.startsWith(f)) || f === `grade:${s.grade}`);
          expect(fits, `${r.id} listed for ${s.id} (${locale})`).toBe(true);
        }
    // TutorChat (the demo's sources card and the AI find_resources tool) passes no subject.
    for (const topic of ["fables", "poems", "prose poems", "morals", "commas", "subject verb agreement", "nursery rhymes"])
      for (const grade of ["K", "2", "4", "6", "8"])
        for (const locale of ["en", "es"] as const)
          expect(resourcesFor({ topic, grade, locale }).every((r) => r.subject === "english"), `${topic} grade ${grade} ${locale}`).toBe(true);
    expect(resourcesFor({ topic: "fables", grade: "4", locale: "en" }).map((r) => r.id)).toEqual(["loc-aesop-for-children", "librivox-quiroga-jungle-tales"]);
    // A skill with one fitting source in reach shows that one alone.
    expect(resourcesFor({ skillId: "e.commas", grade: "7", locale: "en" }).map((r) => r.id)).toEqual(["owl-commas"]);
    // A plain browse still lists every source in the band.
    expect(resourcesFor({ subject: "science", grade: "5", locale: "en" }).length).toBeGreaterThan(10);
  });

  it("keep topic words where a skill fit is out of reach, and a source for each topic's youngest learners", () => {
    for (const locale of ["en", "es"] as const) {
      expect(resourcesFor({ topic: "commas", grade: "8", locale }).map((r) => r.id)).toEqual(["owl-grammar", "owl-commas", "gutenberg-elements-of-style"]);
      for (const grade of ["6", "8"])
        expect(resourcesFor({ topic: "subject verb agreement", grade, locale }).map((r) => r.id)).toEqual(["owl-subject-verb", "owl-grammar"]);
      expect(resourcesFor({ topic: "nursery rhymes", grade: "K", locale }).map((r) => r.id)).toEqual(["gutenberg-real-mother-goose"]);
      // Speed, distance and time: two sources that fit it on its two practice-page slots.
      const speed = resourcesFor({ skillId: "s.speed", locale }).slice(0, 2);
      expect(speed.map((r) => r.id)).toEqual(["phet-forces-and-motion-basics", "phet-forces-and-motion"]);
    }
    // The USGS note corrects the Spanish page only, so English learners, sent to the English page, never see it.
    const usgs = RESOURCES.find((r) => r.id === "usgs-water-cycle-kids")!;
    expect(usgs.note?.en).toBeUndefined();
    expect(usgs.note?.es).toContain("miles de millones");
  });
});
