import { describe, expect, it } from "vitest";
import { answerText, check } from "@/practice/answer";
import { BANDS, landingData } from "./data";

// The landing's live problems come from the real engine. These pin what a visitor meets first and that
// every problem on offer is answerable: its own key passes the checker, in both languages.
describe("landing data", () => {
  const data = landingData();

  it("opens on 7 dots, 3/4 and −3", () => {
    const first = (b: (typeof BANDS)[number]) => data.hero[b].items.en[0];
    expect(answerText(first("k2").answer, first("k2").choices)).toBe("7");
    expect(answerText(first("35").answer)).toBe("3/4");
    expect(answerText(first("69").answer)).toBe("-3");
  });

  it("offers a pool of distinct, checkable problems with the same answers in English and Spanish", () => {
    for (const band of BANDS) {
      const { en, es } = data.hero[band].items;
      expect(en.length).toBeGreaterThanOrEqual(4);
      expect(new Set(en.map((i) => answerText(i.answer, i.choices))).size).toBe(en.length);
      en.forEach((item, i) => {
        const key = item.answer.kind === "choice" ? item.answer.index : answerText(item.answer, item.choices);
        expect(check(item.answer, key).correct, item.id).toBe(true);
        expect(es[i].answer).toEqual(item.answer);
        expect(es[i].hints.length).toBe(item.hints.length);
        expect(es[i].prompt).not.toEqual(item.prompt);
      });
      expect(data.hero[band].sources.length).toBeGreaterThan(0);
    }
  });

  it("counts the skill map from the engine and names weekdays without a clock", () => {
    const counted = data.map.reduce((n, r) => n + r.cells.math.computed + r.cells.math.draft + r.cells.english.computed + r.cells.english.draft + r.cells.science.computed + r.cells.science.draft, 0);
    expect(counted).toBe(data.totals.skills);
    expect(data.weekdays.en).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri"]);
    expect(data.weekdays.es).toHaveLength(5);
  });
});
