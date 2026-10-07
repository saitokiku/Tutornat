import { describe, expect, it } from "vitest";
import { getSkill, SKILLS } from "@/practice/skills";
import { linkOf, resourcesFor } from "./index";
import { RESOURCES } from "./list";

describe("resources", () => {
  it("are well formed: unique ids, https links, both languages described, fits that exist", () => {
    expect(new Set(RESOURCES.map((r) => r.id)).size).toBe(RESOURCES.length);
    for (const r of RESOURCES) {
      expect(r.url, r.id).toMatch(/^https:\/\//);
      if (r.urlEs) expect(r.urlEs, r.id).toMatch(/^https:\/\//);
      expect(r.about.en && r.about.es, r.id).toBeTruthy();
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
    expect(resourcesFor({ skillId: "m.add.10" }).some((r) => r.id === "khan-math-1")).toBe(true);
    expect(resourcesFor({ skillId: "s.density" }).every((r) => r.subject === "science")).toBe(true);
    const es = resourcesFor({ skillId: "s.states.matter", locale: "es" })[0];
    expect(linkOf(es, "es")).toContain("/es/");
    expect(resourcesFor({ topic: "moon phases", grade: "5" }).map((r) => r.id)).toContain("nasa-moon-phases");
  });
});
