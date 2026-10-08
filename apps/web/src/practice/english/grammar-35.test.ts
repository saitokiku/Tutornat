import { describe, expect, it } from "vitest";
import { check } from "../answer";
import { makeItem, SKILLS } from "../skills";
import type { Item } from "../types";
import { ENGLISH_K_4_BANKS } from "./early";
import { DICT_WORDS, dictCompare, ENGLISH_GRAMMAR_3_5, GRAMMAR_3_5_LEVELS, isLabel, type G, type L, type Level } from "./grammar-35";

// Grades 3–5 grammar is hand-written (draft) except dictionary order, so most keys cannot be recomputed by
// a calculator. These tests check every bank entry for shape, then re-derive each key by a rule written
// here and not used by the generator: plural and participle tables, conjugation by person, the order of
// adjective kinds, the y/e and o/u sound rule, the link each conjunction makes, title-case rules, comma and
// raya patterns, root meanings, a collator for alphabetical order. Then they build 240 items per level in
// both languages and check the copy, the choices, the misconception tags, and the key.

const LOCALES = ["en", "es"] as const;
type Loc = (typeof LOCALES)[number];
const SEEDS = Array.from({ length: 240 }, (_, i) => i * 104729 + 11);

const TABLE: [id: string, grade: string, standard: string, prereqs: string[], levels: number, content: "draft" | "computed"][] = [
  ["e.abstract.nouns", "3", "L.3.1c", ["e.nouns.verbs"], 2, "draft"],
  ["e.irregular.plurals", "3", "L.3.1b", ["e.plurals"], 2, "draft"],
  ["e.possessives", "3", "L.3.2d", ["e.irregular.plurals"], 2, "draft"],
  ["e.verb.tenses", "3", "L.3.1e", ["e.past.tense"], 2, "draft"],
  ["e.comparatives", "3", "L.3.1g", ["e.adjectives"], 2, "draft"],
  ["e.conjunctions", "3", "L.3.1h", ["e.nouns.verbs"], 2, "draft"],
  ["e.suffixes", "3", "L.3.4b", ["e.prefixes"], 2, "draft"],
  ["e.dictionary.order", "3", "L.3.2g", ["e.sight.words"], 2, "computed"],
  ["e.titles.letters", "3", "L.3.2", ["e.capitals"], 2, "draft"],
  ["e.relative.words", "4", "L.4.1a", ["e.conjunctions"], 2, "draft"],
  ["e.progressive.tenses", "4", "L.4.1b", ["e.verb.tenses"], 1, "draft"],
  ["e.modal.verbs", "4", "L.4.1c", ["e.verb.tenses"], 1, "draft"],
  ["e.adjective.order", "4", "L.4.1d", ["e.comparatives"], 1, "draft"],
  ["e.prepositional.phrases", "4", "L.4.1e", ["e.nouns.verbs"], 2, "draft"],
  ["e.fragments.runons", "4", "L.4.1f", ["e.conjunctions"], 2, "draft"],
  ["e.dialogue.punctuation", "4", "L.4.2b", ["e.commas"], 2, "draft"],
  ["e.greek.latin.roots", "4", "L.4.4b", ["e.suffixes"], 2, "draft"],
  ["e.idioms.proverbs", "4", "L.4.5b", ["e.figurative"], 2, "draft"],
  ["e.conj.prep.interj", "5", "L.5.1a", ["e.prepositional.phrases", "e.conjunctions"], 2, "draft"],
  ["e.perfect.tenses", "5", "L.5.1b", ["e.progressive.tenses"], 2, "draft"],
  ["e.tense.shifts", "5", "L.5.1d", ["e.verb.tenses"], 2, "draft"],
  ["e.correlative.conjunctions", "5", "L.5.1e", ["e.conj.prep.interj"], 1, "draft"],
  ["e.intro.commas", "5", "L.5.2", ["e.commas"], 2, "draft"],
  ["e.titles.of.works", "5", "L.5.2d", ["e.titles.letters"], 2, "draft"],
  ["e.greek.latin.affixes", "5", "L.5.4b", ["e.greek.latin.roots"], 2, "draft"],
  ["e.analogies", "5", "L.5.5c", ["e.synonyms"], 2, "draft"],
];

const lc = (s: string) => s.toLowerCase();
const strip = (s: string) => s.normalize("NFD").replace(/[̀-́̈]/g, "").normalize("NFC");
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Whole-word (or whole-phrase) match, letters with accents counting as letters. */
const hasWord = (text: string, w: string) => new RegExp(`(^|[^\\p{L}'])${esc(lc(w))}($|[^\\p{L}'])`, "u").test(lc(text));
const words = (s: string) => s.split(/[^\p{L}'’]+/u).filter(Boolean);
const KEBAB = /^[a-z]+(-[a-z]+)*$/;
const FILLER = /great job|good job|awesome|well done|amazing|let's dive|excelente trabajo|genial|buen trabajo/i;

/** Every pick entry of a skill level in one language. */
const picks = (id: string, level: number, l: Loc) => {
  const lv = GRAMMAR_3_5_LEVELS[id][level - 1];
  if (isLabel(lv)) throw new Error(`${id} L${level} is a label level`);
  return lv.bank.map((e) => e[l]);
};
const labels = (id: string, level: number, l: Loc) => {
  const lv = GRAMMAR_3_5_LEVELS[id][level - 1];
  if (!isLabel(lv)) throw new Error(`${id} L${level} is a pick level`);
  return lv.bank.map((e) => e[l]);
};
const text = (item: Item) => item.prompt.map((p) => (typeof p === "string" ? p : "blank" in p ? "___" : "")).join("");

describe("grades 3–5 grammar: strand shape", () => {
  it("matches the skill table: ids, order, grades, standards, prereqs, levels, content", () => {
    expect(ENGLISH_GRAMMAR_3_5.map((s) => s.id)).toEqual(TABLE.map((t) => t[0]));
    for (const [id, grade, standard, prereqs, levels, content] of TABLE) {
      const s = ENGLISH_GRAMMAR_3_5.find((k) => k.id === id)!;
      expect([s.subject, s.grade, s.standard, s.prereqs, s.levels, s.content], id).toEqual(["english", grade, standard, prereqs, levels, content]);
      expect(s.title.en.trim() && s.title.es.trim(), id).toBeTruthy();
      if (content === "draft") expect(GRAMMAR_3_5_LEVELS[id].length, id).toBe(levels);
    }
  });

  it("uses new ids only, and every prerequisite is a real skill taught earlier", () => {
    const order = SKILLS.map((s) => s.id);
    for (const s of ENGLISH_GRAMMAR_3_5) {
      expect(order.filter((x) => x === s.id).length, s.id).toBe(1);
      for (const p of s.prereqs) expect(order.indexOf(p), `${s.id} needs ${p}`).toBeGreaterThanOrEqual(0);
      for (const p of s.prereqs) expect(order.indexOf(p), `${s.id} after ${p}`).toBeLessThan(order.indexOf(s.id));
    }
  });
});

describe.each(Object.keys(GRAMMAR_3_5_LEVELS).map((id) => [id] as const))("%s bank", (id) => {
  const levels: Level[] = GRAMMAR_3_5_LEVELS[id];

  it("has at least 12 distinct, complete entries per level in each language", () => {
    for (const [i, lv] of levels.entries())
      for (const l of LOCALES) {
        const entries = (lv.bank as { en: G | L; es: G | L }[]).map((e) => e[l]);
        expect(new Set(entries.map((e) => JSON.stringify(e))).size, `${id} L${i + 1} ${l}`).toBeGreaterThanOrEqual(12);
        const shown = isLabel(lv) ? entries.map((e) => e[0]) : entries.map((e) => `${e[0]}|${e[1]}`);
        expect(new Set(shown).size, `${id} L${i + 1} ${l} repeats a question`).toBe(entries.length);
      }
  });

  it("has well-formed questions: choices, tags, hints, worked lines, plain copy", () => {
    for (const [i, lv] of levels.entries())
      for (const l of LOCALES) {
        const where = (e: unknown) => `${id} L${i + 1} ${l} ${JSON.stringify(e).slice(0, 90)}`;
        const [ask, [h1, h2]] = [lv.ask[l], lv.hints[l]];
        for (const s of [ask, h1, h2]) expect(s.trim(), `${id} ${l} level copy`).not.toBe("");
        if (isLabel(lv)) {
          expect(lv.labels[l].length, id).toBeGreaterThanOrEqual(2);
          expect(lv.labels[l].length, id).toBeLessThanOrEqual(4);
          expect(lv.tags.length, id).toBe(lv.labels[l].length);
          for (const t of lv.tags) expect(t, id).toMatch(KEBAB);
          for (const e of lv.bank.map((b) => b[l])) {
            const [show, label, clue, why] = e;
            expect(label >= 0 && label < lv.labels[l].length, where(e)).toBe(true);
            for (const s of [show, clue, why]) expect(s.trim(), where(e)).not.toBe("");
            expect(lc(clue), `${where(e)} clue gives the label`).not.toContain(lc(lv.labels[l][label]));
            checkCopy([show, clue, why], where(e));
          }
          continue;
        }
        for (const e of lv.bank.map((b) => b[l])) {
          const [show, key, wrong, clue, why, base] = e;
          expect(key.trim() && clue.trim() && why.trim(), where(e)).toBeTruthy();
          expect(show.split("___").length, `${where(e)} blanks`).toBeLessThanOrEqual(2);
          expect(wrong.length, where(e)).toBeGreaterThanOrEqual(1);
          expect(wrong.length + 1, where(e)).toBeGreaterThanOrEqual(3);
          expect(wrong.length + 1, where(e)).toBeLessThanOrEqual(4);
          const choice = [key, ...wrong.map((w) => w[0])];
          expect(new Set(choice).size, `${where(e)} duplicate choices`).toBe(choice.length);
          for (const [label, tag] of wrong) {
            expect(label.trim(), where(e)).not.toBe("");
            expect(tag, `${where(e)} tag ${tag}`).toMatch(KEBAB);
          }
          // Hint 3 is a first step, never the answer (a word that is its own plural, or a pair like ni … ni, is named by the question itself).
          if (lc(key) !== lc(base ?? "")) expect(hasWord(clue, key), `${where(e)} clue gives away "${key}"`).toBe(false);
          checkCopy([show, key, clue, why, ...wrong.map((w) => w[0])], where(e));
        }
      }
  });

  it("reuses its misconception tags across items", () => {
    const tags = levels.flatMap((lv) =>
      LOCALES.flatMap((l) => (isLabel(lv) ? lv.tags : lv.bank.flatMap((b) => b[l][2].map((w) => w[1])))),
    );
    const counts = new Map<string, number>();
    for (const t of tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    const once = [...counts].filter(([, n]) => n === 1).map(([t]) => t);
    expect(once.length, `${id} tags used once: ${once}`).toBeLessThanOrEqual(Math.max(2, Math.floor(counts.size / 3)));
  });

  it("is not the same question in English and Spanish", () => {
    for (const lv of levels) for (const e of lv.bank as { en: unknown; es: unknown }[]) expect(JSON.stringify(e.es)).not.toBe(JSON.stringify(e.en));
  });
});

describe("hints never hand over the key", () => {
  // Closed word classes state their whole rule in hint 2 (and adds, but contrasts…; mi/mis, tu/tus; who, which,
  // whose…), so their keys appear there by design. Affixes level 1 says "Many come from Greek or Latin".
  const RULE_TABLES = new Set([
    "e.possessives 1 es", "e.possessives 2 es", "e.conjunctions 1 en", "e.conjunctions 1 es", "e.conjunctions 2 en", "e.conjunctions 2 es",
    "e.relative.words 1 en", "e.relative.words 1 es", "e.relative.words 2 en", "e.relative.words 2 es",
    "e.correlative.conjunctions 1 en", "e.correlative.conjunctions 1 es", "e.greek.latin.affixes 1 en", "e.greek.latin.affixes 1 es",
  ]);
  const pickLevels = Object.entries(GRAMMAR_3_5_LEVELS).flatMap(([id, lvs]) => lvs.flatMap((lv, i) => (isLabel(lv) ? [] : [[id, i + 1, lv] as const])));

  it("hints 1 and 2 of a level name none of its keys, outside closed word classes", () => {
    for (const [id, n, lv] of pickLevels)
      for (const l of LOCALES) {
        if (RULE_TABLES.has(`${id} ${n} ${l}`)) continue;
        for (const e of lv.bank.map((b) => b[l])) {
          if (lc(e[1]) === lc(e[5] ?? "")) continue;
          for (const h of lv.hints[l]) expect(hasWord(h, e[1]), `${id} L${n} ${l}: "${h}" names the key "${e[1]}"`).toBe(false);
        }
      }
  });

  it("hint 3 never names every wrong choice, so the key cannot be found by elimination", () => {
    for (const [id, n, lv] of pickLevels)
      for (const l of LOCALES) {
        // Preposition clues restate the question ("Where did Mia put her shoes?"), which repeats the sentence's own words.
        if (id === "e.prepositional.phrases" && n === 1) continue;
        for (const e of lv.bank.map((b) => b[l]))
          if (e[2].length >= 2) expect(e[2].every(([w]) => hasWord(e[3], w)), `${id} L${n} ${l}: ${e[3]}`).toBe(false);
      }
  });
});

function checkCopy(strings: string[], where: string) {
  for (const s of strings) {
    expect(s, `${where} exclamation`).not.toMatch(/[!¡]/);
    expect(s, `${where} emoji`).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(s, `${where} double space`).not.toMatch(/ {2}/);
    expect(s, `${where} filler`).not.toMatch(FILLER);
    expect(s, `${where} trailing space`).toBe(s.replace(/\s+$/, ""));
  }
}

describe.each(ENGLISH_GRAMMAR_3_5.map((s) => [s.id, s] as const))("%s items", (id, skill) => {
  it("pick one slot for both languages, key it correctly and tag every wrong choice (240 seeds a level)", () => {
    for (let level = 1; level <= skill.levels; level++) {
      const lv = GRAMMAR_3_5_LEVELS[id]?.[level - 1];
      const positions = new Set<number>();
      const seen = { en: new Set<string>(), es: new Set<string>() };
      for (const seed of SEEDS) {
        const slots = LOCALES.map((l) => {
          const item = makeItem(id, level, seed, l);
          const where = `${id} L${level} seed ${seed} ${l}`;
          expect(item.input, where).toBe("choices");
          expect(item.hints.length, where).toBe(3);
          expect(item.steps.length, where).toBeGreaterThanOrEqual(2);
          expect(item.steps.length, where).toBeLessThanOrEqual(4);
          expect(item.say, `${where} say`).not.toMatch(/___|\^|\d\/\d|\{|\}/);
          expect(item.seconds, where).toBeGreaterThan(0);
          if (item.answer.kind !== "choice") throw new Error(where);
          const index = item.answer.index;
          const choices = item.choices!;
          const right = choices[index].label;
          expect(new Set(choices.map((c) => c.label)).size, where).toBe(choices.length);
          choices.forEach((c, i) => {
            expect(check(item.answer, i).correct, `${where} choice ${i}`).toBe(i === index);
            if (i === index) expect(c.why, `${where} key has a tag`).toBeUndefined();
            else expect(c.why ?? "", `${where} ${c.label} tag`).toMatch(KEBAB);
          });
          expect(lc(item.steps.at(-1)!), `${where} last step lacks ${right}`).toContain(lc(right));
          for (const h of item.hints) expect(lc(h), where).not.toBe(lc(right));
          positions.add(index);
          seen[l].add(text(item) + choices.map((c) => c.label).sort().join("|"));
          if (!lv) return -1;
          // Find the bank slot this item came from and compare it field by field.
          const slot = (lv.bank as { en: G | L; es: G | L }[]).findIndex((b) => {
            const e = b[l];
            return isLabel(lv) ? item.hints[2] === e[2] && text(item).startsWith(e[0]) : item.hints[2] === e[3] && right === e[1] && text(item).includes(e[0]);
          });
          expect(slot, `${where} not from the bank`).toBeGreaterThanOrEqual(0);
          if (isLabel(lv)) {
            const e = lv.bank[slot][l];
            expect(index, where).toBe(e[1]);
            expect(choices.map((c) => c.label), where).toEqual(lv.labels[l]);
            choices.forEach((c, i) => i !== index && expect(c.why, where).toBe(`${lv.tags[i]}-for-${lv.tags[index]}`));
          } else {
            const e = lv.bank[slot][l];
            expect(right, where).toBe(e[1]);
            expect(choices.map((c) => c.label).sort(), where).toEqual([e[1], ...e[2].map((w) => w[0])].sort());
            for (const [label, tag] of e[2]) expect(choices.find((c) => c.label === label)?.why, `${where} ${label}`).toBe(tag);
          }
          return slot;
        });
        if (lv) expect(slots[0], `${id} L${level} seed ${seed}: same slot in en and es`).toBe(slots[1]);
      }
      if (!lv || !isLabel(lv)) expect(positions.size, `${id} L${level}: the key always sits in one place`).toBeGreaterThan(1);
      const size = lv ? lv.bank.length : 12;
      for (const l of LOCALES) expect(seen[l].size, `${id} L${level} ${l} distinct items`).toBeGreaterThanOrEqual(Math.min(12, size));
    }
  });
});

describe("e.dictionary.order (computed), checked with a collator", () => {
  const collator = { en: new Intl.Collator("en", { sensitivity: "base" }), es: new Intl.Collator("es", { sensitivity: "base" }) };

  it("word pools: real order agrees with the collator, and no word starts with another whole word", () => {
    for (const l of LOCALES)
      for (const pool of DICT_WORDS[l]) {
        expect(pool.length, pool[0]).toBeGreaterThanOrEqual(8);
        expect(new Set(pool).size).toBe(pool.length);
        for (const a of pool)
          for (const b of pool) {
            if (a === b) continue;
            expect(Math.sign(dictCompare(l, a, b)), `${l} ${a} ${b}`).toBe(Math.sign(collator[l].compare(a, b)));
            expect(strip(lc(b)).startsWith(strip(lc(a))), `${a} starts ${b}`).toBe(false);
          }
      }
  });

  it("Spanish order follows today's dictionaries: ñ after n, ch and ll as two letters, tildes ignored", () => {
    expect(dictCompare("es", "pino", "piña")).toBeLessThan(0);
    expect(dictCompare("es", "nuez", "ñandú")).toBeLessThan(0);
    expect(dictCompare("es", "chocolate", "cielo")).toBeLessThan(0);
    expect(dictCompare("es", "llave", "luna")).toBeLessThan(0);
    expect(dictCompare("es", "lámpara", "lápiz")).toBeLessThan(0);
  });

  it("level 1: the key comes before every other choice; level 2: the key sits between the guide words", () => {
    for (const seed of SEEDS)
      for (const l of LOCALES) {
        const one = makeItem("e.dictionary.order", 1, seed, l);
        if (one.answer.kind !== "choice") throw new Error("choice");
        const key = one.choices![one.answer.index].label;
        expect(one.choices!.length).toBe(4);
        for (const c of one.choices!) if (c.label !== key) expect(collator[l].compare(key, c.label), `${key} ${c.label}`).toBeLessThan(0);
        const two = makeItem("e.dictionary.order", 2, seed, l);
        if (two.answer.kind !== "choice") throw new Error("choice");
        const [g1, g2] = [...text(two).matchAll(/"([^"]+)"/g)].map((m) => m[1]);
        const k2 = two.choices![two.answer.index].label;
        expect(collator[l].compare(g1, k2)).toBeLessThan(0);
        expect(collator[l].compare(k2, g2)).toBeLessThan(0);
        for (const c of two.choices!) {
          if (c.label === k2) continue;
          const outside = collator[l].compare(c.label, g1) < 0 || collator[l].compare(c.label, g2) > 0;
          expect(outside, `${c.label} is between ${g1} and ${g2}`).toBe(true);
          expect(c.why).toBe(collator[l].compare(c.label, g1) < 0 ? "before-first-guide-word" : "after-last-guide-word");
        }
      }
  });
});

// ---------------------------------------------------------------------------------------------------
// Answer keys, re-derived by separate rules.

const keyOf = (e: G) => e[1];
const wrongOf = (e: G) => e[2].map((w) => w[0]);

describe("answer keys, checked another way (grade 3)", () => {
  it("abstract nouns: the key is in an abstract-noun list, no other choice is, and level 2 choices come from the sentence", () => {
    const ABSTRACT = new Set([
      ..."bravery friendship kindness joy honesty freedom fear knowledge curiosity pride childhood loyalty sadness choice hope peace courage truth wisdom patience relief skill".split(" "),
      ..."valentía amistad bondad alegría honestidad libertad miedo conocimiento curiosidad orgullo infancia lealtad tristeza paciencia esperanza justicia verdad sabiduría alivio habilidad".split(" "),
    ]);
    for (const l of LOCALES)
      for (const [lv, list] of [1, 2].map((n) => [n, picks("e.abstract.nouns", n, l)] as const))
        for (const e of list) {
          expect(ABSTRACT.has(lc(keyOf(e))), keyOf(e)).toBe(true);
          for (const w of wrongOf(e)) expect(ABSTRACT.has(lc(w)), w).toBe(false);
          if (lv === 2) for (const c of [keyOf(e), ...wrongOf(e)]) expect(words(e[0]), `${c} in ${e[0]}`).toContain(c);
          // Hint 3 runs the see-or-touch test on one concrete choice and leaves the rest to the learner.
          expect([keyOf(e), ...wrongOf(e)].filter((c) => hasWord(e[3], c)), e[3]).toEqual([wrongOf(e).find((w) => hasWord(e[3], w))]);
        }
  });

  it("plurals follow the spelling rules and the irregular table", () => {
    const IRREGULAR: Record<string, string> = { mouse: "mice", tooth: "teeth", goose: "geese", foot: "feet", ox: "oxen", child: "children", sheep: "sheep", deer: "deer", man: "men", woman: "women", moose: "moose", die: "dice" };
    const F_TO_V = new Set(["loaf", "half", "wolf", "calf"]);
    const O_ES = new Set(["potato", "tomato"]);
    const enPlural = (w: string) =>
      IRREGULAR[w] ?? (F_TO_V.has(w) ? `${w.slice(0, -1)}ves` : /[^aeiou]y$/.test(w) ? `${w.slice(0, -1)}ies` : O_ES.has(w) ? `${w}es` : `${w}s`);
    // Spanish: vowel + s; z → ces; y → yes; -s or -x: stressed last syllable (one syllable, or a tilde there) adds -es, others do not change;
    // other consonants add -es, losing a tilde on the last syllable or gaining one when the stress moves back.
    const VOWEL = /[aeiouáéíóú]/g;
    const syllables = (w: string) => (w.match(/[aeiouáéíóú]+/g) ?? []).length;
    const unTilde = (w: string) => w.replace(/á(?=[^aeiou]*$)/, "a").replace(/é(?=[^aeiou]*$)/, "e").replace(/ó(?=[^aeiou]*$)/, "o").replace(/ú(?=[^aeiou]*$)/, "u");
    const addTilde = (w: string) => {
      const at = [...w.matchAll(VOWEL)].map((m) => m.index!);
      const i = at[at.length - 2];
      return w.slice(0, i) + ({ a: "á", e: "é", i: "í", o: "ó", u: "ú" } as Record<string, string>)[w[i]] + w.slice(i + 1);
    };
    const esPlural = (w: string) => {
      if (/[aeiou]$/.test(w)) return `${w}s`;
      if (w.endsWith("z")) return `${w.slice(0, -1)}ces`;
      if (w.endsWith("y")) return `${w}es`;
      const tildeLast = /[áéíóú][^aeiouáéíóú]*$/.test(w);
      if (/[sx]$/.test(w)) return syllables(w) === 1 || tildeLast ? `${/í/.test(w) ? w : unTilde(w)}es` : w;
      if (tildeLast) return `${unTilde(w)}es`;
      return /[áéíóú]/.test(w) ? `${w}es` : w.endsWith("n") && syllables(w) > 1 ? `${addTilde(w)}es` : `${w}es`;
    };
    for (const n of [1, 2]) {
      for (const e of picks("e.irregular.plurals", n, "en")) {
        expect(keyOf(e), e[0]).toBe(enPlural(e[5]!));
        for (const w of wrongOf(e)) expect(w, e[0]).not.toBe(enPlural(e[5]!));
      }
      for (const e of picks("e.irregular.plurals", n, "es")) {
        expect(keyOf(e), e[0]).toBe(esPlural(e[5]!));
        for (const w of wrongOf(e)) expect(w, e[0]).not.toBe(esPlural(e[5]!));
      }
    }
  });

  it("possessives: English apostrophe rule; Spanish possessives agree with the thing owned", () => {
    const IRREGULAR_PLURAL = new Set(["children", "women", "men", "mice", "geese"]);
    // The sentence itself says how many own it, so the other number's possessive is really wrong, not just less likely.
    const ONE = /\b(Each|One|one|A|she|he|its)\b/;
    const MANY = /\b(two|three|All|all|Both)\b/;
    for (const n of [1, 2])
      for (const e of picks("e.possessives", n, "en")) {
        const owner = e[5]!;
        expect(keyOf(e), e[0]).toBe(owner.endsWith("s") ? `${owner}'` : `${owner}'s`);
        expect(owner.endsWith("s") || IRREGULAR_PLURAL.has(owner), `${owner} plural at level ${n}`).toBe(n === 2);
        if (n === 1) expect(/^[A-Z]/.test(owner) || ONE.test(e[0]), `${e[0]}: one owner is not fixed`).toBe(true);
        else expect(IRREGULAR_PLURAL.has(owner) || MANY.test(e[0]), `${e[0]}: more than one owner is not fixed`).toBe(true);
      }
    for (const e of picks("e.possessives", 1, "es")) {
      expect(["mi", "mis", "tu", "tus", "su", "sus"], e[0]).toContain(lc(keyOf(e)));
      expect(lc(keyOf(e)).endsWith("s"), e[0]).toBe(e[5]!.endsWith("s"));
      expect(e[0].split(" ").includes(`${e[5]}`) || e[0].includes(`___ ${e[5]}`) || e[0].includes(`___ propia ${e[5]}`), e[0]).toBe(true);
    }
    const FEM = new Set(["maestra", "plantas", "escuela", "casa", "ciudad", "mochilas", "bicicletas"]);
    for (const e of picks("e.possessives", 2, "es")) {
      const thing = e[5]!;
      expect(lc(keyOf(e)), e[0]).toBe(`nuestr${FEM.has(thing) ? "a" : "o"}${thing.endsWith("s") ? "s" : ""}`);
      expect(e[0], e[0]).toContain(`___ ${thing}`);
    }
  });

  it("verb tenses: the label matches the verb form; the key matches the time words", () => {
    const EN_PAST = new Set(["painted", "baked", "wrote", "swam", "played", "ate"]);
    const ES_PAST = /(ó|aron|ieron)$/;
    const ES_FUTURE = /(ré|rá|rás|remos|rán)$/;
    for (const e of labels("e.verb.tenses", 1, "en")) expect(e[1], e[0]).toBe(e[4]!.startsWith("will ") ? 2 : EN_PAST.has(e[4]!) ? 0 : 1);
    for (const e of labels("e.verb.tenses", 1, "es")) expect(e[1], e[0]).toBe(ES_FUTURE.test(e[4]!) ? 2 : ES_PAST.test(e[4]!) ? 0 : 1);
    const PAST: Record<string, string> = { build: "built", catch: "caught", make: "made", drive: "drove", drink: "drank", tell: "told" };
    const ed = (v: string) => PAST[v] ?? (v.endsWith("e") ? `${v}d` : `${v}ed`);
    const s3 = (v: string) => (/(ch|sh|ss|x)$/.test(v) ? `${v}es` : `${v}s`);
    for (const e of picks("e.verb.tenses", 2, "en")) {
      const [s, key, , , , base] = e;
      const when = /yesterday|last|ago/i.test(s) ? "past" : /tomorrow|next|later|in two/i.test(s) ? "future" : "present";
      if (when === "past") expect(key, s).toBe(ed(base!));
      if (when === "future") expect(key, s).toBe(`will ${base}`);
      if (when === "present") expect([base, s3(base!)], s).toContain(key);
      // A future time word allows the present too ("Tomorrow the bus leaves at six"), so it is never a wrong choice there.
      if (when === "future") for (const w of wrongOf(e)) expect([base, s3(base!)], `${s} offers ${w}`).not.toContain(w);
      // "Every morning Kai walked his dog" is good English, so a present item joins a second present verb with "and".
      if (when === "present") expect(s, s).toMatch(/ and /);
    }
    // Spanish regular conjugation for él/ella and ellos, with the stem changes and spelling changes these verbs need.
    const STEM: Record<string, string> = { contar: "cuent", nevar: "niev" };
    const conj = (inf: string, who: string, t: "past" | "present" | "future") => {
      if (t === "future") return inf + (who === "ellos" ? "án" : "á");
      const [stem, kind] = [inf.slice(0, -2), inf.slice(-2)];
      if (inf === "construir") return t === "past" ? "construyó" : "construye";
      if (t === "present") return (STEM[inf] ?? stem) + (kind === "ar" ? (who === "ellos" ? "an" : "a") : who === "ellos" ? "en" : "e");
      return stem + (kind === "ar" ? (who === "ellos" ? "aron" : "ó") : who === "ellos" ? "ieron" : "ió");
    };
    for (const e of picks("e.verb.tenses", 2, "es")) {
      const [s, key, , , , base] = e;
      const [inf, who] = base!.split("|");
      const when = /ayer|anoche|pasad|hace dos/i.test(s) ? "past" : /mañana |próximo|más tarde|en dos/i.test(s) ? "future" : "present";
      expect(key, s).toBe(conj(inf, who, when));
      // Presente prospectivo ("Mañana salgo para Lima") is right with a future time word, so the present is never offered there.
      if (when === "future") for (const w of wrongOf(e)) expect(w, `${s} offers the present`).not.toBe(conj(inf, who, "present"));
      if (when === "present") expect(s, s).toMatch(/ y /);
    }
  });

  it("comparatives: -er/-est spelling, more/most for long words and -ly, irregular forms; Spanish más … and mejor, peor, mayor, menor", () => {
    const IRR: Record<string, [string, string]> = { good: ["better", "best"], well: ["better", "best"], bad: ["worse", "worst"] };
    const enCmp = (w: string, top: boolean) => {
      if (IRR[w]) return IRR[w][top ? 1 : 0];
      const long = w.endsWith("ly") || (w.match(/[aeiouy]+/g) ?? []).length >= 3;
      if (long) return `${top ? "most" : "more"} ${w}`;
      const end = top ? "est" : "er";
      if (/[^aeiou]y$/.test(w)) return `${w.slice(0, -1)}i${end}`;
      if (/[^aeiou][aeiou][^aeiouwy]$/.test(w) && w.length <= 4) return `${w}${w.slice(-1)}${end}`;
      return `${w}${end}`;
    };
    for (const n of [1, 2])
      for (const e of picks("e.comparatives", n, "en")) {
        const top = !/ than /.test(e[0]);
        expect(keyOf(e), e[0]).toBe(enCmp(e[5]!, top));
        for (const w of wrongOf(e)) expect(w, e[0]).not.toBe(enCmp(e[5]!, top));
      }
    for (const e of picks("e.comparatives", 1, "es")) expect(keyOf(e), e[0]).toBe(`más ${e[5]}`);
    const ES_IRR: Record<string, string> = { bien: "mejor", bueno: "mejor", buena: "mejor", buenas: "mejor", mal: "peor", malo: "peor", mala: "peor", grande: "mayor", grandes: "mayor", pequeño: "menor", pequeña: "menor" };
    for (const e of picks("e.comparatives", 2, "es")) {
      const [word, ...flags] = e[5]!.split("|");
      if (["grande", "grandes", "pequeño", "pequeña"].includes(word)) expect(flags, e[0]).toContain("edad");
      // mayor or menor can only be decided when the sentence gives the ages (or says nobody is older).
      if (flags.includes("edad")) expect((e[0].match(/\b(cinco|seis|siete|ocho|nueve|diez|once|doce)\b/g) ?? []).length >= 2 || /nadie tiene más años/.test(e[0]), e[0]).toBe(true);
      expect(keyOf(e), e[0]).toBe(ES_IRR[word] + (flags.includes("plural") ? "es" : ""));
    }
  });

  it("conjunctions: the key makes the link the item needs and no wrong choice does; Spanish y → e and o → u by sound", () => {
    const LINKS: Record<string, string> = {
      and: "addition", but: "contrast", or: "choice", so: "result", because: "cause", although: "concession", if: "condition", unless: "negative-condition", when: "time", until: "until", before: "before",
      y: "addition", e: "addition", pero: "contrast", o: "choice", u: "choice", "así que": "result", porque: "cause", aunque: "concession", si: "condition", cuando: "time", "hasta que": "until",
    };
    for (const l of LOCALES)
      for (const n of [1, 2])
        for (const e of picks("e.conjunctions", n, l)) {
          const [s, key, wrong, , , base] = e;
          expect(LINKS[lc(key)], s).toBe(base);
          for (const [w, tag] of wrong) if (!/sound|u-for-e|e-for-u/.test(tag)) expect(LINKS[lc(w)], `${s} ${w}`).not.toBe(base);
          if (l === "es" && n === 1) {
            const next = lc(s.split("___ ")[1]?.split(" ")[0] ?? "");
            const iSound = /^h?i[^aeou]/.test(next) || /^h?i$/.test(next);
            const oSound = /^h?o/.test(next);
            if (lc(key) === "e" || lc(key) === "y") expect(lc(key) === "e", s).toBe(iSound);
            if (lc(key) === "u" || lc(key) === "o") expect(lc(key) === "u", s).toBe(oSound);
          }
        }
  });

  it("suffixes: meanings follow the suffix; words are base + suffix by spelling rule", () => {
    for (const e of picks("e.suffixes", 1, "en")) {
      const [base, suffix] = e[5]!.split("|");
      expect(keyOf(e), e[0]).toBe(`${suffix === "ful" ? "full of" : "without"} ${base}`);
      expect(e[0], e[0]).toBe(`“${base}${suffix}”`);
    }
    const ES_MEANS: Record<string, RegExp> = { oso: /^(con much|que hace mucho)/, ero: /^persona que/, ito: /pequeñ/, ita: /pequeñ/ };
    for (const e of picks("e.suffixes", 1, "es")) {
      const [, suffix] = e[5]!.split("|");
      expect(keyOf(e), e[0]).toMatch(ES_MEANS[suffix]);
      for (const w of wrongOf(e)) expect(w, e[0]).not.toMatch(ES_MEANS[suffix]);
    }
    const enJoin = (base: string, suf: string) => (/[^aeiou]y$/.test(base) ? `${base.slice(0, -1)}i${suf}` : `${base}${suf}`);
    for (const e of picks("e.suffixes", 2, "en")) {
      const [base, suffix] = e[5]!.split("|");
      expect(keyOf(e), e[0]).toBe(enJoin(base, suffix));
    }
    const EXCEPT: Record<string, string> = { "pan|ero": "panadero" };
    const plain = (w: string) => w.replace(/[áéíóú]/g, (c) => ({ á: "a", é: "e", í: "i", ó: "o", ú: "u" })[c]!);
    const esJoin = (base: string, suf: string) =>
      EXCEPT[`${base}|${suf}`] ?? (suf === "mente" ? `${base}mente` : plain(base).replace(/[aeiou]$/, "") + suf);
    for (const e of picks("e.suffixes", 2, "es")) {
      const [base, suffix] = e[5]!.split("|");
      expect(keyOf(e), e[0]).toBe(esJoin(base, suffix));
      if (suffix === "mente") expect(/a$|e$|l$|s$/.test(base), `${base} is the feminine or shared form`).toBe(true);
    }
  });

  it("titles and addresses: capital rules, commas between city and state, no comma before a ZIP code, a colon after a Spanish greeting", () => {
    const SMALL = new Set(["a", "an", "the", "and", "but", "or", "of", "in", "on", "at", "to", "for"]);
    const titleCase = (t: string) => t.split(" ").every((w, i, ws) => (i === 0 || i === ws.length - 1 || !SMALL.has(lc(w)) ? /^[A-Z]/.test(w) : /^[a-z]/.test(w)));
    const spanishTitle = (t: string) => t.split(" ").every((w, i) => (i === 0 ? /^[A-ZÁÉÍÓÚÑ]/.test(w) : /^[a-záéíóúñ]/.test(w)));
    for (const e of picks("e.titles.letters", 1, "en")) {
      expect(titleCase(keyOf(e)), keyOf(e)).toBe(true);
      for (const w of wrongOf(e)) expect(titleCase(w), w).toBe(false);
    }
    for (const e of picks("e.titles.letters", 1, "es")) {
      expect(spanishTitle(keyOf(e)), keyOf(e)).toBe(true);
      for (const w of wrongOf(e)) expect(spanishTitle(w), w).toBe(false);
    }
    const commas = (s: string) => (s.match(/,/g) ?? []).length;
    const goodAddress = (s: string, city: string, state: string) =>
      s.includes(`${city}, ${state}`) && !/, \d{5}$/.test(s) && !/^\d+,/.test(s) && commas(s) === (/^\d/.test(s) ? 2 : 1);
    for (const e of picks("e.titles.letters", 2, "en")) {
      const [city, state] = e[5]!.split("|");
      expect(goodAddress(keyOf(e), city, state), keyOf(e)).toBe(true);
      for (const w of wrongOf(e)) expect(goodAddress(w, city, state), w).toBe(false);
    }
    for (const e of picks("e.titles.letters", 2, "es")) {
      if (e[5] === "saludo") {
        expect(keyOf(e), keyOf(e)).toMatch(/^[^,]+:$/);
        for (const w of wrongOf(e)) expect(w, w).not.toMatch(/^[^,]+:$/);
      } else {
        const [city, region] = e[5]!.split("|");
        const ok = (s: string) => s.endsWith(`${city}, ${region}.`) && commas(s) === 1;
        expect(ok(keyOf(e)), keyOf(e)).toBe(true);
        for (const w of wrongOf(e)) expect(ok(w), w).toBe(false);
      }
    }
  });
});

describe("answer keys, checked another way (grade 4)", () => {
  it("relative words: the key fits what it points back to; no wrong choice does; cuyo agrees with the thing owned", () => {
    const EN_ROLE: Record<string, string[]> = { who: ["person"], which: ["thing"], whose: ["owner"], where: ["place"], when: ["time"], why: ["reason"] };
    const ES_ROLE: Record<string, string[]> = { que: ["person", "thing"], quien: ["one-person"], quienes: ["people"], donde: ["place"], cuando: ["time"] };
    const OWNED: Record<string, string> = { hermana: "a", perro: "o", familia: "a", hojas: "as" };
    for (const n of [1, 2]) {
      for (const e of picks("e.relative.words", n, "en")) {
        expect(EN_ROLE[keyOf(e)], e[0]).toContain(e[5]);
        for (const w of wrongOf(e)) expect(EN_ROLE[w] ?? [], `${e[0]} ${w}`).not.toContain(e[5]);
      }
      for (const e of picks("e.relative.words", n, "es")) {
        const key = keyOf(e);
        if (e[5] === "owner") {
          const owned = e[0].split("___ ")[1].split(" ")[0];
          expect(key, e[0]).toBe(`cuy${OWNED[owned]}`);
        } else expect(ES_ROLE[key], e[0]).toContain(e[5]);
        for (const w of wrongOf(e)) if (!w.startsWith("cuy")) expect(ES_ROLE[w] ?? [], `${e[0]} ${w}`).not.toContain(e[5]);
        // quien never introduces a clause with no comma or preposition before it.
        if (key === "quien" || key === "quienes") expect(e[0], e[0]).toMatch(/(, |\b(con|a|de|para) )___/);
      }
    }
  });

  it("progressive tenses: be in the right form + the -ing spelling; estar + gerundio, with the irregular gerunds", () => {
    const ing = (v: string) => (v === "have" || v === "ride" || v === "take" || v === "drive" ? `${v.slice(0, -1)}ing` : /^(swim|wag)$/.test(v) ? `${v}${v.slice(-1)}ing` : `${v}ing`);
    const be = (t: string, who: string) => (t === "future" ? "will be" : t === "present" ? (who === "I" ? "am" : who === "one" ? "is" : "are") : who === "many" ? "were" : "was");
    for (const e of picks("e.progressive.tenses", 1, "en")) {
      const [v, t, who] = e[5]!.split("|");
      expect(keyOf(e), e[0]).toBe(`${be(t, who)} ${ing(v)}`);
    }
    const GERUND: Record<string, string> = { dormir: "durmiendo", leer: "leyendo", construir: "construyendo", hacer: "haciendo", mover: "moviendo" };
    const gerund = (inf: string) => GERUND[inf] ?? (inf.endsWith("ar") ? `${inf.slice(0, -2)}ando` : `${inf.slice(0, -2)}iendo`);
    const ESTAR: Record<string, Record<string, string>> = {
      present: { yo: "estoy", él: "está", ella: "está", nosotros: "estamos", ellos: "están" },
      past: { yo: "estaba", él: "estaba", ella: "estaba", nosotros: "estábamos", ellos: "estaban" },
      future: { yo: "estaré", él: "estará", ella: "estará", nosotros: "estaremos", ellos: "estarán" },
    };
    for (const e of picks("e.progressive.tenses", 1, "es")) {
      const [inf, t, who] = e[5]!.split("|");
      expect(keyOf(e), e[0]).toBe(`${ESTAR[t][who]} ${gerund(inf)}`);
      // Hint 2's rule: -er and -ir verbs whose stem ends in a vowel take -yendo (leer, leyendo).
      if (!inf.endsWith("ar")) expect(keyOf(e).endsWith("yendo"), keyOf(e)).toBe(/[aeiou]$/.test(inf.slice(0, -2)));
    }
  });

  it("label questions written as translations give the same label in English and Spanish", () => {
    for (const [id, level] of [["e.verb.tenses", 1], ["e.modal.verbs", 1], ["e.fragments.runons", 1], ["e.conj.prep.interj", 1], ["e.titles.of.works", 1]] as const) {
      const lv = GRAMMAR_3_5_LEVELS[id][level - 1];
      if (!isLabel(lv)) throw new Error(id);
      for (const b of lv.bank) expect(b.es[1], `${id}: ${b.en[0]} / ${b.es[0]}`).toBe(b.en[1]);
    }
  });

  it("helping verbs: the meaning chosen is one this verb can have, and the verb is in the sentence", () => {
    const MEANS: Record<string, number[]> = {
      can: [0, 1], could: [0, 3], may: [1, 3], might: [3], must: [2], "have to": [2],
      puede: [0, 1, 3], pueden: [0, 1, 3], puedes: [0, 1, 3], puedo: [0, 1, 3], "puede que": [3], podría: [3], sabía: [0], saben: [0], "tienen que": [2], deben: [2], "hay que": [2],
    };
    for (const l of LOCALES)
      for (const e of labels("e.modal.verbs", 1, l)) {
        expect(MEANS[e[4]!], e[0]).toContain(e[1]);
        expect(lc(e[0].split("\n")[0]), e[0]).toContain(e[4]!);
        expect(e[0].endsWith(`: ${e[4]}`), `${e[0]} names the word asked about`).toBe(true);
      }
  });

  it("adjective order: opinion, size, age, color, origin, material; Spanish short forms before the noun, colors and nationalities after", () => {
    const KIND: Record<string, number> = {
      lovely: 0, scary: 0, beautiful: 0, nice: 0, small: 1, long: 1, big: 1, large: 1, tiny: 1, little: 1, old: 2, new: 2,
      red: 3, blue: 3, green: 3, yellow: 3, brown: 3, Mexican: 4, Chinese: 4, Spanish: 4, Italian: 4, wooden: 5, cotton: 5, metal: 5, gold: 5, rubber: 5, leather: 5, silver: 5,
    };
    const inOrder = (phrase: string) => !phrase.includes(",") && phrase.split(" ").every((w, i, ws) => i === 0 || KIND[ws[i - 1]] < KIND[w]);
    for (const e of picks("e.adjective.order", 1, "en")) {
      for (const w of keyOf(e).replace(",", "").split(" ")) expect(KIND[w], w).toBeDefined();
      expect(inOrder(keyOf(e)), keyOf(e)).toBe(true);
      for (const w of wrongOf(e)) expect(inOrder(w), w).toBe(false);
    }
    const NOUN: Record<string, "ms" | "fs" | "mp" | "fp"> = { día: "ms", piso: "ms", tiempo: "ms", lugar: "ms", ciudad: "fs", libro: "ms", lápiz: "ms", idea: "fs", puerta: "fs" };
    const SHORT: Record<string, string> = { bueno: "buen", malo: "mal", primero: "primer", tercero: "tercer", ninguno: "ningún", alguno: "algún" };
    for (const e of picks("e.adjective.order", 1, "es")) {
      const key = keyOf(e);
      const after = e[0].split("___")[1].trim().split(/[ .?]/)[0];
      if (key.includes(" ")) {
        // Color or nationality after the noun, in lowercase.
        const adj = key.split(" ")[1];
        expect(adj, key).toBe(lc(adj));
      } else if (NOUN[after]) {
        const g = NOUN[after];
        const full = Object.keys(SHORT).find((f) => SHORT[f] === key);
        if (full) expect(g, `${key} before ${after}`).toBe("ms");
        else if (key === "gran") expect(g.endsWith("s"), key).toBe(true);
        else expect(g.startsWith("f") && key.endsWith("a"), `${key} before ${after}`).toBe(true);
      } else expect(Object.values(SHORT).includes(key) || key === "gran", `${key} is not before a noun`).toBe(false);
    }
  });

  it("prepositional phrases: one preposition per sentence; the phrase starts with it and runs to its noun", () => {
    const PREP = {
      en: new Set("under across beside over behind into near after inside between onto above beneath around with to during for of along on in at from by off".split(" ")),
      es: new Set("bajo hacia en sobre con hasta desde durante sin entre a por para de del al".split(" ")),
    };
    for (const l of LOCALES) {
      for (const e of picks("e.prepositional.phrases", 1, l)) {
        const ws = words(e[0]).map(lc);
        expect(ws.filter((w) => PREP[l].has(w)).length, e[0]).toBe(1);
        expect(PREP[l].has(lc(keyOf(e))), e[0]).toBe(true);
        for (const w of wrongOf(e)) {
          expect(PREP[l].has(lc(w)), w).toBe(false);
          expect(ws, `${w} in ${e[0]}`).toContain(lc(w));
        }
      }
      for (const e of picks("e.prepositional.phrases", 2, l)) {
        const key = keyOf(e);
        expect(e[0], key).toContain(key);
        expect(PREP[l].has(lc(key.split(" ")[0])), key).toBe(true);
        expect(PREP[l].has(lc(key.split(" ").at(-1)!)), `${key} stops early`).toBe(false);
        expect(["the", "la", "el", "los", "las"].includes(lc(key.split(" ").at(-1)!)), `${key} stops early`).toBe(false);
        for (const w of wrongOf(e)) expect(!PREP[l].has(lc(w.split(" ")[0])) || (key.startsWith(w) && w.length < key.length), w).toBe(true);
      }
    }
  });

  it("fragments and run-ons: run-ons have no comma; each fix keeps the words and joins them correctly", () => {
    for (const l of LOCALES) for (const e of labels("e.fragments.runons", 1, l)) if (e[1] === 2) expect(e[0].includes(","), e[0]).toBe(false);
    // The two thoughts come from the item's clue; the acceptable fixes are built here.
    const bare = (s: string) => words(s).map(lc).join(" ");
    const JOINERS = { en: [", and ", ", but ", ", so "], es: [" y ", ", pero ", ", así que "] };
    for (const l of LOCALES)
      for (const e of picks("e.fragments.runons", 2, l)) {
        const m = (l === "en" ? /^The first thought is "(.+)\." The second is "(.+)\."$/ : /^La primera idea es "(.+)"\. La segunda es "(.+)"\.$/).exec(e[3]);
        expect(m, e[3]).toBeTruthy();
        const [, a, b] = m!;
        expect(e[0], e[0]).toBe(`“${a} ${b}.”`);
        const fixes = [`${a}. ${b.charAt(0).toUpperCase()}${b.slice(1)}.`, ...JOINERS[l].map((j) => `${a}${j}${b}.`)];
        expect(fixes, keyOf(e)).toContain(keyOf(e));
        for (const w of wrongOf(e)) {
          expect(fixes, w).not.toContain(w);
          expect(bare(w), w).toBe(bare(e[0]));
        }
      }
  });

  it("dialogue: English quotation marks and Spanish rayas follow their patterns; no wrong choice does", () => {
    const enAfter = /^“[A-Z][^“”]*[^ ,.?](,|\?)” (said|asked) [A-Z][\w ]*\.$/;
    const enBefore = /^[A-Z][\w ]* (said|asked), “[A-Z][^“”]*[^ ,.?](\.|\?)”$/;
    const esOne = /^—(¿[^¿?—.]+\?|[^¿?—.]*[^ ¿?—.]) —[a-záéíóúñ]+ [^—]+\.$/;
    const esMid = /^—[^—.¿?]*[^ .¿?—] —[a-záéíóúñ]+ [^—.]+—\. [¿A-ZÁÉÍÓÚ]/;
    const tests = { en: [enAfter, enBefore], es: [esOne, esMid] };
    for (const l of LOCALES)
      for (const n of [1, 2])
        for (const e of picks("e.dialogue.punctuation", n, l)) {
          const re = tests[l][n - 1];
          expect(keyOf(e), keyOf(e)).toMatch(re);
          for (const w of wrongOf(e)) expect(w, w).not.toMatch(re);
        }
  });

  it("roots: each root's meaning comes from a separate table, and whole-word meanings use every part", () => {
    const ROOT: Record<string, string> = {
      tele: "far", photo: "light", graph: "write", port: "carry", aud: "hear", vis: "see", dict: "say", rupt: "break", struct: "build", spect: "look",
      therm: "heat", bio: "life", geo: "earth", phon: "sound", script: "write", ped: "foot", micro: "small", meter: "measure",
    };
    const RAIZ: Record<string, string> = {
      tele: "lejos", foto: "luz", grafo: "escribir", port: "llevar", aud: "oír", vis: "ver", dic: "decir", rump: "romper", struct: "construir", spect: "mirar",
      termo: "calor", bio: "vida", geo: "tierra", fono: "sonido", scrit: "escribir", ped: "pie", micro: "pequeño", metro: "medir",
    };
    for (const [l, table] of [["en", ROOT], ["es", RAIZ]] as const)
      for (const e of picks("e.greek.latin.roots", 1, l)) {
        expect(keyOf(e), e[0]).toBe(table[e[5]!]);
        expect(strip(lc(e[0])), e[0]).toContain(strip(e[5]!));
        for (const [w, tag] of e[2]) {
          expect(w, e[0]).not.toBe(keyOf(e));
          const other = tag.replace("meaning-of-", "");
          expect(Object.values(table), `${tag}`).toContain(w);
          if (table[other] !== undefined) expect(table[other], `${e[0]} ${tag}`).toBe(w);
        }
      }
    const PART: Record<string, RegExp> = {
      tele: /far|lejos|lejan/, phone: /sound/, fono: /sonido/, micro: /small|pequeñ/, scope: /look|see/, scopio: /mirar/, bio: /life|vida/, graph: /writ/, grafía: /escrit/,
      geo: /earth|tierra/, logy: /study/, logía: /estudio/, port: /carr|send|llevar/, able: /can be|easy to|enough/, aud: /hear|oír/, ible: /heard|can be/, "-ible": /se puede/, "-átil": /se puede/,
      therm: /heat/, termo: /calor/, meter: /measure/, metro: /mide/, auto: /own|misma/, grafo: /escrit/, pre: /before|antes/, dict: /say/, decir: /decir/,
      in: /closely|atención/, spect: /look|mirar/, ex: /out|fuera/, con: /building|construir/, struct: /build|construir/, e: /out|fuera/, rupt: /break|burst|rompe/,
    };
    for (const l of LOCALES)
      for (const e of picks("e.greek.latin.roots", 2, l)) {
        const parts = e[5]!.split(" + ").map((p) => p.split(" ")[0]);
        for (const p of parts) {
          const re = PART[p];
          expect(re, `${p} has no test meaning`).toBeDefined();
          expect(keyOf(e), `${e[0]} ${p}`).toMatch(re);
        }
        for (const w of wrongOf(e)) expect(parts.every((p) => PART[p].test(w)), `${e[0]}: ${w} also fits`).toBe(false);
      }
  });

  it("idioms and proverbs never repeat an item of e.figurative, in either language", () => {
    for (const l of LOCALES) {
      const used = ENGLISH_K_4_BANKS["e.figurative"].flat().map((e) => lc(e[l].prompt + " " + e[l].say));
      for (const n of [1, 2])
        for (const e of picks("e.idioms.proverbs", n, l)) {
          const saying = lc(e[0].replace(/[“”]/g, "").replace(/\.$/, ""));
          for (const u of used) expect(u.includes(saying), `${saying} repeats e.figurative`).toBe(false);
        }
    }
  });
});

describe("answer keys, checked another way (grade 5)", () => {
  it("conjunctions, prepositions, interjections: the label matches a word list; a word used both ways has a noun or a clause after it", () => {
    const KIND: Record<string, number> = {
      and: 0, but: 0, or: 0, because: 0, so: 0, y: 0, pero: 0, o: 0, porque: 0, aunque: 0, como: 0,
      under: 1, with: 1, during: 1, across: 1, for: 1, bajo: 1, con: 1, durante: 1, hacia: 1, para: 1,
      oh: 2, wow: 2, ouch: 2, hey: 2, oops: 2, well: 2, vaya: 2, ay: 2, oye: 2, uy: 2, bueno: 2,
    };
    for (const l of LOCALES) for (const e of labels("e.conj.prep.interj", 1, l)) expect(e[1], e[0]).toBe(KIND[e[4]!]);
    const VERB = /\b(ate|eat|came|rings|was|got|comimos|comamos|llegaste|suene|estaba|oscureciera|llovía)\b/;
    for (const l of LOCALES)
      for (const e of labels("e.conj.prep.interj", 2, l)) {
        const [show, label] = e;
        const word = e[4]!;
        if (label === 2) {
          expect(["well", "oh", "bueno", "ay"], show).toContain(word);
          continue;
        }
        const next = show.split("\n")[0].replace(/[“”]/g, "");
        const after = lc(next).split(`${word} `)[1] ?? "";
        expect(VERB.test(after.split(/[,.]/)[0]), `${show}: ${word} before "${after}"`).toBe(label === 0);
        if (l === "es") expect(word.endsWith("que") || word === "pero" || word === "como", show).toBe(label === 0);
      }
  });

  it("perfect tenses: has or have by subject + the participle from a table; haber by person + the participle; had or will have by the time words", () => {
    const PP: Record<string, string> = {
      write: "written", see: "seen", eat: "eaten", fly: "flown", do: "done", ring: "rung", swim: "swum", tell: "told", grow: "grown", lose: "lost", drink: "drunk",
      break: "broken", learn: "learned", feed: "fed", set: "set", choose: "chosen", start: "started", read: "read", leave: "left", walk: "walked", work: "worked",
      rain: "rained", wash: "washed", study: "studied", close: "closed", melt: "melted", finish: "finished",
    };
    const PLURAL = new Set(["we", "children", "I", "sisters", "you", "players", "parents"]);
    for (const e of picks("e.perfect.tenses", 1, "en")) {
      const [v, who] = e[5]!.split("|");
      expect(keyOf(e), e[0]).toBe(`${PLURAL.has(who) ? "have" : "has"} ${PP[v]}`);
    }
    for (const e of picks("e.perfect.tenses", 2, "en")) {
      const v = e[5]!.split("|")[0];
      const future = /\b(next|tomorrow|gets|by the end|by friday)\b/i.test(e[0]);
      expect(keyOf(e), e[0]).toBe(`${future ? "will have" : "had"} ${PP[v]}`);
    }
    const PART: Record<string, string> = { escribir: "escrito", ver: "visto", hacer: "hecho", abrir: "abierto", romper: "roto", poner: "puesto", volver: "vuelto", decir: "dicho", resolver: "resuelto", cubrir: "cubierto", leer: "leído" };
    const part = (inf: string) => PART[inf] ?? (inf.endsWith("ar") ? `${inf.slice(0, -2)}ado` : `${inf.slice(0, -2)}ido`);
    const HABER: Record<string, Record<string, string>> = {
      now: { yo: "he", tú: "has", él: "ha", ella: "ha", nosotros: "hemos", ellos: "han", ellas: "han" },
      past: { yo: "había", él: "había", ella: "había", nosotros: "habíamos", ellos: "habían", ellas: "habían" },
      future: { yo: "habré", él: "habrá", ella: "habrá", nosotros: "habremos", ellos: "habrán", ellas: "habrán" },
    };
    for (const e of picks("e.perfect.tenses", 1, "es")) {
      const [inf, who] = e[5]!.split("|");
      expect(keyOf(e), e[0]).toBe(`${HABER.now[who]} ${part(inf)}`);
    }
    for (const e of picks("e.perfect.tenses", 2, "es")) {
      const [inf, who] = e[5]!.split("|");
      const future = /^(Para|Al final|El próximo|Mañana|A fin de)|llegue/.test(e[0]);
      expect(keyOf(e), e[0]).toBe(`${HABER[future ? "future" : "past"][who]} ${part(inf)}`);
    }
  });

  it("tense shifts: a separate tense reader agrees with every key", () => {
    const EN_IRREG_PAST = new Set(["saw", "taught", "cut", "found", "went", "ate", "rose", "drank", "built", "lay", "laid", "broke", "lit", "swam", "made", "lost"]);
    const enTense = (v: string) => (v.startsWith("will ") ? "future" : v.endsWith("ed") || EN_IRREG_PAST.has(v) ? "past" : "present");
    const ES_IRREG_PAST = new Set(["vio", "fue", "hizo", "puso", "descompuso"]);
    const esTense = (v: string) => (/(ré|rá|rás|remos|rán)$/.test(v) ? "future" : /(ó|aron|ieron)$/.test(v) || ES_IRREG_PAST.has(lc(v)) ? "past" : "present");
    const reader = { en: enTense, es: esTense };
    for (const l of LOCALES)
      for (const e of picks("e.tense.shifts", 1, l)) {
        expect(reader[l](keyOf(e)), e[0]).toBe(e[5]);
        for (const w of wrongOf(e)) expect(reader[l](w), `${e[0]} ${w}`).not.toBe(e[5]);
      }
    for (const l of LOCALES)
      for (const e of picks("e.tense.shifts", 2, l)) {
        const others = wrongOf(e);
        // "lay" (the birds lay eggs) is present here; the reader treats it as present only with a plural subject.
        const tense = (v: string) => (v === "lay" ? "present" : reader[l](v));
        expect(tense(others[0]), e[0]).toBe(tense(others[1]));
        expect(tense(keyOf(e)), e[0]).not.toBe(tense(others[0]));
        expect(tense(e[5]!), `${e[0]} fix ${e[5]}`).toBe(tense(others[0]));
        for (const v of [keyOf(e), ...others]) expect(words(e[0]), `${v} in ${e[0]}`).toContain(v);
        for (const v of [keyOf(e), ...others]) expect(hasWord(e[3], v), `hint 3 names ${v}`).toBe(false);
      }
  });

  it("correlative conjunctions: the key is the partner of the first half", () => {
    const PARTNER: Record<string, string[]> = {
      neither: ["nor"], either: ["or"], both: ["and"], "not only": ["but"], whether: ["or"],
      ni: ["ni"], o: ["o"], tanto: ["como"], "no solo": ["sino", "sino que"], "ya sea": ["o"], sea: ["o"],
    };
    for (const l of LOCALES)
      for (const e of picks("e.correlative.conjunctions", 1, l)) {
        expect(PARTNER[e[5]!], e[0]).toContain(keyOf(e));
        for (const w of wrongOf(e)) expect(PARTNER[e[5]!], `${e[0]} ${w}`).not.toContain(w);
        expect(lc(e[0]).indexOf(e[5]!), e[0]).toBeLessThan(e[0].indexOf("___"));
        if (keyOf(e) === "sino que") expect(e[0].split("___ ")[1], e[0]).toMatch(/^también \S+(é|ó|amos|imos|aron)\b/);
      }
  });

  it("commas: one comma right after the opener; names, yes, no, and tags set off; no comma between a subject and its verb", () => {
    for (const l of LOCALES)
      for (const e of picks("e.intro.commas", 1, l)) {
        const open = e[5]!;
        expect(keyOf(e).startsWith(`${open}, `), keyOf(e)).toBe(true);
        expect((keyOf(e).match(/,/g) ?? []).length, keyOf(e)).toBe(1);
        for (const w of wrongOf(e)) expect(w.startsWith(`${open}, `) && (w.match(/,/g) ?? []).length === 1, w).toBe(false);
      }
    for (const l of LOCALES)
      for (const e of picks("e.intro.commas", 2, l)) {
        const part = e[5]!;
        const setOff = (s: string) => {
          const i = s.indexOf(part);
          const before = i === 0 || s.slice(0, i).endsWith(", ");
          const end = s.slice(i + part.length);
          const after = /^[?.]?$/.test(end) || end.startsWith(",") || /^\?$/.test(end);
          return i >= 0 && before && after;
        };
        expect(setOff(keyOf(e)), keyOf(e)).toBe(true);
        for (const w of wrongOf(e)) expect(setOff(w) && w.replace(/,/g, "").length === keyOf(e).replace(/,/g, "").length && (w.match(/,/g) ?? []).length === (keyOf(e).match(/,/g) ?? []).length, w).toBe(false);
      }
  });

  it("titles of works: long, whole works take italics; short works and parts take quotation marks", () => {
    const LONG = new Set(["book", "movie", "magazine", "newspaper", "TV series", "album", "play", "libro", "película", "revista", "periódico", "serie", "disco", "obra de teatro"]);
    const SHORT = new Set(["poem", "song", "article", "chapter", "short story", "story", "episode", "poema", "canción", "artículo", "capítulo", "cuento", "episodio"]);
    for (const l of LOCALES)
      for (const e of labels("e.titles.of.works", 1, l)) {
        expect(LONG.has(e[4]!) || SHORT.has(e[4]!), e[4]).toBe(true);
        expect(e[1], e[0]).toBe(LONG.has(e[4]!) ? 1 : 0);
      }
    for (const l of LOCALES)
      for (const e of picks("e.titles.of.works", 2, l)) {
        const [sk, lk] = e[5]!.split("|");
        expect(SHORT.has(sk) && LONG.has(lk), e[5]).toBe(true);
        expect(e[0], e[0]).toContain(keyOf(e));
        expect(e[0], e[0]).toContain(e[2][0][0]);
      }
  });

  it("affixes: prefix meanings from a separate table; suffix meanings match the suffix", () => {
    const PRE: Record<string, string> = { bi: "two", tri: "three", semi: "half", multi: "many", sub: "under", inter: "between", trans: "across", anti: "against", auto: "self", post: "after", mono: "one" };
    const PREF: Record<string, string> = { bi: "dos", tri: "tres", semi: "medio", multi: "muchos", sub: "debajo", inter: "entre", trans: "al otro lado", anti: "contra", auto: "uno mismo", pos: "después", mono: "uno" };
    for (const [l, table] of [["en", PRE], ["es", PREF]] as const)
      for (const e of picks("e.greek.latin.affixes", 1, l)) {
        expect(keyOf(e), e[0]).toBe(table[e[5]!]);
        expect(e[0].startsWith(`“${e[5]}`), e[0]).toBe(true);
        for (const [w, tag] of e[2]) expect(table[tag.replace("meaning-of-", "")], `${e[0]} ${tag}`).toBe(w);
      }
    const SUF: Record<string, RegExp> = { able: /^can be/, ible: /^can be/, ble: /^se puede/, logy: /^the study of/, logía: /^estudio de/, ist: /^a person who/, ista: /^persona que/, tion: /^(the act|something that|the result)/, ción: /^acción/, ous: /^full of/, oso: /^lleno de/ };
    for (const l of LOCALES)
      for (const e of picks("e.greek.latin.affixes", 2, l)) {
        expect(keyOf(e), e[0]).toMatch(SUF[e[5]!]);
        expect(e[0].endsWith(`${e[5]}”`), e[0]).toBe(true);
        for (const w of wrongOf(e)) expect(w, `${e[0]} ${w}`).not.toMatch(SUF[e[5]!]);
      }
  });

  it("analogies and homographs: both languages use the same relationship per slot, and the key is a new word", () => {
    const lv = GRAMMAR_3_5_LEVELS["e.analogies"][0];
    if (isLabel(lv)) throw new Error("picks");
    for (const b of lv.bank) expect(b.es[5], b.en[0]).toBe(b.en[5]);
    for (const l of LOCALES) {
      for (const e of picks("e.analogies", 1, l)) {
        const shown = words(e[0]).map(lc);
        expect(shown, e[0]).not.toContain(lc(keyOf(e)));
      }
      for (const e of picks("e.analogies", 2, l)) {
        expect(e[0], e[0]).toContain(e[5]!);
        expect(e[0].split("\n")[0].includes(e[5]!), `${e[5]} is in the sentence`).toBe(true);
        // The worked line says "quiere decir …", so a meaning is never a bare "Del verbo …".
        for (const m of [keyOf(e), ...wrongOf(e)]) expect(m, m).not.toMatch(/^Del /);
      }
    }
  });
});
