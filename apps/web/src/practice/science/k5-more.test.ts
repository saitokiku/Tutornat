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
  ["s.daylight.hours", "1", "1-ESS1-2", ["s.weather.chart"], 3, "computed"],
  ["s.habitat.survey", "2", "2-LS4-1", ["s.habitats"], 3, "computed"],
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
      expect(es.visual, where).toEqual(en.visual);
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
      const [, first, second] = pattern.exec(promptText(en))!;
      expect(first, where).not.toBe(second);
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
