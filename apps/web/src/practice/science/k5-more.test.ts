import { describe, expect, it } from "vitest";
import type { Locale } from "@/lib/types";
import { answerText, check } from "../answer";
import { makeItem } from "../skills";
import type { Item } from "../types";
import { SCIENCE_K_5 } from "./early";
import { BANKS, SCIENCE_K_5_MORE, type Entry, type Pair } from "./k5-more";

// K–5 science, second strand. Draft banks are checked entry by entry: shape, both languages,
// kid-sized sentences, picture-first K–2 entries, a misconception tag on every wrong choice, and keys
// that match facts written here independently. Computed skills are re-derived from what the learner
// sees (the prompt text and the drawn visual), never from the generator's own variables; daylight
// hours are checked against a sunrise–sunset calculation for each city.

const PLAN = [
  ["s.weather.chart", "K", "K-ESS2-1", ["s.weather"], 2, "computed"],
  ["s.sun.warms", "K", "K-PS3-1", ["s.weather"], 2, "draft"],
  ["s.living.change", "K", "K-ESS2-2", ["s.needs"], 2, "draft"],
  ["s.weather.ready", "K", "K-ESS3-2", ["s.weather"], 1, "draft"],
  ["s.sound.vibrate", "1", "1-PS4-1", [], 1, "draft"],
  ["s.light.see", "1", "1-PS4-2", [], 1, "draft"],
  ["s.light.through", "1", "1-PS4-3", ["s.light.see"], 1, "draft"],
  ["s.signals", "1", "1-PS4-4", ["s.sound.vibrate", "s.light.see"], 1, "draft"],
  ["s.parts.jobs", "1", "1-LS1-1", ["s.needs"], 2, "draft"],
  ["s.parents.young", "1", "1-LS1-2", ["s.living"], 2, "draft"],
  ["s.sky.patterns", "1", "1-ESS1-1", [], 1, "draft"],
  ["s.daylight.hours", "1", "1-ESS1-2", ["s.sky.patterns", "s.weather.chart"], 3, "computed"],
  ["s.plants.grow", "2", "2-LS2-1", ["s.needs", "s.parts.jobs"], 3, "draft"],
  ["s.habitat.survey", "2", "2-LS4-1", ["s.habitats"], 3, "computed"],
  ["s.landforms.water", "2", "2-ESS2-2", [], 2, "draft"],
  ["s.wind.water.land", "2", "2-ESS2-1", ["s.landforms.water"], 2, "draft"],
  ["s.heat.cool", "2", "2-PS1-4", ["s.states.matter"], 2, "draft"],
  ["s.climate.data", "3", "3-ESS2-1", ["s.weather.chart"], 3, "computed"],
  ["s.traits.inherited", "3", "3-LS3-1", ["s.parents.young"], 2, "draft"],
  ["s.fossils.past", "3", "3-LS4-1", ["s.habitats"], 1, "draft"],
  ["s.adapt.survive", "3", "3-LS4-3", ["s.traits.inherited", "s.habitats"], 2, "draft"],
  ["s.magnets.static", "3", "3-PS2-3", ["s.forces"], 2, "draft"],
  ["s.motion.patterns", "3", "3-PS2-2", ["s.forces"], 3, "computed"],
  ["s.wave.shape", "4", "4-PS4-1", ["s.sound.vibrate"], 3, "computed"],
  ["s.eyes.senses", "4", "4-PS4-2", ["s.light.see"], 2, "draft"],
  ["s.structures.functions", "4", "4-LS1-1", ["s.parts.jobs"], 2, "draft"],
  ["s.speed.collisions", "4", "4-PS3-1", ["s.energy.forms"], 2, "draft"],
  ["s.renewable", "4", "4-ESS3-1", ["s.energy.forms"], 2, "draft"],
  ["s.quakes.volcanoes", "4", "4-ESS3-2", ["s.rocks"], 2, "draft"],
  ["s.matter.mass", "5", "5-PS1-2", ["s.states.matter", "s.heat.cool"], 3, "computed"],
  ["s.plant.matter", "5", "5-LS1-1", ["s.food.chains", "s.plants.grow"], 3, "draft"],
  ["s.earth.water", "5", "5-ESS2-2", ["s.water.cycle"], 3, "computed"],
  ["s.sun.gravity", "5", "5-PS2-1", ["s.earth.sun.moon"], 3, "draft"],
] as const;

const SEEDS = Array.from({ length: 300 }, (_, i) => i * 104729 + 7);
const LOCALES: Locale[] = ["en", "es"];
const EARLY = new Set(["K", "1", "2"]);
const SKILL = new Map(SCIENCE_K_5_MORE.map((s) => [s.id, s]));
const DRAFT = SCIENCE_K_5_MORE.filter((s) => s.content === "draft");
const COMPUTED = SCIENCE_K_5_MORE.filter((s) => s.content === "computed");
const pick = (p: Pair, locale: Locale) => (locale === "es" ? p[1] : p[0]);
const promptText = (item: Item) => item.prompt.map((p) => (typeof p === "string" ? p : "blank" in p ? "▢" : "")).join("");
const KEBAB = /^[a-z]+(-[a-z]+)+$/;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

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
  ["Inherited", "Learned"],
  ["Inherited", "Environment"],
  ["Renewable", "Nonrenewable"],
];
const isBinary = (labels: string[]) => labels.every((l) => /^(Yes|No)\b/.test(l)) || DICHOTOMIES.some((d) => d.every((x) => labels.includes(x)));

describe("SCIENCE_K_5_MORE skill list", () => {
  it("matches the strand plan exactly, in order", () => {
    expect(SCIENCE_K_5_MORE.map((s) => s.id)).toEqual(PLAN.map((p) => p[0]));
    PLAN.forEach(([id, grade, standard, prereqs, levels, content], i) => {
      const s = SCIENCE_K_5_MORE[i];
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

  it("lists every expectation a skill's levels teach, main one first, in the skill's own grade", () => {
    const STANDARDS: Record<string, string[]> = {
      "s.sun.warms": ["K-PS3-1", "K-PS3-2"],
      "s.living.change": ["K-ESS2-2", "K-ESS3-3"],
      "s.parents.young": ["1-LS1-2", "1-LS3-1"],
      "s.plants.grow": ["2-LS2-1", "2-LS2-2"],
      "s.landforms.water": ["2-ESS2-2", "2-ESS2-3"],
      "s.wind.water.land": ["2-ESS2-1", "2-ESS1-1"],
      "s.climate.data": ["3-ESS2-1", "3-ESS2-2"],
      "s.traits.inherited": ["3-LS3-1", "3-LS3-2"],
      "s.adapt.survive": ["3-LS4-3", "3-LS4-2"],
      "s.magnets.static": ["3-PS2-3", "3-PS2-4"],
      "s.motion.patterns": ["3-PS2-2", "3-PS2-1"],
      "s.eyes.senses": ["4-PS4-2", "4-LS1-2"],
      "s.speed.collisions": ["4-PS3-1", "4-PS3-3"],
      "s.quakes.volcanoes": ["4-ESS3-2", "4-ESS2-2"],
      "s.matter.mass": ["5-PS1-2", "5-PS1-1", "5-PS1-3"],
      "s.plant.matter": ["5-LS1-1", "5-LS2-1", "5-ESS2-1"],
      "s.sun.gravity": ["5-PS2-1", "5-ESS1-1", "5-ESS1-2"],
    };
    for (const s of SCIENCE_K_5_MORE) {
      expect(s.standards, s.id).toEqual(STANDARDS[s.id]);
      if (s.standards) expect(s.standards[0], s.id).toBe(s.standard);
      for (const code of s.standards ?? [s.standard!]) {
        expect(code, s.id).toMatch(/^(K|[1-5])-(PS|LS|ESS)\d-\d$/);
        expect(code.split("-")[0], `${s.id} ${code}`).toBe(s.grade);
      }
    }
    // Expectations that levels teach but no skill named before; each is now tagged somewhere.
    const tagged = new Set([...SCIENCE_K_5, ...SCIENCE_K_5_MORE].flatMap((s) => s.standards ?? (s.standard ? [s.standard] : [])));
    for (const code of ["2-LS2-2", "K-ESS3-3", "K-PS3-2", "2-ESS1-1", "2-ESS2-3", "3-ESS2-2", "3-PS2-4", "3-LS3-2", "3-LS4-2", "4-PS3-3", "4-LS1-2", "4-ESS2-2", "5-PS1-3", "5-ESS1-1"]) {
      expect(tagged.has(code), code).toBe(true);
    }
  });

  it("never reuses an id from the first K–5 strand", () => {
    const first = new Set(SCIENCE_K_5.map((s) => s.id));
    for (const s of SCIENCE_K_5_MORE) expect(first.has(s.id), s.id).toBe(false);
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
        const say = e.say ?? e.q;
        for (const s of say) expect(s, `${at} say has symbols`).not.toMatch(/[▢→]|\^|\d\/\d|\{|\}/);
        if (EARLY.has(skill.grade)) {
          expect(e.pic || e.visual, `${at} K–2 needs a picture`).toBeTruthy();
          for (const c of e.a) expect(c.pic, `${at} K–2 choice "${c.t[0]}" needs a picture`).toBeTruthy();
          const pics = e.a.map((c) => c.pic);
          expect(new Set(pics).size, `${at} choice pictures repeat`).toBe(pics.length);
        }
      });
    });
  });

  it("tags every wrong choice with a reused kebab-case misconception, and never the key", () => {
    const tags: string[] = [];
    levels.forEach((level, li) =>
      level.items.forEach((e, ei) => {
        const at = `${id} L${li + 1} #${ei} "${e.q[0]}"`;
        expect(e.a[0].why, `${at} key is tagged`).toBeUndefined();
        for (const c of e.a.slice(1)) {
          expect(c.why, `${at} "${c.t[0]}" has no why`).toBeTruthy();
          expect(c.why, at).toMatch(KEBAB);
          tags.push(c.why!);
        }
      }),
    );
    // Tags name kinds of mistakes, so a skill reuses them: far fewer tags than wrong choices.
    expect(new Set(tags).size, `${id} tags ${[...new Set(tags)].join(", ")}`).toBeLessThanOrEqual(Math.ceil(tags.length / 2));
  });

  it("does not let answer length or a picture point to the key", () => {
    levels.forEach((level, li) => {
      const where = `${id} L${li + 1}`;
      // Two-choice items use fixed label pairs (Yes/No, Renewable/Nonrenewable), so length says nothing.
      const multi = level.items.filter((e) => e.a.length > 2);
      for (const locale of LOCALES) {
        const longest = multi.filter((e) => e.a.slice(1).every((c) => pick(c.t, locale).length < pick(e.a[0].t, locale).length));
        expect(longest.length, `${where} ${locale}: key is the longest choice in ${longest.length} of ${multi.length}`).toBeLessThanOrEqual(Math.floor(0.4 * multi.length));
      }
      // Tapping one picture whenever it shows up must not beat reading: keys it marks, minus wrong
      // choices it marks, stay at 40% of the level, and a picture never on a wrong choice marks at most 3 keys.
      const marks = new Map<string, { key: number; wrong: number }>();
      for (const e of level.items)
        e.a.forEach((c, i) => {
          if (!c.pic) return;
          const m = marks.get(c.pic) ?? { key: 0, wrong: 0 };
          if (i === 0) m.key++;
          else m.wrong++;
          marks.set(c.pic, m);
        });
      for (const [pic, m] of marks) {
        expect(m.key - m.wrong, `${where} picture ${pic} marks the key ${m.key} times, a wrong choice ${m.wrong}`).toBeLessThanOrEqual(Math.floor(0.4 * level.items.length));
        if (m.wrong === 0) expect(m.key, `${where} picture ${pic} is only ever on the key`).toBeLessThanOrEqual(3);
      }
    });
  });

  it("writes plain, kid-sized copy", () => {
    const [maxEn, maxEs] = EARLY.has(skill.grade) ? [10, 14] : [20, 26];
    const problems: string[] = [];
    levels.forEach((level, li) => {
      level.items.forEach((e, ei) => {
        const at = `${id} L${li + 1} #${ei}`;
        for (const [en, es] of pairsOf(e, level.strat)) {
          for (const text of [en, es]) {
            if (/[!¡]/.test(text)) problems.push(`${at} exclamation: ${text}`);
            if (/\p{Extended_Pictographic}/u.test(text)) problems.push(`${at} emoji in text: ${text}`);
            if (/\b(great|good job|awesome|excellent|well done|amazing|nice work|muy bien|excelente|genial|bien hecho)\b/i.test(text)) problems.push(`${at} praise: ${text}`);
          }
          for (const s of sentences(en)) if (wordCount(s) > maxEn) problems.push(`${at} EN ${wordCount(s)} words: "${s}"`);
          for (const s of sentences(es)) if (wordCount(s) > maxEs) problems.push(`${at} ES ${wordCount(s)} words: "${s}"`);
        }
      });
    });
    expect(problems).toEqual([]);
  });

  it("never gives the key away in the nudge, the strategy or the first step", () => {
    levels.forEach((level, li) => {
      level.items.forEach((e, ei) => {
        for (const locale of LOCALES) {
          const key = pick(e.a[0].t, locale);
          if (key.length < 4) continue;
          expect(containsPhrase(pick(e.h[0], locale), key) || containsPhrase(pick(e.h[1], locale), key), `${id} L${li + 1} #${ei} ${locale} hint names "${key}"`).toBe(false);
          // The level-wide strategy may name a key the question itself names ("renewable or nonrenewable?").
          if (containsPhrase(pick(e.q, locale), key)) continue;
          for (const h of [e.strat ?? level.strat]) expect(containsPhrase(pick(h, locale), key), `${id} L${li + 1} #${ei} ${locale} hint names "${key}"`).toBe(false);
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
          if (item.answer.kind !== "choice") throw new Error(`${where} not a choice item`);
          const keyChoice = item.choices![item.answer.index];
          expect(keyChoice.label, where).toBe(pick(e.a[0].t, locale));
          expect(keyChoice.why, `${where} key carries a why`).toBeUndefined();
          for (const c of item.choices!) if (c !== keyChoice) expect(c.why, `${where} "${c.label}" lost its why`).toMatch(KEBAB);
          expect(item.hints.length, where).toBe(3);
          expect(item.steps.length, where).toBeGreaterThanOrEqual(1);
          expect(item.steps.length, where).toBeLessThanOrEqual(4);
          for (const c of item.choices!) expect(c.say?.trim(), `${where} choice say`).toBeTruthy();
          if (EARLY.has(skill.grade)) {
            expect(item.picture || item.visual, `${where} picture`).toBeTruthy();
            for (const c of item.choices!) expect(c.picture, `${where} choice picture`).toBeTruthy();
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

// ── Computed skills: the shape every item must have ─────────────────────────────────────────

/** Every built item of a computed skill: both languages share the numbers and the key. */
function eachItem(id: string, fn: (en: Item, es: Item, level: number, where: string) => void) {
  const skill = SKILL.get(id)!;
  for (let level = 1; level <= skill.levels; level++) {
    for (const seed of SEEDS) {
      const en = makeItem(id, level, seed, "en");
      const es = makeItem(id, level, seed, "es");
      fn(en, es, level, `${id} L${level} seed ${seed}`);
    }
  }
}

describe.each(COMPUTED.map((s) => [s.id, s] as const))("computed %s", (id, skill) => {
  it("keeps one key per seed in both languages, tags every wrong answer and builds a full hint ladder", () => {
    eachItem(id, (en, es, level, where) => {
      expect(es.answer, `${where} key moved between languages`).toEqual(en.answer);
      expect(es.input, where).toBe(en.input);
      expect(es.pad, where).toEqual(en.pad);
      // The drawing is the same in both languages; only axis and group labels are translated.
      const shape = (item: Item) => (item.visual?.kind === "line-graph" ? item.visual.points : item.visual?.kind === "dots" ? { ...item.visual, labels: undefined } : item.visual);
      expect(shape(es), where).toEqual(shape(en));
      if (en.input === "number-line") {
        expect(en.pad?.kind, where).toBe("number-line");
        if (en.pad?.kind === "number-line" && en.answer.kind === "number") {
          const { min, max, step } = en.pad;
          expect(en.answer.value >= min && en.answer.value <= max && Number.isInteger((en.answer.value - min) / step), `${where} key off the line`).toBe(true);
        }
      }
      for (const item of [en, es]) {
        expect(item.hints.length, where).toBe(3);
        expect(item.steps.length, where).toBeGreaterThanOrEqual(1);
        expect(item.steps.length, where).toBeLessThanOrEqual(4);
        expect(item.say, `${where} say has symbols`).not.toMatch(/[▢→−×÷°]|\^|\d\/\d|\{|\}/);
        for (const text of [promptText(item), item.say, ...item.hints, ...item.steps]) {
          expect(text, `${where} exclamation`).not.toMatch(/[!¡]/);
          expect(text, `${where} emoji in text`).not.toMatch(/\p{Extended_Pictographic}/u);
        }
        if (EARLY.has(skill.grade)) expect(item.visual || item.picture, `${where} K–2 picture`).toBeTruthy();
        if (item.visual?.kind === "dots") expect(item.markable, `${where} countable dots should be markable`).toBe(true);
        if (item.answer.kind === "choice") {
          const key = item.choices![item.answer.index];
          expect(key.why, `${where} key carries a why`).toBeUndefined();
          for (const c of item.choices!) if (c !== key) expect(c.why, `${where} "${c.label}"`).toMatch(KEBAB);
          for (const c of item.choices!) expect(c.say?.trim(), `${where} choice say`).toBeTruthy();
          if (skill.grade === "K") expect(item.input, where).toBe("choices");
        } else {
          const right = answerText(item.answer);
          expect(check(item.answer, right).correct, `${where} key ${right}`).toBe(true);
          expect(item.wrong?.length, `${where} needs likely wrong answers`).toBeGreaterThanOrEqual(1);
          const values = item.wrong!.map((w) => w.value);
          expect(new Set(values).size, `${where} repeated wrong values`).toBe(values.length);
          for (const w of item.wrong!) {
            expect(w.why, where).toMatch(KEBAB);
            expect(check(item.answer, w.value).correct, `${where} wrong value ${w.value} is accepted`).toBe(false);
          }
          expect(item.steps.at(-1), `${where} last step names the answer`).toMatch(new RegExp(`(^|[^\\d.,])${escapeRe(right.replace(/\B(?=(\d{3})+(?!\d))/g, ","))}([^\\d.,]|$)`));
        }
      }
    });
  });
});

// ── Computed skills: keys re-derived from what the learner sees ─────────────────────────────

const dotsOf = (item: Item) => {
  if (item.visual?.kind !== "dots") throw new Error("expected dots");
  return item.visual.groups;
};
const keyLabel = (item: Item) => (item.answer.kind === "choice" ? item.choices![item.answer.index].label : answerText(item.answer));

describe("s.weather.chart", () => {
  it("names the group with more days, or counts the asked group, from the drawn dots", () => {
    const pattern = /The first group is (\w+) days\. The second group is (\w+) days\./;
    eachItem("s.weather.chart", (en, es, level, where) => {
      const [a, b] = dotsOf(en);
      // Counting is the task, so the picture's description never gives the counts. Instead each group
      // is named for screen readers, in the prompt's order, and numbers its own dots.
      for (const item of [en, es]) expect(item.alt, `${where} alt gives the counts`).not.toMatch(/\d/);
      const [, first, second] = pattern.exec(promptText(en))!;
      expect(first, where).not.toBe(second);
      expect(en.visual?.kind === "dots" && en.visual.labels, where).toEqual([`${cap(first)} days`, `${cap(second)} days`]);
      const [, firstEs, secondEs] = /El primer grupo son los (días [^.]+)\. El segundo grupo son los (días [^.]+)\./.exec(promptText(es))!;
      expect(es.visual?.kind === "dots" && es.visual.labels, where).toEqual([cap(firstEs), cap(secondEs)]);
      if (level === 1) {
        expect(Math.abs(a - b), where).toBeGreaterThanOrEqual(2);
        expect(keyLabel(en).toLowerCase(), where).toBe(`${a > b ? first : second} days`);
      } else {
        const asked = /How many (\w+) days were there\?$/.exec(promptText(en))![1];
        expect(keyLabel(en), where).toBe(String(asked === first ? a : b));
        expect(keyLabel(es), where).toBe(keyLabel(en));
      }
    });
  });
});

describe("s.daylight.hours", () => {
  // Sunrise-to-sunset length on the 15th of a month (NOAA declination series, 0.833° refraction).
  const LAT: Record<string, number> = { Denver: 39.74, Philadelphia: 39.95, "Columbus, Ohio": 39.96, Indianapolis: 39.77 };
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const dayLength = (lat: number, month: number) => {
    const g = ((2 * Math.PI) / 365) * (START[month] + 14);
    const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const phi = (lat * Math.PI) / 180;
    const cosH = (Math.sin((-0.833 * Math.PI) / 180) - Math.sin(phi) * Math.sin(decl)) / (Math.cos(phi) * Math.cos(decl));
    return (2 * ((Math.acos(cosH) * 180) / Math.PI)) / 15;
  };

  it("uses real daylight for the city and month, and keys the longest, shortest or difference", () => {
    eachItem("s.daylight.hours", (en, es, level, where) => {
      const text = promptText(en);
      const city = Object.keys(LAT).find((c) => text.startsWith(`In ${c}, `))!;
      const facts = [...text.matchAll(/(\w+) has about (\d+) hours/g)].map((m) => [MONTHS.indexOf(m[1]), Number(m[2])] as const);
      expect(facts.length, where).toBe(level === 2 ? 3 : 2);
      for (const [m, h] of facts) {
        expect(m, where).toBeGreaterThanOrEqual(0);
        expect(Math.abs(dayLength(LAT[city], m) - h), `${where} ${MONTHS[m]} in ${city}`).toBeLessThan(0.45);
      }
      expect(dotsOf(en), where).toEqual(facts.map(([, h]) => h));
      const byHours = [...facts].sort((p, q) => q[1] - p[1]);
      if (level === 1) expect(keyLabel(en), where).toBe(MONTHS[byHours[0][0]]);
      if (level === 2) expect(keyLabel(en), where).toBe(MONTHS[(/least/.test(text) ? byHours[2] : byHours[0])[0]]);
      if (level === 3) {
        expect(en.input, where).toBe("keypad");
        expect(Number(keyLabel(en)) + byHours[1][1], where).toBe(byHours[0][1]);
        const [, more, less] = /does (\w+) have than (\w+)\?$/.exec(text)!;
        expect([MONTHS.indexOf(more), MONTHS.indexOf(less)], where).toEqual([byHours[0][0], byHours[1][0]]);
      }
    });
  });
});

describe("s.habitat.survey", () => {
  it("compares the counted kinds, from the prompt's own numbers", () => {
    eachItem("s.habitat.survey", (en, es, level, where) => {
      const text = promptText(en);
      const counts = [...text.matchAll(/(The [a-z ]+?) had (\d+) kinds?\b/g)].map((m) => [m[1], Number(m[2])] as const);
      expect(counts.length, where).toBe(level === 3 ? 3 : 2);
      expect(dotsOf(en), where).toEqual(counts.map(([, c]) => c));
      const sorted = [...counts].sort((p, q) => q[1] - p[1]);
      if (level === 1) expect(keyLabel(en), where).toBe(sorted[0][0]);
      if (level === 2) expect(Number(keyLabel(en)) + sorted[1][1], where).toBe(sorted[0][1]);
      if (level === 3) expect(keyLabel(en), where).toBe((/fewest/.test(text) ? sorted[2] : sorted[0])[0]);
      expect(keyLabel(es) === keyLabel(en) || level !== 2, where).toBe(true);
    });
  });
});

describe("s.climate.data", () => {
  // Mean daily high temperatures (°F), 1991–2020 normals, for January, April, July and October:
  // NOAA (Minneapolis–St. Paul and Chicago O'Hare airports), Environment Canada (Toronto Pearson,
  // Montréal–Trudeau, Winnipeg airports), Argentina's SMN (Buenos Aires Observatorio Central) and
  // Australia's BOM (Sydney Observatory Hill, Melbourne Olympic Park, Adelaide Kent Town).
  const NORMALS: Record<string, [number, number, number, number]> = {
    "Minneapolis, Minnesota": [23.6, 56.6, 83.4, 58.1],
    "Chicago, Illinois": [31.6, 59.0, 84.5, 62.7],
    "Toronto, Canada": [29.8, 53.6, 81.3, 58.3],
    "Montreal, Canada": [23.0, 52.3, 80.1, 55.8],
    "Winnipeg, Canada": [11.5, 50.0, 78.4, 50.7],
    "Buenos Aires, Argentina": [86.2, 73.8, 59.9, 72.7],
    "Sydney, Australia": [80.6, 74.5, 64.2, 73.8],
    "Melbourne, Australia": [79.9, 69.8, 57.4, 67.6],
    "Adelaide, Australia": [83.5, 72.5, 59.4, 71.1],
  };
  const SOUTH = new Set(["Buenos Aires, Argentina", "Sydney, Australia", "Melbourne, Australia", "Adelaide, Australia"]);

  it("keys the warmest, coldest, difference or climate type from the listed data, with seasons that fit the hemisphere", () => {
    eachItem("s.climate.data", (en, es, level, where) => {
      const text = promptText(en);
      if (level === 3) {
        const towns = [...text.matchAll(/(\S+)'s town gets (\d+) inches/g)].map((m) => [m[1], Number(m[2])] as const);
        expect(towns.length, where).toBe(3);
        const byRain = [...towns].sort((p, q) => p[1] - q[1]);
        const desert = /desert climate/.test(text);
        const want = desert ? byRain[0] : byRain[2];
        expect(keyLabel(en), where).toBe(`${want[0]}'s town`);
        // Deserts get under 10 inches of rain a year; rainforests get well over 60.
        if (desert) expect(want[1], where).toBeLessThan(10);
        else expect(want[1], where).toBeGreaterThan(60);
        return;
      }
      const temps = Object.fromEntries([...text.matchAll(/(January|April|July|October) (\d+)°F/g)].map((m) => [m[1], Number(m[2])]));
      expect(Object.keys(temps).length, where).toBe(4);
      const south = /south of the equator/.test(text);
      // Every temperature is within 2.5 °F of the real normal for the named city and month.
      const place = /lives in (.+?)(?:, south of the equator)?\. Average high/.exec(text)![1];
      expect(NORMALS[place], `${where} unknown place ${place}`).toBeDefined();
      expect(south, `${where} ${place} hemisphere`).toBe(SOUTH.has(place));
      ["January", "April", "July", "October"].forEach((m, i) => expect(Math.abs(temps[m] - NORMALS[place][i]), `${where} ${m} in ${place}`).toBeLessThanOrEqual(2.5));
      // Summer is in July north of the equator and in January south of it.
      if (south) expect(temps.January, where).toBeGreaterThan(temps.July);
      else expect(temps.July, where).toBeGreaterThan(temps.January);
      const sorted = Object.entries(temps).sort((p, q) => q[1] - p[1]);
      expect(sorted[0][1], where).toBeGreaterThan(sorted[1][1]);
      expect(sorted[2][1], where).toBeGreaterThan(sorted[3][1]);
      if (level === 1) {
        const warmest = /warmest\?$/.test(text);
        expect(keyLabel(en), where).toBe(warmest ? sorted[0][0] : sorted[3][0]);
        // Month names are capitalized as choice labels in both languages.
        for (const c of es.choices!) expect(c.label, where).toMatch(/^[A-Z]/);
        const july = en.choices!.find((c) => c.label === (warmest ? "July" : "January"));
        if (south && july && july.label !== keyLabel(en)) expect(july.why, where).toBe("assumed-northern-seasons");
      } else {
        expect(Number(keyLabel(en)) + sorted[3][1], where).toBe(sorted[0][1]);
      }
    });
  });
});

describe("s.motion.patterns", () => {
  it("keys balanced and unbalanced forces, the next time in a pattern and the number of full trips", () => {
    eachItem("s.motion.patterns", (en, es, level, where) => {
      const text = promptText(en);
      if (level === 1) {
        const rope = /red team has (\d+) kids and the blue team has (\d+) kids/.exec(text);
        const box = /(\d+) kids push a box from the left side\. (\d+) kids push it from the right side\./.exec(text);
        const m = rope ?? box;
        expect(m, where).toBeTruthy();
        const [left, right] = [Number(m![1]), Number(m![2])];
        const want = rope
          ? left === right ? "It does not move" : left > right ? "It moves toward the red team" : "It moves toward the blue team"
          : left === right ? "It stays still" : left > right ? "It slides to the right" : "It slides to the left";
        expect(keyLabel(en), where).toBe(want);
      } else if (level === 2) {
        const [a, b, c] = /at (\d+), (\d+) and (\d+) seconds/.exec(text)!.slice(1).map(Number);
        expect(b - a, where).toBe(c - b);
        expect(b - a, where).toBeGreaterThan(0);
        expect(en.input, where).toBe("number-line");
        expect(Number(keyLabel(en)), where).toBe(c + (c - b));
      } else {
        const [, p, unit] = /every (\d+) (seconds|minutes)/.exec(text)!;
        const [, total, unit2] = / in (\d+) (seconds|minutes)\?$/.exec(text)!;
        expect(unit2, where).toBe(unit);
        expect(Number(keyLabel(en)) * Number(p), where).toBe(Number(total));
      }
    });
  });
});

describe("s.wave.shape", () => {
  it("reads amplitude and wavelength from the drawn wave, and compares waves from their numbers", () => {
    eachItem("s.wave.shape", (en, es, level, where) => {
      const text = promptText(en);
      // Water waves this steep would break; the waves travel along ropes and springs.
      expect(text, `${where} water wave`).not.toMatch(/water|pool|tank/i);
      expect(promptText(es), `${where} water wave`).not.toMatch(/agua|piscina|tanque|ola\b/i);
      if (level === 3) {
        const [a1, w1, a2, w2] = /Wave A has an amplitude of (\d+) \w+ and a wavelength of (\d+) \w+\. Wave B has an amplitude of (\d+) \w+ and a wavelength of (\d+) \w+\./
          .exec(text)!
          .slice(1)
          .map(Number);
        if (/bigger amplitude\?$/.test(text)) expect(keyLabel(en), where).toBe(a1 > a2 ? "Wave A" : "Wave B");
        else if (/longer wavelength\?$/.test(text)) expect(keyLabel(en), where).toBe(w1 > w2 ? "Wave A" : "Wave B");
        else {
          expect(w1, `${where} energy question needs equal wavelengths`).toBe(w2);
          expect(keyLabel(en), where).toBe(a1 > a2 ? "Wave A" : "Wave B");
        }
        return;
      }
      if (en.visual?.kind !== "line-graph") throw new Error(`${where} expected a line graph`);
      const ys = en.visual.points.map((p) => p[1]);
      const [top, bottom] = [Math.max(...ys), Math.min(...ys)];
      const crests = en.visual.points.filter((p) => p[1] === top).map((p) => p[0]);
      const gaps = crests.slice(1).map((x, i) => x - crests[i]);
      expect(new Set(gaps).size, `${where} crests evenly spaced`).toBe(1);
      for (const x of crests) expect(Number.isInteger(x), `${where} crest on a labeled tick`).toBe(true);
      expect(top, `${where} height axis counts by ones`).toBeLessThanOrEqual(6);
      const rest = Number(/rests at a height of (\d+)/.exec(text)![1]);
      expect(rest * 2, `${where} rest line is midway`).toBe(top + bottom);
      // A hand-shaken rope makes a wave at most a quarter as high as it is long, its troughs off the ground.
      if (/rope/.test(text)) {
        expect(4 * (top - rest), `${where} rope wave too steep`).toBeLessThanOrEqual(gaps[0]);
        expect(bottom, `${where} rope trough on the ground`).toBeGreaterThan(0);
      }
      expect(Number(keyLabel(en)), where).toBe(level === 1 ? top - rest : gaps[0]);
    });
  });
});

const num = (s: string) => Number(s.replace(/,/g, ""));

describe("s.matter.mass", () => {
  // Chemistry kept apart from the generator: salt dissolves up to about 36 g per 100 g of water;
  // NaHCO3 (84.01 g/mol) gives one CO2 (44.01 g/mol); household vinegar is about 5% acetic acid
  // (60.05 g/mol), one acid per CO2.
  const CO2_PER_G_SODA = 44.01 / 84.01;
  const CO2_PER_G_VINEGAR = (0.05 / 60.05) * 44.01;
  // Properties of each material, written independently: a magnet pulls it, it conducts electricity,
  // it dissolves in water, the water then conducts (dissolving ones), it floats (the others), and
  // words that fit how it looks.
  type Props = { magnet: boolean; conducts: boolean; dissolves: boolean; solution?: boolean; floats?: boolean; look: RegExp };
  const PROPS: Record<string, Props> = {
    Iron: { magnet: true, conducts: true, dissolves: false, floats: false, look: /gray metal/ },
    Aluminum: { magnet: false, conducts: true, dissolves: false, floats: false, look: /silver metal/ },
    Copper: { magnet: false, conducts: true, dissolves: false, floats: false, look: /reddish-brown metal/ },
    Salt: { magnet: false, conducts: false, dissolves: true, solution: true, look: /white crystals/ },
    Sugar: { magnet: false, conducts: false, dissolves: true, solution: false, look: /white crystals/ },
    "Baking soda": { magnet: false, conducts: false, dissolves: true, solution: true, look: /white powder/ },
    Chalk: { magnet: false, conducts: false, dissolves: false, floats: false, look: /dusty marks/ },
    Wax: { magnet: false, conducts: false, dissolves: false, floats: true, look: /smooth/ },
    Wood: { magnet: false, conducts: false, dissolves: false, floats: true, look: /light brown/ },
    Glass: { magnet: false, conducts: false, dissolves: false, floats: false, look: /clear and hard/ },
    Sand: { magnet: false, conducts: false, dissolves: false, floats: false, look: /tan grains/ },
  };
  type Seen = { magnet?: boolean; conducts?: boolean; dissolves?: boolean; solution?: boolean; floats?: boolean; look?: string };
  /** The test results a learner reads in the prompt; a test that is not reported stays undefined. */
  const seenIn = (text: string): Seen => {
    const yes = (re: RegExp, no: RegExp) => (re.test(text) ? true : no.test(text) ? false : undefined);
    return {
      magnet: yes(/A magnet pulls it\./, /A magnet does not pull it\./),
      conducts: yes(/(^|\. )It conducts electricity\./, /(^|\. )It does not conduct electricity\./),
      dissolves: yes(/It dissolves in water/, /It does not dissolve in water/),
      solution: yes(/then the water conducts/, /water still does not conduct/),
      floats: yes(/and it floats\./, /and it sinks\./),
      look: /(?:^|\. )(It is [^.]+)\./.exec(text)?.[1],
    };
  };
  /** Which reported results `name` contradicts; empty when every reported result fits it. */
  const misfits = (name: string, seen: Seen) => {
    const p = PROPS[name];
    const out: string[] = [];
    for (const t of ["magnet", "conducts", "dissolves", "solution", "floats"] as const) if (seen[t] !== undefined && seen[t] !== p[t]) out.push(t);
    if (seen.look !== undefined && !p.look.test(seen.look)) out.push("look");
    return out;
  };
  const TAG_TEST: Record<string, string> = {
    "ignored-how-it-looks": "look",
    "ignored-magnet-test": "magnet",
    "ignored-conductivity-test": "conducts",
    "ignored-dissolving-test": "dissolves",
    "ignored-solution-test": "solution",
    "ignored-floating-test": "floats",
  };

  it("identifies a material from varied test results that rule out every wrong choice", () => {
    const prompts = { en: new Set<string>(), es: new Set<string>() };
    const keys = new Set<string>();
    for (const seed of SEEDS) {
      const en = makeItem("s.matter.mass", 3, seed, "en");
      const es = makeItem("s.matter.mass", 3, seed, "es");
      const where = `s.matter.mass L3 seed ${seed}`;
      const text = promptText(en);
      const seen = seenIn(text);
      const key = keyLabel(en);
      expect(misfits(key, seen), `${where} key ${key} does not fit: ${text}`).toEqual([]);
      // At least one measured property is reported, not only how it looks.
      expect(seen.magnet ?? seen.conducts ?? seen.dissolves, `${where} looks only: ${text}`).toBeDefined();
      for (const c of en.choices!) {
        if (c.label === key) continue;
        const why = misfits(c.label, seen);
        expect(why.length, `${where} ${c.label} also fits: ${text}`).toBeGreaterThan(0);
        expect(why, `${where} ${c.label} tagged ${c.why}`).toContain(TAG_TEST[c.why!]);
        // Looks decide only when no measurement could: a choice that differs from the key in a
        // measured property is ruled out by a reported measurement.
        const [p, q] = [PROPS[key], PROPS[c.label]];
        const measurable = (["magnet", "conducts", "dissolves", "solution", "floats"] as const).some((t) => p[t] !== q[t]);
        if (measurable) expect(why.some((t) => t !== "look"), `${where} ${c.label} ruled out by looks only: ${text}`).toBe(true);
        // A choice a reported measurement rules out is tagged with a measurement, never with its looks.
        if (why.some((t) => t !== "look")) expect(c.why, `${where} ${c.label} tagged by looks: ${text}`).not.toBe("ignored-how-it-looks");
      }
      // Hint 3 rules out a wrong choice that is shown, and never names the key.
      const wrongNames = en.choices!.filter((c) => c.label !== key).map((c) => c.label.toLowerCase());
      expect(wrongNames.some((n) => en.hints[2].toLowerCase().includes(n)), `${where} hint 3: ${en.hints[2]}`).toBe(true);
      // It rules the choice out by its looks only when no reported measurement does.
      const named = en.choices!.find((c) => c.label !== key && en.hints[2].toLowerCase().includes(c.label.toLowerCase()))!;
      if (/does not look like this/.test(en.hints[2])) expect(misfits(named.label, seen), `${where} hint 3 uses looks: ${en.hints[2]} | ${text}`).toEqual(["look"]);
      expect(/no se ve así/.test(es.hints[2]), `${where} hint 3 differs between languages`).toBe(/does not look like this/.test(en.hints[2]));
      expect(en.hints[2].toLowerCase(), where).not.toContain(key.toLowerCase());
      expect(es.hints[2].toLowerCase(), where).not.toContain(keyLabel(es).toLowerCase());
      prompts.en.add(text);
      prompts.es.add(promptText(es));
      keys.add(key);
    }
    expect(keys.size, "materials used as keys").toBeGreaterThanOrEqual(10);
    expect(prompts.en.size, "distinct English questions").toBeGreaterThanOrEqual(12);
    expect(prompts.es.size, "distinct Spanish questions").toBeGreaterThanOrEqual(12);
  });

  it("conserves mass and finds escaped gas within what the reaction can make", () => {
    const kinds = new Set<string>();
    eachItem("s.matter.mass", (en, es, level, where) => {
      const text = promptText(en);
      if (level === 3) return;
      const key = Number(keyLabel(en));
      let m: RegExpExecArray | null;
      if ((m = /stirs (\d+) grams of (sugar|salt) into (\d+) grams of water/.exec(text))) {
        const [solute, water] = [Number(m[1]), Number(m[3])];
        if (m[2] === "salt") expect(solute, `${where} salt would not all dissolve`).toBeLessThanOrEqual(0.36 * water);
        expect(key - water, where).toBe(solute);
        kinds.add("dissolve");
      } else if ((m = /has (\d+) grams of salt water in a dish\. .* and (\d+) grams of salt are left/.exec(text))) {
        const [total, salt] = [Number(m[1]), Number(m[2])];
        expect(salt / total, `${where} saltier than water can hold`).toBeLessThanOrEqual(0.27);
        expect(key + salt, where).toBe(total);
        kinds.add("evaporate");
      } else if ((m = /seals (\d+) grams of steel wool in a jar of air\. The jar and everything in it have a mass of (\d+) grams/.exec(text))) {
        expect(key, where).toBe(Number(m[2]));
        kinds.add("rust");
      } else if ((m = /mixes (\d+) grams of vinegar with (\d+) grams of baking soda/.exec(text))) {
        const [vinegar, soda] = [Number(m[1]), Number(m[2])];
        if (/sealed bag/.test(text)) {
          expect(key - vinegar, where).toBe(soda);
          kinds.add("sealed");
        } else {
          const after = Number(/have a mass of (\d+) grams/.exec(text)![1]);
          expect(after + key, where).toBe(vinegar + soda);
          expect(key, `${where} more gas than the reaction can make`).toBeLessThanOrEqual(Math.min(soda * CO2_PER_G_SODA, vinegar * CO2_PER_G_VINEGAR));
          expect(key, where).toBeGreaterThan(0);
          kinds.add("open");
        }
      } else throw new Error(`${where} unknown prompt: ${text}`);
    });
    expect([...kinds].sort()).toEqual(["dissolve", "evaporate", "open", "rust", "sealed"]);
  });
});

describe("s.earth.water", () => {
  // USGS "Where is Earth's water": 96.5% oceans + 0.9% saline lakes and groundwater, 2.5% fresh;
  // fresh water is 68.7% ice and glaciers, 30.1% groundwater, 1.2% surface and other.
  const USGS = { salt: 97.4, fresh: 2.5, ice: 68.7, ground: 30.1, other: 1.2 };
  const shareOf = (desc: string) => (/ice and glaciers/.test(desc) ? "ice" : /groundwater/.test(desc) ? "ground" : "other") as "ice" | "ground" | "other";

  it("uses the real shares, rounded, and keys each amount from the totals in the prompt", () => {
    eachItem("s.earth.water", (en, es, level, where) => {
      const text = promptText(en);
      // A share or count of one takes the singular in both languages.
      for (const t of [text, promptText(es), ...en.steps, ...es.steps]) expect(t, `${where} plural with one`).not.toMatch(/\b[Uu]nas 1(?![\d,])|(?<![\d,])1 (buckets|jugs|bottles|cups|cubetas|jarras|botellas|tazas|drops are|de cada 100 gotas están)\b/);
      const key = num(keyLabel(en));
      if (level === 1) {
        const total = num(/poured into ([\d,]+) /.exec(text)![1]);
        expect(Math.abs(97 - USGS.salt), where).toBeLessThan(0.5);
        expect(Math.abs(3 - USGS.fresh), where).toBeLessThanOrEqual(0.5);
        const fresh = /would be fresh water\?$/.test(text);
        expect(key * 100, where).toBe((fresh ? 3 : 97) * total);
      } else if (level === 2) {
        const m = /fresh water in ([\d,]+) \w+\. About ([\d,]+) would be ([^.]+)\. About ([\d,]+) would be ([^.]+)\. The rest would be ([^.]+)\./.exec(text)!;
        const total = num(m[1]);
        const parts: [number, string][] = [[num(m[2]), m[3]], [num(m[4]), m[5]], [key, m[6]]];
        expect(parts.reduce((s, [v]) => s + v, 0), where).toBe(total);
        for (const [v, desc] of parts) expect(Math.abs((100 * v) / total - USGS[shareOf(desc)]), `${where} ${desc}`).toBeLessThan(0.5);
        expect(new Set(parts.map(([, d]) => shareOf(d))).size, where).toBe(3);
        // The part asked about is named the same way whatever its size, so the wording never tells the count.
        expect(promptText(es), where).toMatch(/\. El resto estaría [^.]+\. ¿Cuántas \w+ son\?$/);
      } else {
        const total = num(/water as ([\d,]+) drops/.exec(text)![1]);
        const [, share, verb, desc] = /about (\d+) out of every 100 drops (is|are) ([^.]+)\./.exec(text)!;
        expect(verb, where).toBe(share === "1" ? "is" : "are");
        expect(Math.abs(Number(share) - USGS[shareOf(desc)]), where).toBeLessThan(0.5);
        expect(key * 100 * 100, where).toBe(total * 3 * Number(share));
      }
    });
  });
});

describe("grade coverage", () => {
  it("gives every grade K–5 six to eight science skills across both K–5 strands", () => {
    for (const grade of ["K", "1", "2", "3", "4", "5"]) {
      const n = [...SCIENCE_K_5, ...SCIENCE_K_5_MORE].filter((s) => s.grade === grade).length;
      expect(n, `grade ${grade}`).toBeGreaterThanOrEqual(6);
      expect(n, `grade ${grade}`).toBeLessThanOrEqual(8);
    }
  });
});

describe("science facts in the banks", () => {
  const entries = (id: string) => BANKS[id].flatMap((l) => l.items);
  const keyOf = (e: Entry) => e.a[0].t[0];

  // Known answers, written independently of the banks: each matcher must hit at least one entry.
  const FACTS: [string, string, RegExp, RegExp][] = [
    ["dark colors warm more in sunlight", "s.sun.warms", /Which shirt gets warmer/, /^A black shirt$/],
    ["shade is cooler", "s.sun.warms", /Where do you feel cooler/, /shade/],
    ["tornado: lowest room, no windows", "s.weather.ready", /tornado warning/, /no windows/],
    ["never cross floodwater", "s.weather.ready", /Floodwater covers the road/, /Turn around/],
    ["beavers build dams", "s.living.change", /beaver/, /dam/],
    ["sounds come from vibrations", "s.sound.vibrate", /What do all sounds come from/, /vibrate/],
    ["the Moon reflects sunlight", "s.light.see", /see the Moon at night/, /^Sunlight/],
    ["a flame makes its own light", "s.light.see", /Which one makes its own light/, /candle/],
    ["cat eyes reflect light", "s.light.see", /cat's eyes shine/, /bounce light back/],
    ["glass lets light through", "s.light.through", /clear window\. What happens/, /right through/],
    ["mirrors reflect", "s.light.through", /at a mirror\. What happens/, /bounces back/],
    ["cardboard blocks light", "s.light.through", /cardboard box/, /^No light/],
    ["flytraps catch insects", "s.parts.jobs", /flytrap/, /catch bugs/],
    ["sea turtles get no parent care", "s.parents.young", /sea turtle lays eggs/, /^No/],
    ["tadpoles become frogs", "s.parents.young", /tadpole/, /frog/],
    ["the Moon can be seen in the day", "s.sky.patterns", /Moon in the daytime/, /^Yes$/],
    ["stars are still there in the day", "s.sky.patterns", /stars in the daytime/, /^Still there/],
    ["coconuts travel by sea", "s.plants.grow", /coconut floats/, /floats across the ocean/],
    ["corn is wind-pollinated", "s.plants.grow", /Corn pollen/, /wind/i],
    ["seeds sprout without soil", "s.plants.grow", /wet paper towel/, /without soil/],
    ["the ocean is salty", "s.landforms.water", /Which body of water is salty/, /ocean/],
    ["water covers more of Earth than land", "s.landforms.water", /globe, which covers more/, /^Water$/],
    ["wind moves dunes", "s.wind.water.land", /Sand dunes move/, /^Wind$/],
    ["bare hills lose more soil", "s.wind.water.land", /Two hills get heavy rain/, /bare/],
    ["burning cannot be undone", "s.heat.cool", /Paper burns to ash/, /^No/],
    ["melting can be undone", "s.heat.cool", /ice pop melts/, /^Yes/],
    ["a frozen leaf is damaged for good", "s.heat.cool", /leaf freezes/, /^No/],
    ["web spinning is inherited", "s.traits.inherited", /spider spins its first web/, /^Inherited$/],
    ["talking parrots learned it", "s.traits.inherited", /parrot learns/, /^Learned$/],
    ["flamingo color comes from food", "s.traits.inherited", /Flamingos/, /Food/],
    ["paleness from darkness is not inherited", "s.traits.inherited", /grows in the dark and turns pale/, /^Green/],
    ["lower layers are usually older", "s.fossils.past", /Layer A is below layer B/, /layer A/],
    ["seashells in a desert mean an old sea", "s.fossils.past", /Seashell fossils are found in a desert/, /under the sea/],
    ["flat teeth grind plants", "s.fossils.past", /flat and wide/, /^Plants$/],
    ["a camel's hump stores fat", "s.adapt.survive", /camel stores fat/, /without food/],
    ["longer necks reach more leaves", "s.adapt.survive", /Giraffes vary/, /longer necks/],
    ["like charges repel", "s.magnets.static", /same wool sweater/, /push apart/],
    ["magnets lift steel cans", "s.magnets.static", /recycling center/, /^Steel/],
    ["magnetic pull weakens with distance", "s.magnets.static", /farther from a steel nail/, /weaker/],
    ["we see by reflected light", "s.eyes.senses", /lamp let you see a book/, /bounces off the book into your eyes/],
    ["pupils shrink in bright light", "s.eyes.senses", /pupils get smaller/, /less light/],
    ["snakes smell with their tongues", "s.eyes.senses", /snake flicks/, /Smelling/],
    ["lungs take in oxygen", "s.structures.functions", /What do the lungs do/, /oxygen/],
    ["more speed, more energy of motion", "s.speed.collisions", /roller coaster/, /bottom/],
    ["energy passes in a collision", "s.speed.collisions", /Pool ball A/, /rolls forward/],
    ["coal is nonrenewable", "s.renewable", /Coal formed/, /^Nonrenewable$/],
    ["uranium is nonrenewable", "s.renewable", /uranium/, /^Nonrenewable$/],
    ["geothermal heat is renewable", "s.renewable", /heat from deep inside Earth/, /^Renewable$/],
    ["drop, cover and hold on", "s.quakes.volcanoes", /shaking while you are indoors/, /Drop, cover and hold on/],
    ["the Ring of Fire circles the Pacific", "s.quakes.volcanoes", /Ring of Fire/, /Pacific/],
    ["Florida has very few earthquakes", "s.quakes.volcanoes", /very few earthquakes/, /^Florida$/],
    ["close contour lines mean steep land", "s.quakes.volcanoes", /very close together/, /^Steep land$/],
    ["a willow's mass did not come from soil", "s.plant.matter", /willow/, /did not come from soil/],
    ["plant mass comes from carbon dioxide and water", "s.plant.matter", /giant tree/, /^Carbon dioxide/],
    ["mold is a decomposer", "s.plant.matter", /Which of these is a decomposer/, /^Mold$/],
    ["living things form the biosphere", "s.plant.matter", /all living things/, /^Biosphere$/],
    ["down is toward Earth's center", "s.sun.gravity", /dropped in Australia/, /center/],
    ["the Sun looks bright because it is close", "s.sun.gravity", /brighter than other stars/, /closer/],
    ["sunlight takes about 8 minutes", "s.sun.gravity", /sunlight take to reach Earth/, /8 minutes/],
    ["US noon shadows point north", "s.sun.gravity", /shadows point at noon/, /^North$/],
    ["winter noon shadows are longer because the Sun is lower", "s.sun.gravity", /longer in winter/, /lower/],
  ];

  it.each(FACTS)("%s", (_, id, q, key) => {
    const hits = entries(id).filter((e) => q.test(e.q[0]));
    expect(hits.length, "matcher found no entry").toBeGreaterThan(0);
    for (const e of hits) expect(keyOf(e), e.q[0]).toMatch(key);
  });

  it("never makes a common misconception the key, and does offer them as distractors", () => {
    const WRONG = /The soil it eats|ate the soil|Light shoots out of your eyes|hump is full of water|farther from the Sun in winter|no gravity on the Moon|the biggest star|Necks grow longer when|turn pale when they need|The Sun moves around Earth|travels around Earth each day|a tan is inherited|Fish once lived on dry mountains|Seeds need soil to sprout/i;
    const all = Object.values(BANKS).flatMap((levels) => levels.flatMap((l) => l.items));
    for (const e of all) expect(keyOf(e), e.q[0]).not.toMatch(WRONG);
    const distractors = all.flatMap((e) => e.a.slice(1).map((c) => c.t[0]));
    for (const m of ["The hump is full of water", "Earth is farther from the Sun in winter", "There is no gravity on the Moon", "It is the biggest star", "Light shoots out of your eyes to the book", "Necks grow longer when giraffes stretch", "The soil it eats"]) {
      expect(distractors, m).toContain(m);
    }
  });
});
