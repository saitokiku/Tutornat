import { describe, expect, it } from "vitest";
import { catalogueEntry } from "@/catalogue";
import en from "@/i18n/en";
import es from "@/i18n/es";
import { guessSubject } from "@/lib/generate";
import { getSkill } from "@/practice/skills";
import { TOPICS, topicsIn } from "./topics";

describe("topics", () => {
  it("every bridge points at a real skill and a real ready-made lesson, and says why in both languages", () => {
    for (const topic of TOPICS) {
      for (const id of topic.skills) expect(getSkill(id), `${topic.id}: ${id}`).toBeDefined();
      for (const ref of topic.lessons ?? []) {
        const [entryId, lessonId] = ref.split("/");
        expect(catalogueEntry(entryId)?.lessons.some((l) => l.id === lessonId), `${topic.id}: ${ref}`).toBe(true);
      }
      if (topic.lessons) {
        const key = `crs.why.${topic.id}` as keyof typeof en;
        expect(en[key], key).toBeTruthy();
        expect(es[key], key).toBeTruthy();
      }
      for (const w of topic.words) expect(w, `${topic.id}: write "${w}" without accents, in lower case`).toBe(w.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, ""));
    }
  });

  it("matches whole words, plurals, accents and Spanish", () => {
    const ids = (text: string) => topicsIn(text).map((t) => t.id);
    expect(ids("I want to learn about volcanoes")).toEqual(["volcano"]);
    expect(ids("¿Cómo funcionan los volcanes?")).toEqual(["volcano"]);
    expect(ids("tiburones y ballenas")).toEqual(["animals"]);
    expect(ids("sharks")).toEqual(["animals"]);
    expect(ids("the water cycle")).toEqual(["water"]);
    expect(ids("what to do on Sunday")).toEqual([]);
    expect(ids("knitting socks")).toEqual([]);
  });

  it("puts animals and the like in science when no school word says otherwise", () => {
    expect(guessSubject("sharks")).toBe("science");
    expect(guessSubject("donkeys")).toBe("science");
    expect(guessSubject("a story about my dog")).toBe("english");
    expect(guessSubject("knitting")).toBe("other");
  });
});
