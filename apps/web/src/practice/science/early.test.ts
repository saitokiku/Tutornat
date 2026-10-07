import { describe, expect, it } from "vitest";
import type { Locale } from "@/lib/types";
import { answerText, check } from "../answer";
import { makeItem } from "../skills";
import type { Item } from "../types";
import { BANKS, SCIENCE_K_5, type Entry, type Pair } from "./early";

// K–5 science. Draft banks are checked entry by entry: shape, both languages, kid-sized sentences,
// keys that match known facts and never a known misconception. Metric conversion is re-derived from
// the displayed prompt with exact integer arithmetic on the digits, a different route from the
// generator (which builds the amount from a count of the smaller unit).

const PLAN = [
  ["s.living", "K", "K-LS1-1", [], 1, "draft"],
  ["s.needs", "K", "K-LS1-1", ["s.living"], 1, "draft"],
  ["s.weather", "K", "K-ESS2-1", [], 1, "draft"],
  ["s.push.pull", "K", "K-PS2-1", [], 1, "draft"],
  ["s.materials", "2", "2-PS1-1", ["s.push.pull"], 1, "draft"],
  ["s.states.matter", "2", "2-PS1-4", ["s.materials"], 2, "draft"],
  ["s.habitats", "2", "2-LS4-1", ["s.needs"], 1, "draft"],
  ["s.life.cycles", "3", "3-LS1-1", ["s.habitats"], 1, "draft"],
  ["s.forces", "3", "3-PS2-1", ["s.push.pull"], 2, "draft"],
  ["s.energy.forms", "4", "4-PS3-2", ["s.forces"], 1, "draft"],
  ["s.rocks", "4", "4-ESS1-1", ["s.materials"], 1, "draft"],
  ["s.units", "5", "5.MD.A.1", [], 2, "computed"],
  ["s.food.chains", "5", "5-LS2-1", ["s.habitats"], 2, "draft"],
  ["s.water.cycle", "5", "5-ESS2-1", ["s.states.matter"], 1, "draft"],
  ["s.earth.sun.moon", "5", "5-ESS1-2", [], 2, "draft"],
] as const;

const SEEDS = Array.from({ length: 300 }, (_, i) => i * 104729 + 7);
const LOCALES: Locale[] = ["en", "es"];
const EARLY = new Set(["K", "1", "2"]);
const DRAFT = SCIENCE_K_5.filter((s) => s.content === "draft");
const pick = (p: Pair, locale: Locale) => (locale === "es" ? p[1] : p[0]);
const promptText = (item: Item) => item.prompt.map((p) => (typeof p === "string" ? p : "blank" in p ? "▢" : "")).join("");

/** Every learner-facing string of an entry, as [en, es] pairs. */
const pairsOf = (e: Entry, strat: Pair): Pair[] => [
  e.q,
  e.say ?? e.q,
  ...(e.alt ? [e.alt] : []),
  ...e.a.flatMap((c) => [c.t, c.say ?? c.t]),
  e.h[0],
  e.strat ?? strat,
  e.h[1],
  ...e.s,
];

const sentences = (text: string) => text.split(/[.?!:;]+/).map((s) => s.trim()).filter(Boolean);
const wordCount = (s: string) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const containsPhrase = (text: string, phrase: string) => new RegExp(`(^|[^\\p{L}])${escapeRe(phrase)}([^\\p{L}]|$)`, "iu").test(text);

const DICHOTOMIES = [
  ["Living", "Not living"],
  ["Push", "Pull"],
  ["Balanced", "Unbalanced"],
  ["Weathering", "Erosion"],
];
const isBinary = (labels: string[]) => labels.every((l) => /^(Yes|No)\b/.test(l)) || DICHOTOMIES.some((d) => d.every((x) => labels.includes(x)));

describe("SCIENCE_K_5 skill list", () => {
  it("matches the strand plan exactly, in order", () => {
    expect(SCIENCE_K_5.map((s) => s.id)).toEqual(PLAN.map((p) => p[0]));
    PLAN.forEach(([id, grade, standard, prereqs, levels, content], i) => {
      const s = SCIENCE_K_5[i];
      expect({ id: s.id, subject: s.subject, grade: s.grade, standard: s.standard, prereqs: s.prereqs, levels: s.levels, content: s.content }).toEqual({
        id,
        subject: "science",
        grade,
        standard,
        prereqs: [...prereqs],
        levels,
        content,
      });
      expect(s.title.en.trim() && s.title.es.trim() && s.title.en !== s.title.es, id).toBeTruthy();
    });
  });

  it("has one bank per level for every draft skill", () => {
    for (const s of DRAFT) expect(BANKS[s.id]?.length, s.id).toBe(s.levels);
    expect(Object.keys(BANKS).sort()).toEqual(DRAFT.map((s) => s.id).sort());
  });
});

describe.each(DRAFT.map((s) => [s.id, s] as const))("bank %s", (id, skill) => {
  const levels = BANKS[id];

  it("has at least 12 distinct, well-formed entries per level", () => {
    levels.forEach((level, li) => {
      const where = `${id} L${li + 1}`;
      expect(level.items.length, where).toBeGreaterThanOrEqual(12);
      expect(level.seconds, where).toBeGreaterThan(0);
      for (const locale of LOCALES) {
        const keys = level.items.map((e) => `${pick(e.q, locale)}|${e.alt ? pick(e.alt, locale) : ""}`);
        expect(new Set(keys).size, `${where} ${locale} duplicate entries`).toBe(keys.length);
      }
      level.items.forEach((e, ei) => {
        const at = `${where} #${ei} "${e.q[0]}"`;
        const labelsEn = e.a.map((c) => c.t[0]);
        expect(e.a.length, at).toBeLessThanOrEqual(4);
        expect(e.a.length >= 3 || (e.a.length === 2 && isBinary(labelsEn)), `${at} needs 3 choices unless yes/no-type`).toBe(true);
        for (const locale of LOCALES) {
          const labels = e.a.map((c) => pick(c.t, locale));
          expect(new Set(labels.map((l) => l.toLowerCase())).size, `${at} ${locale} duplicate labels`).toBe(labels.length);
        }
        for (const [en, es] of pairsOf(e, level.strat)) {
          expect(en.trim(), at).not.toBe("");
          expect(es.trim(), at).not.toBe("");
        }
        expect(e.q[0], `${at} untranslated`).not.toBe(e.q[1]);
        expect(e.s.length, at).toBeGreaterThanOrEqual(1);
        expect(e.s.length, at).toBeLessThanOrEqual(4);
        if (e.pic || e.visual) expect(e.alt, `${at} alt`).toBeTruthy();
        if (EARLY.has(skill.grade)) expect(e.pic || e.visual, `${at} K–2 needs a picture`).toBeTruthy();
        const say = e.say ?? e.q;
        for (const s of say) expect(s, `${at} say has symbols`).not.toMatch(/[▢→]|\^|\d\/\d|\{|\}/);
      });
    });
  });

  it("writes plain, kid-sized copy", () => {
    const [maxEn, maxEs] = EARLY.has(skill.grade) ? [10, 14] : [20, 26];
    levels.forEach((level, li) => {
      level.items.forEach((e, ei) => {
        const at = `${id} L${li + 1} #${ei}`;
        for (const [en, es] of pairsOf(e, level.strat)) {
          for (const text of [en, es]) {
            expect(text, `${at} exclamation`).not.toMatch(/[!¡]/);
            expect(text, `${at} emoji in text`).not.toMatch(/\p{Extended_Pictographic}/u);
            expect(text, `${at} praise`).not.toMatch(/\b(great|good job|awesome|excellent|well done|amazing|nice work|muy bien|excelente|genial|bien hecho)\b/i);
          }
          for (const s of sentences(en)) expect(wordCount(s), `${at} EN too long: "${s}"`).toBeLessThanOrEqual(maxEn);
          for (const s of sentences(es)) expect(wordCount(s), `${at} ES too long: "${s}"`).toBeLessThanOrEqual(maxEs);
        }
      });
    });
  });

  it("never gives the key away in the nudge or the first step", () => {
    levels.forEach((level, li) => {
      level.items.forEach((e, ei) => {
        for (const locale of LOCALES) {
          const key = pick(e.a[0].t, locale);
          if (key.length < 4) continue;
          for (const h of [e.h[0], e.h[1]]) expect(containsPhrase(pick(h, locale), key), `${id} L${li + 1} #${ei} ${locale} hint names "${key}"`).toBe(false);
        }
      });
    });
  });

  it("builds items whose key is the bank's key, the same entry in both languages", () => {
    for (let level = 1; level <= skill.levels; level++) {
      const items = BANKS[id][level - 1].items;
      const seen = new Set<number>();
      for (const seed of SEEDS) {
        const found: number[] = [];
        const answers: number[] = [];
        for (const locale of LOCALES) {
          const item = makeItem(id, level, seed, locale);
          const where = `${id} L${level} seed ${seed} ${locale}`;
          const idx = items.findIndex((e) => pick(e.q, locale) === promptText(item) && (e.alt ? pick(e.alt, locale) : undefined) === item.alt);
          expect(idx, `${where} entry not found`).toBeGreaterThanOrEqual(0);
          const e = items[idx];
          expect(item.input, where).toBe("choices");
          expect(item.answer.kind, where).toBe("choice");
          if (item.answer.kind !== "choice") continue;
          expect(item.choices![item.answer.index].label, where).toBe(pick(e.a[0].t, locale));
          expect(item.hints.length, where).toBe(3);
          expect(item.steps.length, where).toBeGreaterThanOrEqual(1);
          expect(item.steps.length, where).toBeLessThanOrEqual(4);
          expect(item.say, where).not.toMatch(/[▢→]/);
          for (const c of item.choices!) expect(c.say?.trim(), `${where} choice say`).toBeTruthy();
          if (EARLY.has(skill.grade)) {
            expect(item.picture || item.visual, `${where} picture`).toBeTruthy();
            expect(item.alt?.trim(), `${where} alt`).toBeTruthy();
          }
          found.push(idx);
          answers.push(item.answer.index);
        }
        expect(found[1], `${id} L${level} seed ${seed}: es picked another entry`).toBe(found[0]);
        expect(answers[1], `${id} L${level} seed ${seed}: es answer moved`).toBe(answers[0]);
        seen.add(found[0]);
      }
      expect(seen.size, `${id} L${level} distinct items reached`).toBeGreaterThanOrEqual(12);
    }
  });
});

describe("science facts", () => {
  const entries = (id: string) => BANKS[id].flatMap((l) => l.items);
  const keyOf = (e: Entry) => e.a[0].t[0];

  // Known answers, written independently of the banks: each matcher must hit at least one entry.
  const FACTS: [string, string, (e: Entry) => boolean, RegExp][] = [
    ["fire is not living", "s.living", (e) => e.pic === "🔥", /^Not living$/],
    ["a seed is living", "s.living", (e) => e.pic === "🌰", /^Living$/],
    ["a mushroom is living", "s.living", (e) => e.pic === "🍄", /^Living$/],
    ["a robot is not living", "s.living", (e) => e.pic === "🤖", /^Not living$/],
    ["a cloud is not living", "s.living", (e) => e.pic === "☁️", /^Not living$/],
    ["the Sun is not living", "s.living", (e) => e.pic === "☀️", /^Not living$/],
    ["plants make their own food", "s.needs", (e) => /get its food/.test(e.q[0]), /makes its own food/],
    ["roots take water, not food", "s.needs", (e) => /roots take/.test(e.q[0]), /^Water$/],
    ["a cactus needs water", "s.needs", (e) => /cactus/i.test(e.q[0]), /^Yes$/],
    ["whales breathe air", "s.needs", (e) => /whale/i.test(e.q[0]), /^Air$/],
    ["go inside in a thunderstorm", "s.weather", (e) => /Thunder/.test(e.q[0]), /^Inside/],
    ["sand is a solid", "s.states.matter", (e) => /^Sand can pour/.test(e.q[0]), /^Solid$/],
    ["drops on a cold glass come from the air", "s.states.matter", (e) => /cold glass/.test(e.q[0]), /water vapor/i],
    ["cooking and burning cannot be undone", "s.states.matter", (e) => /cook an egg|toasted|pancake/.test(e.q[0]), /^No$/],
    ["polar bears live in the Arctic", "s.habitats", (e) => /^Where does a polar bear/.test(e.q[0]), /^Arctic$/],
    ["tadpoles hatch from frog eggs", "s.life.cycles", (e) => /hatches from a frog egg/.test(e.q[0]), /tadpole/],
    ["caterpillars hatch from butterfly eggs", "s.life.cycles", (e) => /butterfly lays eggs/.test(e.q[0]), /caterpillar/],
    ["magnets do not pull aluminum", "s.forces", (e) => /NOT pull/.test(e.q[0]), /aluminum/],
    ["like poles repel", "s.forces", (e) => /(north|south) poles facing/.test(e.q[0]), /repel/],
    ["opposite poles attract", "s.forces", (e) => /north pole of one magnet faces the south/.test(e.q[0]), /attract/],
    ["equal pulls do not move the rope", "s.forces", (e) => /just as hard/.test(e.q[0]), /does not move|stays still/],
    ["heat flows from warm to cold", "s.energy.forms", (e) => /ice cube/.test(e.q[0]), /^From your hand to the ice$/],
    ["a fan does not make cold", "s.energy.forms", (e) => /electric fan/.test(e.q[0]), /^Motion$/],
    ["fossils are mostly in sedimentary rock", "s.rocks", (e) => /most fossils/.test(e.q[0]), /^Sedimentary$/],
    ["lava makes igneous rock", "s.rocks", (e) => /^Lava/.test(e.q[0]), /^Igneous$/],
    ["marble is metamorphic", "s.rocks", (e) => /^Marble/.test(e.q[0]), /^Metamorphic$/],
    ["bottom layers are usually oldest", "s.rocks", (e) => /usually the oldest/.test(e.q[0]), /bottom/],
    ["plants build food from light, air and water", "s.food.chains", (e) => /plant use to make its food/.test(e.q[0]), /^Sunlight, air and water$/],
    ["food chain energy starts with the Sun", "s.food.chains", (e) => /first come from/.test(e.q[0]), /^The Sun$/],
    ["mushrooms are decomposers", "s.food.chains", (e) => /^A mushroom/.test(e.q[0]), /^Decomposer$/],
    ["clouds are drops, not vapor", "s.water.cycle", (e) => /clouds made of/.test(e.q[0]), /drops of water or ice/],
    ["most fresh water is ice", "s.water.cycle", (e) => /most of Earth's fresh water/.test(e.q[0]), /ice and glaciers/],
    ["the Sun drives the water cycle", "s.water.cycle", (e) => /water cycle its energy/.test(e.q[0]), /^The Sun$/],
    ["seasons come from tilt", "s.earth.sun.moon", (e) => /causes Earth's seasons/.test(e.q[0]), /tilt/],
    ["closest to the Sun in northern winter", "s.earth.sun.moon", (e) => /closest to the Sun in early January/.test(e.q[0]), /^Winter$/],
    ["seasons are opposite in Australia", "s.earth.sun.moon", (e) => /Australia/.test(e.q[0]), /^Winter$/],
    ["the Moon reflects sunlight", "s.earth.sun.moon", (e) => /moonlight/.test(e.q[0]), /^Sunlight bouncing/],
    ["Earth's spin makes day and night", "s.earth.sun.moon", (e) => /day and night/.test(e.q[0]), /spins/],
    ["the Sun rises in the east", "s.earth.sun.moon", (e) => /Sun rise/.test(e.q[0]), /^East$/],
  ];

  it.each(FACTS)("%s", (_, id, match, key) => {
    const hits = entries(id).filter(match);
    expect(hits.length, "matcher found no entry").toBeGreaterThan(0);
    for (const e of hits) expect(keyOf(e), e.q[0]).toMatch(key);
  });

  it("never makes a common misconception the key, and does offer them as distractors", () => {
    const WRONG = /distance from the Sun|closer to the Sun|makes its own light|Earth's shadow|Sun (goes|moves) around Earth|around the Sun every day|eats soil|soil it eats|under a tall tree|all metals|ran out of push|from the ice to your hand|invisible water vapor|new water|tiny butterfly|tiny adult frog|gone forever|glass leaks|biggest star|pulls harder on ice|melt the ice|^cold$/i;
    const all = Object.values(BANKS).flatMap((levels) => levels.flatMap((l) => l.items));
    for (const e of all) expect(keyOf(e), e.q[0]).not.toMatch(WRONG);
    const distractors = all.flatMap((e) => e.a.slice(1).map((c) => c.t[0]));
    for (const m of ["Earth's distance from the Sun", "The Moon makes its own light", "It eats soil", "Under a tall tree", "It pulls all metals", "From the ice to your hand", "Invisible water vapor", "Gravity pulls harder on ice", "Earth's shadow covers part of it", "Cold"]) {
      expect(distractors, m).toContain(m);
    }
  });

  it("names Moon phases from the drawn phase, and alt text never names the phase", () => {
    const NAME: Record<number, string> = { 0: "New moon", 0.125: "Waxing crescent", 0.25: "First quarter", 0.5: "Full moon", 0.75: "Last quarter" };
    const moons = entries("s.earth.sun.moon").filter((e) => e.visual?.kind === "moon");
    expect(moons.length).toBeGreaterThanOrEqual(4);
    for (const e of moons) {
      if (e.visual?.kind !== "moon") continue;
      expect(keyOf(e)).toBe(NAME[e.visual.phase]);
      for (const alt of e.alt!) expect(alt).not.toMatch(/full|new|quarter|crescent|gibbous|wax|wan|llena|nueva|cuarto|creciente|menguante|gibosa/i);
    }
  });

  it("names the state of matter the particles show", () => {
    const parts = entries("s.states.matter").filter((e) => e.visual?.kind === "particles");
    expect(parts.length).toBe(3);
    for (const e of parts) if (e.visual?.kind === "particles") expect(keyOf(e).toLowerCase()).toBe(e.visual.state);
  });
});

describe("s.units (computed)", () => {
  // Powers of ten relative to the base unit, kept apart from the generator's tables.
  const UNITS: Record<string, [dimension: string, exponent: number]> = {
    mm: ["length", -3],
    cm: ["length", -2],
    m: ["length", 0],
    km: ["length", 3],
    g: ["mass", 0],
    kg: ["mass", 3],
    mL: ["volume", -3],
    L: ["volume", 0],
  };
  const L1_PAIRS = new Set(["cm|m", "g|kg", "mL|L"]);
  const L2_PAIRS = new Set(["mm|cm", "cm|m", "mm|m", "m|km", "g|kg", "mL|L"]);
  const pairKey = (a: string, b: string) => (UNITS[a][1] < UNITS[b][1] ? `${a}|${b}` : `${b}|${a}`);
  /** "2.75" → [275, 100], exactly, from the digits. */
  const rational = (s: string): [number, number] => {
    const [whole, frac = ""] = s.split(".");
    return [Number(whole + frac), 10 ** frac.length];
  };
  const decimals = (s: string) => (s.split(".")[1] ?? "").length;

  for (const level of [1, 2]) {
    it(`level ${level}: the key is the displayed amount converted, for 300 seeds`, () => {
      const pairs = new Set<string>();
      const directions = new Set<string>();
      let withDecimal = 0;
      for (const seed of SEEDS) {
        const item = makeItem("s.units", level, seed, "en");
        const es = makeItem("s.units", level, seed, "es");
        const where = `L${level} seed ${seed}`;
        expect(es.prompt, `${where} prompt differs by language`).toEqual(item.prompt);
        expect(es.answer, where).toEqual(item.answer);
        expect(item.prompt.length, where).toBe(3);
        const [left, blank, right] = item.prompt;
        expect(blank, where).toEqual({ blank: true });
        const lm = /^(\d+(?:\.\d+)?) (mm|cm|m|km|g|kg|mL|L) = $/.exec(left as string);
        const rm = /^ (mm|cm|m|km|g|kg|mL|L)$/.exec(right as string);
        expect(lm && rm, `${where} prompt shape ${JSON.stringify(item.prompt)}`).toBeTruthy();
        const [, amount, from] = lm!;
        const to = rm![1];
        expect(UNITS[from][0], where).toBe(UNITS[to][0]);
        expect(from, where).not.toBe(to);
        pairs.add(pairKey(from, to));
        directions.add(UNITS[from][1] < UNITS[to][1] ? "up" : "down");

        expect(item.answer.kind, where).toBe("number");
        const typed = answerText(item.answer);
        // amount × 10^(from − to) must equal the key, compared as exact integer fractions.
        const d = UNITS[from][1] - UNITS[to][1];
        const [an, ad] = rational(amount);
        const [kn, kd] = rational(typed);
        expect(kn * ad * 10 ** Math.max(0, -d), `${where} ${amount} ${from} → ${typed} ${to}`).toBe(an * kd * 10 ** Math.max(0, d));
        // And back again: the key converted to the first unit is the amount.
        expect(Number(typed) * 10 ** -d, where).toBeCloseTo(Number(amount), 9);

        expect(check(item.answer, typed).correct, where).toBe(true);
        expect(check(item.answer, String(Number(typed) * 10)).correct, `${where} accepts a slip by 10`).toBe(false);
        expect(check(item.answer, String(Number(typed) / 10)).correct, `${where} accepts a slip by 10`).toBe(false);
        expect(check(item.answer, amount).correct, `${where} accepts the unconverted amount`).toBe(false);
        expect(item.hints.length, where).toBe(3);
        for (const h of item.hints) expect(h, `${where} hint gives the answer`).not.toMatch(new RegExp(`(^|[^\\d.])${typed.replace(".", "\\.")}([^\\d.]|$)`));
        expect(item.steps.at(-1), where).toContain(typed);
        for (const it of [item, es]) {
          expect(it.say, where).toContain(amount);
          expect(it.say, `${where} say uses symbols`).not.toMatch(/\b(mm|cm|m|km|g|kg|mL|L)\b/);
        }
        expect(decimals(amount), where).toBeLessThanOrEqual(2);
        expect(decimals(typed), where).toBeLessThanOrEqual(2);

        if (level === 1) {
          expect(L1_PAIRS.has(pairKey(from, to)), `${where} ${from}/${to}`).toBe(true);
          expect(Number.isInteger(Number(amount)) && Number.isInteger(Number(typed)), `${where} whole numbers`).toBe(true);
          expect(item.keys, where).toBeUndefined();
        } else {
          expect(L2_PAIRS.has(pairKey(from, to)), `${where} ${from}/${to}`).toBe(true);
          expect(item.keys, where).toEqual(["."]);
          expect(amount.includes(".") || typed.includes("."), `${where} has a decimal`).toBe(true);
          withDecimal++;
        }
      }
      expect(pairs.size).toBe(level === 1 ? 3 : 6);
      expect(directions.size).toBe(2);
      if (level === 2) expect(withDecimal).toBe(SEEDS.length);
    });
  }
});
