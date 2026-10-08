import { describe, expect, it } from "vitest";
import { check } from "../answer";
import { makeItem, SKILLS } from "../skills";
import type { Item } from "../types";
import { ENGLISH_GRAMMAR_6_9, GRAMMAR_LEVELS, WORKS_CITED_SETS, type Entry, type Level } from "./grammar-69";

// Grades 6–9 grammar and rhetoric are hand-written (draft), so a calculator cannot re-derive the keys.
// This file checks them by routes the generator never takes: the punctuation choices really contain the
// same words, the accent tags really differ only by accents, the verbals really have their endings, the
// clauses really start with the right kind of word, the MLA keys really match the page in the source and
// MLA's pattern, the Works Cited key is re-sorted here with a different comparator, and so on. Then it
// builds 240 seeds per level in both languages and checks the copy, the choices, the tags and the key.

const SEEDS = Array.from({ length: 240 }, (_, i) => i * 7919 + 101);
const LOCALES = ["en", "es"] as const;
type Loc = (typeof LOCALES)[number];

/** English skill ids from the other strands (K–4 and 5–9), which may be prerequisites here. */
const OTHER_ENGLISH = new Set([
  "e.letter.sounds", "e.rhyme", "e.syllables", "e.sight.words", "e.cvc.words", "e.capitals", "e.plurals", "e.nouns.verbs", "e.past.tense",
  "e.contractions", "e.adjectives", "e.homophones", "e.prefixes", "e.synonyms", "e.subject.verb", "e.commas", "e.figurative",
  "e.context.clues", "e.fact.opinion", "e.main.idea", "e.claim.evidence", "e.pronouns", "e.sentence.types", "e.transitions", "e.appeals",
  "e.active.passive", "e.fallacies", "e.rhetorical.devices", "e.thesis", "e.concision",
]);

const lc = (s: string) => s.toLowerCase();
const bare = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
const words = (s: string) => lc(s).replace(/[^\p{L}\p{N}']+/gu, " ").trim().split(" ").filter(Boolean);
const sameWords = (a: string, b: string) => words(a).join(" ") === words(b).join(" ");
/** How many times a word or phrase appears in a text as whole words. */
const occurrences = (text: string, phrase: string) => {
  const [t, p] = [words(text), words(phrase)];
  return t.filter((_, i) => p.every((w, j) => t[i + j] === w)).length;
};
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Whole word or phrase, ignoring case. */
const hasPhrase = (text: string, phrase: string) => new RegExp(`(?<![\\p{L}\\p{N}])${esc(lc(phrase))}(?![\\p{L}\\p{N}])`, "u").test(lc(text));
const count = (s: string, ch: string) => s.split(ch).length - 1;
const accents = (s: string) => (s.normalize("NFD").match(/\p{Diacritic}/gu) ?? []).length;
const squash = (s: string) => lc(bare(s)).replace(/[\s-]/g, "");
function distance(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const isSubsequence = (part: string[], whole: string[]) => {
  let i = 0;
  for (const w of whole) if (w === part[i]) i++;
  return i === part.length;
};
const promptText = (item: Item) => item.prompt.map((p) => (typeof p === "string" ? p : "blank" in p ? "___" : "")).join("");

const levels = (id: string): Level[] => {
  const ls = GRAMMAR_LEVELS[id];
  if (!ls) throw new Error(`no levels for ${id}`);
  return ls;
};
const bank = (id: string, level: number, locale: Loc): Entry[] => levels(id)[level - 1].bank.map((e) => e[locale]);
const each = (id: string, level: number, fn: (e: Entry, locale: Loc) => void) => {
  for (const locale of LOCALES) for (const e of bank(id, level, locale)) fn(e, locale);
};
const tagged = (e: Entry, tag: string) => e[2].filter(([, why]) => why === tag).map(([label]) => label);

describe("grades 6–9 grammar and rhetoric: strand shape", () => {
  it("has draft English skills for grades 6 to 9 with real standards, in skill-map order", () => {
    expect(ENGLISH_GRAMMAR_6_9.length).toBeGreaterThanOrEqual(26);
    const seen = new Set<string>();
    for (const s of ENGLISH_GRAMMAR_6_9) {
      expect(s.subject, s.id).toBe("english");
      expect(s.content, s.id).toBe("draft");
      expect(s.id, s.id).toMatch(/^e\.[a-z]+(\.[a-z]+)*$/);
      expect(OTHER_ENGLISH.has(s.id), `${s.id} reuses an existing id`).toBe(false);
      expect(["6", "7", "8", "9"]).toContain(s.grade);
      // A real CCSS ELA code whose grade matches the skill (grade 9 uses the 9-10 band).
      const m = /^(L|RI|RL|W)\.(\d|9-10)\.(\d+)([a-z])?$/.exec(s.standard ?? "");
      expect(m, `${s.id} standard ${s.standard}`).toBeTruthy();
      expect(m![2], s.id).toBe(s.grade === "9" ? "9-10" : s.grade);
      for (const p of s.prereqs) expect(seen.has(p) || OTHER_ENGLISH.has(p), `${s.id} needs ${p}`).toBe(true);
      seen.add(s.id);
      expect(s.levels).toBe(levels(s.id).length);
      expect(s.title.en && s.title.es && s.title.en !== s.title.es, s.id).toBeTruthy();
    }
    const order = SKILLS.map((s) => s.id);
    for (const s of ENGLISH_GRAMMAR_6_9) for (const p of s.prereqs) expect(order.indexOf(p), `${s.id} before ${p}`).toBeLessThan(order.indexOf(s.id));
    for (const g of ["6", "7", "8", "9"]) expect(ENGLISH_GRAMMAR_6_9.filter((s) => s.grade === g).length, `grade ${g}`).toBeGreaterThanOrEqual(5);
  });

  it("every entry is complete, bilingual, plain, with distinct labels and tagged wrong choices, and at least 12 per level", () => {
    for (const s of ENGLISH_GRAMMAR_6_9) {
      const tags = new Map<string, number>();
      levels(s.id).forEach((level, li) => {
        const where0 = `${s.id} L${li + 1}`;
        const keys = new Set<string>();
        for (const pair of level.bank) {
          expect(JSON.stringify(pair.en), `${where0} English and Spanish are identical`).not.toBe(JSON.stringify(pair.es));
          for (const locale of LOCALES) {
            const [shown, right, wrong, clue, explain, target] = pair[locale];
            const where = `${where0} ${locale} ${shown || right}`;
            keys.add(`${shown}|${right}|${target ?? ""}`);
            expect(wrong.length, where).toBeGreaterThanOrEqual(1);
            const labels = [right, ...wrong.map(([l]) => l)];
            const minChoices = level.order && level.order[locale].length === 2 ? 2 : 3;
            expect(Math.min(labels.length, 4), `${where} choices`).toBeGreaterThanOrEqual(minChoices);
            // Exact labels: a capital letter after a colon is the whole point of some Spanish choices.
            expect(new Set(labels).size, `${where} duplicate labels`).toBe(labels.length);
            for (const [, why] of wrong) {
              expect(why, where).toMatch(/^[a-z]+(-[a-z]+)*$/);
              expect(why.length, where).toBeLessThanOrEqual(40);
              tags.set(why, (tags.get(why) ?? 0) + 1);
            }
            for (const t of [shown, ...labels, clue, explain, target ?? "x"]) {
              expect(t, `${where} "${t}"`).not.toMatch(/[!¡]/);
              expect(t, `${where} "${t}"`).not.toMatch(/\p{Extended_Pictographic}/u);
              expect(t, `${where} double space "${t}"`).not.toMatch(/ {2}/);
              expect(t, `${where} untrimmed "${t}"`).toBe(t.trim());
              expect(t, `${where} braces "${t}"`).not.toMatch(/[{}]/);
            }
            expect(right && clue && explain, where).toBeTruthy();
            expect(count(shown, "___"), `${where} blanks`).toBeLessThanOrEqual(1);
            for (const l of labels) expect(l, where).not.toContain("___");
            // Hint 3 is the first step, never the answer itself.
            expect(hasPhrase(clue, right), `${where} clue gives away "${right}"`).toBe(false);
            if (target) expect(lc(bare(shown || target)), `${where} target ${target}`).toContain(lc(bare(target)));
            if (level.order) for (const l of labels) expect(level.order[locale], `${where} ${l} not in order`).toContain(l);
            const askHasTarget = level.ask[locale].includes("{t}");
            expect(askHasTarget ? Boolean(target) : true, `${where} ask needs a target`).toBe(true);
          }
        }
        expect(keys.size / 2, `${where0} distinct entries`).toBeGreaterThanOrEqual(12);
      });
      for (const [tag, n] of tags) expect(n, `${s.id} tag ${tag} is used once; tags are reused across a skill`).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("grades 6–9 grammar and rhetoric: bank content, checked by independent routes", () => {
  const SELF = ["myself", "yourself", "himself", "herself", "itself", "ourselves", "yourselves", "themselves"];

  it("intensive and reflexive pronouns: -self keys are standard forms; Spanish mismo agrees in gender and number", () => {
    each("e.intensive.pronouns", 1, ([, right, wrong], locale) => {
      if (locale === "en") {
        if (/sel(f|ves)$/.test(right)) expect(SELF, right).toContain(right);
        for (const [w, why] of wrong) if (why === "nonstandard-form") expect(SELF, w).not.toContain(w);
        return;
      }
      if (!/^mism[oa]s?$/.test(right)) return;
      const fem = (w: string) => /as?$/.test(w);
      const plural = (w: string) => w.endsWith("s");
      for (const [w, why] of wrong) {
        if (why === "gender-mismatch") expect([fem(w) !== fem(right), plural(w) === plural(right)], w).toEqual([true, true]);
        if (why === "number-mismatch") expect([fem(w) === fem(right), plural(w) !== plural(right)], w).toEqual([true, true]);
      }
    });
    for (const locale of LOCALES) {
      const keys = bank("e.intensive.pronouns", 2, locale).map((e) => e[1]);
      for (const k of new Set(keys)) expect(keys.filter((x) => x === k).length, `${locale} ${k}`).toBeGreaterThanOrEqual(5);
    }
    each("e.intensive.pronouns", 2, ([shown, , , , , target], locale) => {
      expect(target, shown).toBeTruthy();
      expect(occurrences(shown, target!), `${shown} target once`).toBe(1);
      if (locale === "en") expect(SELF, shown).toContain(lc(target!));
    });
    // Spanish: the word form alone must not decide the answer. Some reflexive targets carry "mismo", and
    // some intensive targets do not.
    const [enfatico, reflexivo] = levels("e.intensive.pronouns")[1].order!.es;
    const es2 = bank("e.intensive.pronouns", 2, "es");
    const mismo = (t: string) => /\bmism[oa]s?$/.test(t);
    expect(es2.some(([, right, , , , t]) => right === reflexivo && mismo(t!)), "a reflexive target with mismo").toBe(true);
    expect(es2.some(([, right, , , , t]) => right === enfatico && !mismo(t!)), "an intensive target without mismo").toBe(true);
  });

  it("vague pronouns: both possible antecedents come before the pronoun; a clear pronoun agrees with only one", () => {
    // Pronoun → gender and number it can stand for (m, f, n = thing; s, p). English he/she only for people.
    const AGREES: Record<string, string[]> = {
      he: ["ms"], she: ["fs"], it: ["ns"], them: ["mp", "fp", "np"], they: ["mp", "fp", "np"], their: ["mp", "fp", "np"],
      él: ["ms"], ella: ["fs"], lo: ["ms"], la: ["fs"], ellos: ["mp"], las: ["fp"],
    };
    // Gender and number of every noun used in the clear entries, written down here, not in the bank.
    const NOUNS: Record<string, string> = {
      marco: "ms", "his sister": "fs", "the batteries": "np", "the remote": "ns", "the coach": "ms", "the players": "mp", "aunt rosa": "fs",
      "uncle leo": "ms", "the books": "np", "the shelf": "ns", "the girl": "fs", "her brother": "ms", "ms. ortiz": "fs", "the students": "mp",
      jamal: "ms", "his grandmother": "fs", "the cake": "ns", "the cookies": "np", "his keys": "np", "the backpack": "ns",
      marcos: "ms", "su hermana": "fs", "el cuaderno": "ms", "la mochila": "fs", "la entrenadora": "fs", "los jugadores": "mp", "la tía rosa": "fs",
      "el tío leo": "ms", "su caja": "fs", "el estante": "ms", "la niña": "fs", "su hermano": "ms", "la maestra ortiz": "fs", "los estudiantes": "mp",
      "su abuela": "fs", "el melón": "ms", "la bolsa": "fs", "sus llaves": "fp", "el estuche": "ms",
    };
    let clear = 0;
    each("e.vague.pronouns", 1, (e) => {
      const [shown, right, , , , target] = e;
      const single = (tag: string) => tagged(e, tag).map((l) => l.replace(/^(Only|Solo) /, ""));
      const ambiguous = single("assumed-first-noun").length > 0;
      const [first, nearest] = ambiguous ? [single("assumed-first-noun")[0], single("assumed-nearest-noun")[0]] : [right.replace(/^(Only|Solo) /, ""), single("pronoun-mismatch")[0]];
      // "el tío Leo" appears as "al tío Leo" after a preposition, so the article is not searched for.
      const at = (s: string) => lc(shown).indexOf(lc(s).replace(/^(el|la|los|las) /, ""));
      expect(at(first), `${shown} has ${first}`).toBeGreaterThanOrEqual(0);
      expect(at(nearest), `${shown} has ${nearest}`).toBeGreaterThanOrEqual(0);
      const pronoun = new RegExp(`(?<![\\p{L}])${esc(target!)}(?![\\p{L}])`, "gu");
      const found = [...lc(shown).matchAll(pronoun)].map((m) => m.index!);
      expect(found.length, `${shown}: the pronoun ${target} appears once`).toBe(1);
      expect(found[0] > Math.max(at(first), at(nearest)), `${shown} pronoun after both nouns`).toBe(true);
      if (ambiguous) {
        expect(at(nearest), `${nearest} after ${first}`).toBeGreaterThan(at(first));
        expect(lc(right), right).toContain(lc(first));
        expect(lc(right), right).toContain(lc(nearest));
        return;
      }
      clear++;
      const fits = AGREES[lc(target!)];
      expect(fits, `${target} agreement known`).toBeTruthy();
      expect(fits, `${shown}: ${target} fits ${first}`).toContain(NOUNS[lc(first)]);
      expect(fits, `${shown}: ${target} does not fit ${nearest}`).not.toContain(NOUNS[lc(nearest)]);
      const either = tagged(e, "missed-agreement-clue")[0];
      expect(lc(either).includes(lc(first)) && lc(either).includes(lc(nearest)), either).toBe(true);
    });
    expect(clear, "clear pronouns in the bank").toBeGreaterThanOrEqual(16);
  });

  it("vague pronouns, later levels: revisions differ from the original; shifts are pronoun shifts", () => {
    each("e.vague.pronouns", 2, ([shown, right, wrong]) => {
      expect(right, shown).not.toBe(shown);
      for (const [w] of wrong) expect(w, shown).not.toBe(shown);
    });
    // Level 3 is L.6.1c, shifts in pronoun person and number: every choice is or holds a pronoun, so an
    // item cannot quietly test verb agreement instead.
    const PRONOUNS = {
      en: "i we you he she it they one my our your his her its their or".split(" "),
      es: "me te se nos le les lo la su sus tu tus mi mis nuestro nuestra nuestros nuestras".split(" "),
    };
    each("e.vague.pronouns", 3, ([shown, right, wrong], locale) => {
      for (const l of [right, ...wrong.map(([w]) => w)]) {
        const ws = words(l);
        if (locale === "en") expect(ws.every((w) => PRONOUNS.en.includes(w)), `${shown}: ${l}`).toBe(true);
        else expect(ws.some((w) => PRONOUNS.es.includes(w)), `${shown}: ${l}`).toBe(true);
      }
      // A possessive blank is tied to the subject ("own", "propio", or a body part), so a distractor
      // cannot simply name a different owner.
      if (/^(my|our|your|his|her|its|their|su|sus|tu|tus|mi|mis|nuestr[oa]s?)$/.test(lc(right)))
        expect(/___ (own|propi[oa]s?|legs|eyes) /.test(shown), `${shown}: a possessive distractor could name another owner`).toBe(true);
    });
  });

  it("asides and adjective commas: every choice has the same words, and the key's marks are balanced", () => {
    for (const [id, level] of [["e.nonrestrictive", 1], ["e.nonrestrictive", 2], ["e.coordinate.adjectives", 1], ["e.ellipsis.dash", 1]] as const)
      each(id, level, ([, right, wrong]) => {
        for (const [w] of wrong) expect(sameWords(w, right), `${id}: "${w}" vs "${right}"`).toBe(true);
      });
    each("e.nonrestrictive", 1, ([, right]) => {
      expect(count(right, "—") % 2, right).toBe(0);
      expect(count(right, "("), right).toBe(count(right, ")"));
      const marks = (right.match(/[—(),]/g) ?? []).join("");
      expect(/,.*,|—.*—|\(.*\)/.test(marks) || /\(.*\)\.$/.test(right), right).toBe(true);
    });
    each("e.nonrestrictive", 2, (e) => {
      if (tagged(e, "commas-around-restrictive").length) expect(e[1], e[1]).not.toContain(",");
      if (tagged(e, "missing-commas-nonrestrictive").length) expect(count(e[1], ","), e[1]).toBe(2);
    });
    each("e.coordinate.adjectives", 1, (e, locale) => {
      if (locale === "es") expect(e[1], e[1]).not.toContain(", y ");
      if (tagged(e, "missing-comma-coordinate").length) expect(count(e[1], ","), e[1]).toBe(1);
      if (tagged(e, "comma-between-cumulative").length && locale === "en") expect(count(e[1], ","), e[1]).toBe(0);
    });
  });

  it("confused words: the distractors really look or sound alike, and accent tags differ only by accents", () => {
    for (const level of [1, 2])
      each("e.confused.words", level, ([shown, right, wrong]) => {
        expect(count(shown, "___"), shown).toBe(1);
        for (const [w, why] of wrong) {
          const d = distance(squash(w), squash(right));
          if (why === "missing-accent" || why === "extra-accent") {
            expect(squash(w), `${w} / ${right}`).toBe(squash(right));
            expect(why === "missing-accent" ? accents(w) < accents(right) : accents(w) > accents(right), `${why}: ${w} / ${right}`).toBe(true);
          } else expect(d, `${why}: ${w} / ${right}`).toBeLessThanOrEqual(4);
        }
      });
  });

  it("roots: the root is inside the word; root words and senses point at a word in the sentence", () => {
    each("e.root.clues", 1, ([shown, , , , , target]) => expect(lc(bare(shown))).toContain(lc(bare(target!))));
    each("e.root.clues", 2, ([shown, , , , , target]) => {
      expect(shown).toBe("");
      expect(target).toMatch(/^\p{L}+$/u);
    });
    for (const [id, level] of [["e.multiple.meanings", 1], ["e.connotation", 2]] as const)
      each(id, level, ([shown, , , , , target]) => expect(words(shown).filter((w) => w === lc(target!)).length, `${shown} / ${target}`).toBe(1));
  });

  it("phrases, clauses and verbals: targets begin and end the way their category says", () => {
    const SUB_EN = /^(because|when|if|although|until|that|who|whom|whose|which|where|whoever|what|whether)\b/i;
    const SUB_ES = /^(porque|cuando|si|aunque|hasta que|que|quien|quienes|cuyo|cuya|donde|lo que)\b/i;
    each("e.phrases.clauses", 1, ([, right, , , , target], locale) => {
      const sub = locale === "en" ? SUB_EN : SUB_ES;
      const names = levels("e.phrases.clauses")[0].order![locale];
      if (right === names[2]) expect(target, `dependent: ${target}`).toMatch(sub);
      if (right === names[1]) expect(target, `independent: ${target}`).not.toMatch(sub);
    });
    const REL_EN = /^(who|whom|whose|which|that|where)\b/i, ADV_EN = /^(because|when|if|although|until|after|before|unless)\b/i, NOUN_EN = /^(that|whoever|what|whether)\b/i;
    const REL_ES = /^(que|quien|quienes|cuyo|cuya|donde)\b/i, ADV_ES = /^(porque|cuando|si|aunque|hasta que)\b/i, NOUN_ES = /^(que|quien|lo que|si)\b/i;
    for (const locale of LOCALES) {
      const [noun, rel, adv] = levels("e.dependent.clauses")[0].order![locale];
      for (const [, right, , , , target] of bank("e.dependent.clauses", 1, locale)) {
        const re = right === noun ? (locale === "en" ? NOUN_EN : NOUN_ES) : right === rel ? (locale === "en" ? REL_EN : REL_ES) : right === adv ? (locale === "en" ? ADV_EN : ADV_ES) : null;
        expect(re, right).toBeTruthy();
        expect(target, `${right}: ${target}`).toMatch(re!);
      }
      const [first, second, third] = levels("e.verbals")[0].order![locale];
      for (const [, right, , , , target] of bank("e.verbals", 1, locale)) {
        const w = lc(target!).split(" ");
        if (locale === "en") {
          if (right === first) expect(w[0], `gerund ${target}`).toMatch(/ing$/);
          if (right === second) expect(w[0], `participle ${target}`).toMatch(/(ing|ed|en)$/);
          if (right === third) expect(w[0], `infinitive ${target}`).toBe("to");
        } else {
          if (right === first) expect(w[0], `infinitivo ${target}`).toMatch(/(ar|er|ir)$/);
          if (right === second) expect(w[0], `gerundio ${target}`).toMatch(/(ando|iendo|yendo)$/);
          if (right === third) expect(w[0], `participio ${target}`).toMatch(/(ad|id|rot|escrit)[oa]s?$/);
        }
      }
    }
  });

  it("moods: questions end in a question mark; conditionals use would or could; Spanish targets are in the sentence", () => {
    for (const locale of LOCALES) {
      const names = levels("e.verb.moods")[0].order![locale];
      for (const [shown, right, , , , target] of bank("e.verb.moods", 1, locale)) {
        if (locale === "en") {
          expect(shown.endsWith("?"), shown).toBe(right === names[2]);
          if (right === names[3]) expect(shown, shown).toMatch(/\b(would|could)\b/);
          // The question names the verb, and the named verb has the form its mood needs.
          expect(occurrences(shown, target!), `${shown} names ${target}`).toBe(1);
          const [indicative, imperative, interrogative, conditional, subjunctive] = names;
          const form: Record<string, RegExp> = {
            [indicative]: /^(is|\p{L}+s)$/u,
            [imperative]: new RegExp(`^(please )?${esc(lc(target!))}\\b`),
            // The question's verb comes before its subject, first or right after a question word.
            [interrogative]: new RegExp(`^((who|what|where|when|why|how) )?${esc(lc(target!))} `),
            [conditional]: /^(would|could) \p{L}+$/u,
            [subjunctive]: /^(were|\p{L}*[^s])$/u,
          };
          expect(right === imperative || right === interrogative ? lc(shown) : lc(target!), `${right}: ${target}`).toMatch(form[right]);
        } else expect(words(shown), shown).toContain(lc(target!));
      }
    }
    each("e.verb.moods", 2, ([shown]) => expect(count(shown, "___"), shown).toBe(1));
  });

  it("combining sentences: comma splices and run-ons are the key with its connector removed; fragments really split", () => {
    each("e.combining.sentences", 1, (e, locale) => {
      const right = e[1];
      for (const w of tagged(e, "comma-splice")) expect(w, right).toBe(right.replace(/, (and|but|or|so) /, ", "));
      for (const w of tagged(e, "run-on")) expect(w, right).toBe(right.replace(/,? (y|o|pero|así que) /, " "));
      for (const w of tagged(e, "reversed-relationship")) expect(words(w).sort(), w).toEqual(words(right).sort());
      expect(right, right).toMatch(locale === "en" ? /, (and|but|or|so) / : / (y|o|pero|así que) /);
    });
    each("e.combining.sentences", 2, (e) => {
      for (const w of tagged(e, "fragment")) expect(w.split(/(?<=\.) (?=\p{Lu})/u).length, w).toBe(2);
    });
  });

  it("wordiness: the redundant words and the needed ones are all in the sentence; the plain word is shorter", () => {
    each("e.wordiness", 1, ([shown, right, wrong]) => {
      for (const l of [right, ...wrong.map(([w]) => w)]) expect(hasPhrase(shown, l), `${shown} / ${l}`).toBe(true);
    });
    each("e.wordiness", 2, (e) => {
      const [shown, right, , , , target] = e;
      expect(shown, shown).toContain(target!);
      expect(right.split(" ").length, `${right} vs ${target}`).toBeLessThan(target!.split(" ").length);
      for (const w of tagged(e, "still-wordy")) expect(w.split(" ").length, w).toBeGreaterThanOrEqual(2);
      // The question asks for the shortest way to say it, so every still-wordy choice is longer than the key.
      for (const w of tagged(e, "still-wordy")) expect(w.split(" ").length, `${w} vs ${right}`).toBeGreaterThan(right.split(" ").length);
    });
  });

  it("analogies and formal style: pairs are two words; analogies keep their frame; the formal key has no slang marks", () => {
    for (const locale of LOCALES) {
      const keys = bank("e.word.relationships", 1, locale).map((e) => e[1]);
      for (const k of levels("e.word.relationships")[0].order![locale]) expect(keys.filter((x) => x === k).length, `${locale} ${k}`).toBeGreaterThanOrEqual(2);
    }
    each("e.word.relationships", 1, ([shown]) => expect(shown).toMatch(/^[\p{L}]+ : [\p{L}]+$/u));
    each("e.word.relationships", 2, ([shown], locale) => {
      expect(count(shown, "___"), shown).toBe(1);
      expect(shown, shown).toMatch(locale === "en" ? / is to .* as .* is to ___\.$/ : / es a .* como .* es a ___\.$/);
    });
    const TEXTING = /\blol\b|w\/|@|=|\b2\b|\bu\b|#|\bbc\b|\bb\/c\b|thx|ttyl|\bpls\b|asap|\bhrs\b|\byrs\b|\bomg\b|\bxq\b|\bxfa\b|grax|c\/|\+|\bx\b|temp\.|sáb\.|2\.º|\bq\b/i;
    each("e.formal.style", 1, (e) => {
      expect(e[1], e[1]).not.toMatch(TEXTING);
      expect(e[1], e[1]).not.toMatch(/n't|'re|'ll|'m\b/);
      for (const w of tagged(e, "text-abbreviation")) expect(w, w).toMatch(TEXTING);
    });
  });

  it("pauses and omissions: the marks match their tags, and shortened quotations only drop words", () => {
    each("e.ellipsis.dash", 1, (e, locale) => {
      const right = e[1];
      if (tagged(e, "dash-for-hesitation").length || tagged(e, "dash-for-interruption").length) expect(right, right).toContain("…");
      if (tagged(e, "ellipsis-for-sudden-break").length) expect(right, right).toContain("—");
      for (const w of tagged(e, "space-before-ellipsis")) expect(w, w).toContain(" …");
      for (const w of tagged(e, "four-dots")) expect(w, w).toContain("….");
      if (tagged(e, "missing-dialogue-dash").length) expect(right.startsWith("—"), right).toBe(true);
      expect(right, right).not.toContain(" …");
      if (locale === "es") expect(right, right).not.toContain("….");
    });
    each("e.ellipsis.dash", 2, (e, locale) => {
      const [shown, right] = e;
      const original = words(shown.replace(/^(Original|Texto original): /, ""));
      expect(right, right).toContain(locale === "en" ? " … " : "[…]");
      expect(isSubsequence(words(right), original), `${right} drops only words`).toBe(true);
      // The words the key drops never say who claims it: cutting "scientists believe" turns a belief
      // into a fact.
      const kept = words(right);
      const dropped = original.filter((w) => {
        const i = kept.indexOf(w);
        if (i < 0) return true;
        kept.splice(i, 1);
        return false;
      });
      const ATTRIBUTION = /^(said|says|say|believe|believes|according|warned|warn|claim|claims|reported|think|dijo|dice|dicen|creen|cree|según|advirtieron|afirma|opinan)$/;
      expect(dropped.filter((w) => ATTRIBUTION.test(w)), `${right} cuts an attribution`).toEqual([]);
      for (const w of tagged(e, "missing-ellipsis")) {
        expect(w, w).not.toContain("…");
        expect(isSubsequence(words(w), original), w).toBe(true);
      }
      for (const w of tagged(e, "ellipsis-without-brackets")) expect(w.includes("…") && !w.includes("[…]"), w).toBe(true);
    });
  });

  it("semicolons and colons: comma splices and missing commas are one mark away from the key; colon capitals follow Spanish rules", () => {
    each("e.semicolon.colon", 1, (e) => {
      const right = e[1];
      for (const w of tagged(e, "comma-splice")) expect(w, right).toBe(right.replace(";", ","));
      for (const w of tagged(e, "missing-comma-after-transition")) expect(count(w, ","), w).toBe(count(right, ",") - 1);
      for (const w of tagged(e, "semicolon-for-colon")) expect(w.includes(";") && right.includes(":"), w).toBe(true);
      if (!tagged(e, "semicolon-for-colon").length) expect(right, right).toContain(";");
    });
    each("e.semicolon.colon", 2, (e) => {
      const right = e[1];
      for (const w of tagged(e, "capital-after-colon")) expect(w, right).toBe(right.replace(/: (\p{Ll})/u, (_, c: string) => `: ${c.toUpperCase()}`));
      for (const w of tagged(e, "lowercase-after-greeting")) expect(w, right).toBe(right.replace(/: (\p{Lu})/u, (_, c: string) => `: ${c.toLowerCase()}`));
      for (const w of tagged(e, "semicolon-for-colon")) expect(w, w).toContain(";");
      for (const w of tagged(e, "colon-after-incomplete-clause")) expect(w, w).toContain(":");
      expect(right.includes(":") || tagged(e, "colon-after-incomplete-clause").length > 0, right).toBe(true);
    });
  });

  it("parallel structure fills one blank; purposes, bias and weak evidence carry the markers their labels claim", () => {
    each("e.parallel.structure", 2, ([shown]) => expect(count(shown, "___"), shown).toBe(1));
    for (const locale of LOCALES) {
      const [, persuade] = levels("e.audience.purpose")[0].order![locale];
      const ask = locale === "en" ? /\b(should|needs?|deserves|vote|tell|sign|stop)\b/i : /(?<![\p{L}])(deberían?|necesita|merece|vota|pídanle|firma|deja)(?![\p{L}])/iu;
      for (const [shown, right] of bank("e.audience.purpose", 1, locale)) expect(ask.test(shown), `${right}: ${shown}`).toBe(right === persuade);
      const [small, , outdated] = levels("e.evidence.quality")[1].order![locale];
      for (const [shown, right] of bank("e.evidence.quality", 2, locale)) {
        if (right === small) expect(shown, shown).toMatch(locale === "en" ? /\b(two|three|five|ten)\b/i : /\b(dos|tres|cinco|diez)\b/i);
        if (right === outdated) expect(shown, shown).toMatch(/\b(19\d\d|20[01]\d)\b|years ago|hace .* años/);
      }
    }
    const OPINION = /\b(obviously|clearly|everyone|every scientist|nobody|no one|no student|plainly|está claro|es obvio|todos|todo el mundo|nadie|ningún)\b/i;
    each("e.loaded.language", 2, (e) => {
      expect(e[1], e[1]).not.toMatch(OPINION);
      for (const w of tagged(e, "opinion-as-fact")) expect(w, w).toMatch(OPINION);
    });
    each("e.loaded.language", 1, ([shown, right, wrong]) => {
      for (const l of [right, ...wrong.map(([w]) => w)]) expect(hasPhrase(shown, l), `${shown} / ${l}`).toBe(true);
    });
    each("e.counterclaims", 1, ([shown, , , , , target]) => expect(shown, target).toContain(target!));
    // A sentence's place in the passage must not give its role away, and a rebuttal follows the
    // counterclaim it answers.
    for (const locale of LOCALES) {
      const [, , counter, rebuttal] = levels("e.counterclaims")[0].order![locale];
      const passages = new Map<string, Map<string, number>>();
      for (const [shown, right, , , , target] of bank("e.counterclaims", 1, locale)) {
        if (!passages.has(shown)) passages.set(shown, new Map());
        passages.get(shown)!.set(right, shown.indexOf(target!));
      }
      const places = new Map<string, Set<number>>();
      for (const [shown, roles] of passages) {
        const rank = [...roles.values()].sort((a, b) => a - b);
        for (const [role, at] of roles) places.set(role, (places.get(role) ?? new Set()).add(rank.indexOf(at)));
        expect(rank.indexOf(roles.get(rebuttal)!), `${locale} ${shown}`).toBe(rank.indexOf(roles.get(counter)!) + 1);
      }
      expect(passages.size, `${locale} passages`).toBeGreaterThanOrEqual(8);
      for (const [role, at] of places) expect(at.size, `${locale} ${role} always in the same place`).toBeGreaterThanOrEqual(2);
    }
  });

  it("MLA in-text citations: the key matches MLA's pattern and the page in the source; format mistakes do not", () => {
    const NAME = "\\p{Lu}[\\p{L}'-]+(?: \\p{Lu}[\\p{L}'-]+)?";
    const MLA = new RegExp(`^\\((?:(?:${NAME}(?: and ${NAME}| et al\\.)?|“[^”]+”)(?: \\d{1,3})?|\\d{1,3})\\)$`, "u");
    const FORMAT = ["comma-in-citation", "page-abbreviation", "page-word", "wrong-order", "apa-style", "missing-quotation-marks"];
    each("e.mla.citation", 1, (e) => {
      const [shown, right] = e;
      expect(right, right).toMatch(MLA);
      const page = /(?:page|página) (\d+)/.exec(shown)?.[1];
      if (page) expect(right.endsWith(` ${page})`) || right === `(${page})`, `${right} page ${page}`).toBe(true);
      else expect(right, right).not.toMatch(/\d/);
      for (const tag of FORMAT) for (const w of tagged(e, tag)) expect(w, `${tag}: ${w}`).not.toMatch(MLA);
      // The tag names the mark the choice really has: "p." / "pág." is an abbreviation, "page" is the word.
      for (const w of tagged(e, "page-abbreviation")) expect(w, w).toMatch(/(?<![\p{L}])(p|pág)\./u);
      for (const w of tagged(e, "page-word")) expect(w, w).toMatch(/(?<![\p{L}])(page|página) \d/u);
      for (const w of tagged(e, "partial-surname")) expect(right.includes(w.replace(/^\(| \d+\)$/g, "")) && w.length < right.length, w).toBe(true);
      if (tagged(e, "repeated-author").length) expect(right, right).toMatch(/^\(\d+\)$/);
    });
  });

  it("Works Cited order: the key is the sources sorted by last name, re-sorted here another way", () => {
    const fold = (s: string) => bare(s).toLowerCase();
    const sortBy = <T,>(xs: T[], key: (x: T) => string | number) => [...xs].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
    WORKS_CITED_SETS.forEach((pair, i) => {
      for (const locale of LOCALES) {
        const set = pair[locale];
        const join = (xs: typeof set) => xs.map((s) => s[1]).join(locale === "en" ? ", then " : ", luego ");
        const entry = bank("e.mla.citation", 2, locale)[i];
        expect(entry[1], `${locale} set ${i}`).toBe(join(sortBy(set, (s) => fold(s[1]))));
        const expected: Record<string, string> = {
          "ordered-by-first-name": join(sortBy(set, (s) => fold(s[0]))),
          "ordered-by-year": join(sortBy(set, (s) => s[2])),
          "kept-original-order": join(set),
          "ordered-by-second-surname": join(sortBy(set, (s) => fold(s[1].split(" ").at(-1)!))),
        };
        for (const [w, why] of entry[2]) expect(w, `${locale} set ${i} ${why}`).toBe(expected[why]);
        expect(entry[2].length, `${locale} set ${i}`).toBeGreaterThanOrEqual(locale === "en" ? 3 : 2);
        expect(join(set), `${locale} set ${i} is already sorted`).not.toBe(entry[1]);
      }
    });
  });
});

describe.each(ENGLISH_GRAMMAR_6_9.map((s) => [s.id, s] as const))("%s items", (id, skill) => {
  it("have three hints, a short worked answer, distinct tagged choices and a key that checks, at 240 seeds per level in both languages", () => {
    for (let level = 1; level <= skill.levels; level++) {
      const order = levels(id)[level - 1].order;
      for (const locale of LOCALES) {
        const prompts = new Set<string>();
        for (const seed of SEEDS) {
          const item = makeItem(id, level, seed, locale);
          const where = `${id} L${level} seed ${seed} ${locale}`;
          const text = promptText(item);
          prompts.add([text, ...item.choices!.map((c) => c.label).sort()].join("|"));
          expect(item.input, where).toBe("choices");
          expect(item.hints.length, where).toBe(3);
          expect(item.steps.length >= 1 && item.steps.length <= 4, where).toBe(true);
          const labels = item.choices!.map((c) => c.label);
          expect(labels.length, where).toBeGreaterThanOrEqual(2);
          expect(labels.length, where).toBeLessThanOrEqual(4);
          expect(new Set(labels).size, `${where} ${labels}`).toBe(labels.length);
          if (item.answer.kind !== "choice") throw new Error(where);
          const index = item.answer.index;
          labels.forEach((_, i) => expect(check(item.answer, i).correct, where).toBe(i === index));
          item.choices!.forEach((c, i) => {
            if (i === index) expect(c.why, `${where} right choice has a tag`).toBeUndefined();
            else expect(c.why, `${where} wrong choice "${c.label}" has no tag`).toMatch(/^[a-z]+(-[a-z]+)*$/);
          });
          if (order) {
            const positions = labels.map((l) => order[locale].indexOf(l));
            expect(positions.every((p, i) => p >= 0 && (i === 0 || p > positions[i - 1])), `${where} fixed order ${labels}`).toBe(true);
          }
          const right = labels[index];
          expect(lc(item.steps.at(-1)!), `${where} last step lacks ${right}`).toContain(lc(right));
          expect(hasPhrase(item.hints[2], right), `${where} hint 3 gives away ${right}`).toBe(false);
          if (right.includes(" ") && !order) item.hints.forEach((h, i) => expect(lc(h), `${where} hint ${i + 1} gives away ${right}`).not.toContain(lc(right)));
          // Not even by coincidence: a short key ("then", "de", "short") must not appear as a word in any hint.
          if (!order) item.hints.forEach((h, i) => expect(hasPhrase(h, right), `${where} hint ${i + 1} contains ${right}`).toBe(false));
          expect(item.say, where).not.toMatch(/\^|\d\/\d|\{|\}/);
          // Read aloud, a word pair is "x and y", and the shown text ends before the question starts.
          expect(item.say, `${where} say "${item.say}"`).not.toMatch(/ : |\p{Ll} (¿|What |How |Which |Who |Use |Is |Choose |Elige )/u);
          for (const t of [text, item.say, ...item.hints, ...item.steps, ...labels]) {
            expect(t, `${where} "${t}"`).not.toMatch(/[!¡]|\{t\}|undefined/);
            expect(t, `${where} "${t}"`).not.toMatch(/\p{Extended_Pictographic}/u);
          }
          if (locale === "es") expect(text, where).not.toBe(promptText(makeItem(id, level, seed, "en")));
        }
        expect(prompts.size, `${id} L${level} ${locale} distinct items`).toBeGreaterThanOrEqual(12);
      }
    }
  });
});
