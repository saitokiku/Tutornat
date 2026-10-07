import { describe, expect, it } from "vitest";
import { check } from "../answer";
import { makeItem } from "../skills";
import { ENGLISH_K_4, ENGLISH_K_4_BANKS, type Q } from "./early";

// The K–4 English banks are hand-written, so these tests check them two ways: the shape every item must
// have, and each answer key re-derived by a separate rule written here (first letter of the word,
// syllable count from the split, plural and past-tense spelling rules, irregular forms from a table…).

const TABLE: [id: string, grade: string, standard: string, prereqs: string[], levels: number][] = [
  ["e.letter.sounds", "K", "RF.K.3a", [], 2],
  ["e.rhyme", "K", "RF.K.2a", [], 1],
  ["e.syllables", "K", "RF.K.2b", [], 1],
  ["e.sight.words", "K", "RF.K.3c", ["e.letter.sounds"], 2],
  ["e.cvc.words", "1", "RF.1.3b", ["e.letter.sounds"], 1],
  ["e.capitals", "1", "L.1.2", ["e.sight.words"], 1],
  ["e.plurals", "1", "L.1.1c", ["e.cvc.words"], 2],
  ["e.nouns.verbs", "2", "L.2.1", ["e.plurals"], 2],
  ["e.past.tense", "2", "L.2.1d", ["e.nouns.verbs"], 2],
  ["e.contractions", "2", "L.2.2c", ["e.capitals"], 1],
  ["e.adjectives", "3", "L.3.1a", ["e.nouns.verbs"], 1],
  ["e.homophones", "3", "L.4.1g", ["e.contractions"], 2],
  ["e.prefixes", "3", "L.3.4b", ["e.adjectives"], 1],
  ["e.synonyms", "3", "L.4.5c", ["e.adjectives"], 2],
  ["e.subject.verb", "4", "L.3.1f", ["e.nouns.verbs"], 1],
  ["e.commas", "4", "L.4.2", ["e.capitals"], 1],
  ["e.figurative", "4", "L.5.5a", ["e.synonyms"], 1],
];
const LOCALES = ["en", "es"] as const;
const SEEDS = Array.from({ length: 240 }, (_, i) => i * 104729 + 7);
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
const key = (q: Q) => q.choices[0].label;
/** Every question of a skill (all levels) in one language. */
const qs = (id: string, locale: "en" | "es") => ENGLISH_K_4_BANKS[id].flat().map((e) => e[locale]);
const strings = (q: Q) => [q.prompt, q.say, q.alt ?? "", ...q.hints, ...q.steps, ...q.choices.flatMap((c) => [c.label, c.say ?? ""])];

describe("ENGLISH_K_4 skill list", () => {
  it("matches the skill table: ids, order, grades, standards, prereqs, levels", () => {
    expect(ENGLISH_K_4.map((s) => s.id)).toEqual(TABLE.map((t) => t[0]));
    for (const [id, grade, standard, prereqs, levels] of TABLE) {
      const s = ENGLISH_K_4.find((k) => k.id === id)!;
      expect([s.grade, s.standard, s.prereqs, s.levels, s.subject, s.content], id).toEqual([grade, standard, prereqs, levels, "english", "draft"]);
      expect(s.title.en && s.title.es, id).toBeTruthy();
    }
  });
});

describe.each(TABLE.map((t) => [t[0], t[1]] as const))("%s bank", (id, grade) => {
  const bank = ENGLISH_K_4_BANKS[id];

  it("has at least 12 distinct items per level in each language", () => {
    for (const level of bank)
      for (const locale of LOCALES) expect(new Set(level.map((e) => JSON.stringify(e[locale]))).size, `${id} ${locale}`).toBeGreaterThanOrEqual(12);
  });

  it("has complete, well-formed items in English and Spanish", () => {
    for (const locale of LOCALES)
      for (const q of qs(id, locale)) {
        const where = `${id} ${locale} "${q.prompt}" / ${key(q)}`;
        expect(q.prompt.trim() && q.say.trim(), where).toBeTruthy();
        expect(q.say, `${where} notation in say`).not.toMatch(/\^|\d\/\d|\{|\}|___/);
        expect(q.choices.length, where).toBeGreaterThanOrEqual(3);
        expect(q.choices.length, where).toBeLessThanOrEqual(4);
        const labels = q.choices.map((c) => c.label);
        expect(labels.every((l) => l.trim()), where).toBe(true);
        expect(new Set(labels).size, `${where} duplicate choices`).toBe(labels.length);
        expect(q.hints.length, where).toBe(3);
        expect(q.hints.every((h) => h.trim()), where).toBe(true);
        expect(q.steps.length, where).toBeGreaterThanOrEqual(1);
        expect(q.steps.length, where).toBeLessThanOrEqual(4);
        expect(norm(q.steps.at(-1)!), `${where} last step names the answer`).toContain(norm(key(q)));
        if (q.picture) expect(q.alt?.trim(), `${where} alt`).toBeTruthy();
        for (const s of strings(q)) expect(s, `${where} filler`).not.toMatch(/great job|good job|awesome|well done|amazing|let's dive|excelente|genial|buen trabajo/i);
        if (locale === "en") for (const s of strings(q)) expect(s, `${where} exclamation`).not.toContain("!");
      }
  });

  it("keeps K–2 English sentences to 10 words or fewer", () => {
    if (!["K", "1", "2"].includes(grade)) return;
    for (const q of qs(id, "en"))
      for (const text of [q.prompt, q.say, ...q.hints, ...q.steps])
        for (const sentence of text.split(/(?<=[.?:]”?)\s+/)) {
          const words = sentence.split(/\s+/).filter((w) => /[\p{L}\d]/u.test(w));
          expect(words.length, `${id}: "${sentence}"`).toBeLessThanOrEqual(10);
        }
  });
});

describe.each(ENGLISH_K_4.map((s) => [s.id, s] as const))("%s generator", (id, skill) => {
  it("picks one slot for both languages and keys it correctly (240 seeds a level)", () => {
    for (let level = 1; level <= skill.levels; level++) {
      const bank = ENGLISH_K_4_BANKS[id][level - 1];
      const positions = new Set<number>();
      for (const seed of SEEDS) {
        const slots = LOCALES.map((locale) => {
          const item = makeItem(id, level, seed, locale);
          const slot = bank.findIndex((e) => e[locale].hints === item.hints);
          const q = bank[slot][locale];
          const where = `${id} L${level} seed ${seed} ${locale}`;
          expect(slot, where).toBeGreaterThanOrEqual(0);
          expect(item.answer.kind, where).toBe("choice");
          if (item.answer.kind !== "choice") return slot;
          const index = item.answer.index;
          expect(item.choices![index].label, where).toBe(key(q));
          expect(item.choices!.map((c) => c.label).sort(), where).toEqual(q.choices.map((c) => c.label).sort());
          item.choices!.forEach((_, i) => expect(check(item.answer, i).correct, `${where} choice ${i}`).toBe(i === index));
          positions.add(index);
          return slot;
        });
        expect(slots[0], `${id} L${level} seed ${seed}: same slot in en and es`).toBe(slots[1]);
      }
      expect(positions.size, `${id} L${level}: key always in the same place`).toBeGreaterThan(1);
    }
  });
});

describe("pre-readers (K)", () => {
  it("letter sounds, rhyme and syllables can be answered by listening and looking", () => {
    for (const id of ["e.letter.sounds", "e.rhyme", "e.syllables"])
      for (const locale of LOCALES)
        for (const q of qs(id, locale)) {
          expect(q.picture && q.alt && q.say, `${id} ${q.say}`).toBeTruthy();
          expect(q.choices.every((c) => c.say?.trim()), `${id} ${q.say}`).toBe(true);
          if (id !== "e.letter.sounds") expect(q.choices.every((c) => c.picture), `${id} ${q.say}`).toBe(true);
        }
  });

  it("sight words: the item says the word, the prompt does not show it, choices are not read aloud", () => {
    for (const locale of LOCALES)
      for (const q of qs("e.sight.words", locale)) {
        expect(q.say.endsWith(`: ${key(q)}.`), q.say).toBe(true);
        const shown = norm(q.prompt).split(/[\s.,]+/);
        for (const c of q.choices) expect(shown, `${q.prompt} shows ${c.label}`).not.toContain(norm(c.label));
        expect(q.choices.some((c) => c.say), q.say).toBe(false);
      }
  });
});

describe("answer keys, checked another way", () => {
  it("letter sounds: the key is the first letter of the pictured word; sound-alike letters never compete", () => {
    // Letters that can make the same sound in that language.
    const sameSound = { en: [["c", "k"], ["c", "s"]], es: [["b", "v"], ["s", "z"], ["c", "k"], ["c", "s"], ["g", "j"]] };
    for (const locale of LOCALES)
      for (const q of qs("e.letter.sounds", locale)) {
        expect(key(q), q.say).toBe(norm(q.say.split(".")[0])[0]);
        const labels = q.choices.map((c) => c.label);
        for (const [a, b] of sameSound[locale]) expect(labels.includes(a) && labels.includes(b), `${q.say} offers ${a} and ${b}`).toBe(false);
      }
  });

  it("rhyme: the key ends like the target word, the others do not", () => {
    const end = (w: string) => norm(w).slice(-2);
    for (const locale of LOCALES)
      for (const q of qs("e.rhyme", locale)) {
        const target = /(?:with|con) (\S+)\?$/.exec(q.prompt)![1];
        expect(end(key(q)), q.prompt).toBe(end(target));
        for (const c of q.choices.slice(1)) expect(end(c.label), `${q.prompt} ${c.label}`).not.toBe(end(target));
      }
  });

  it("syllables: the key equals the number of parts in the written split", () => {
    for (const locale of LOCALES)
      for (const q of qs("e.syllables", locale)) {
        const parts = q.steps[0].split(": ")[1].split(" - ");
        expect(Number(key(q)), q.steps[0]).toBe(parts.length);
        expect(norm(q.prompt), q.steps[0]).toContain(norm(parts.join("")));
      }
  });

  it("short words: the key is the word the item says; English keys are consonant-vowel-consonant", () => {
    for (const locale of LOCALES)
      for (const q of qs("e.cvc.words", locale)) {
        expect(norm(q.say.split(".")[0]), q.say).toBe(norm(key(q)));
        if (locale === "en") expect(key(q), q.say).toMatch(/^[^aeiou][aeiou][^aeiou]$/);
      }
  });

  it("capitals: only the key passes the capital and end-mark rules", () => {
    const ok = (s: string, locale: "en" | "es") => {
      const first = s.replace(/^[¿¡]/, "")[0];
      if (first !== first.toUpperCase() || !/[.?!]$/.test(s)) return false;
      if (locale === "en") return !/\bi\b/.test(s) && (!/^(Can|Where|Do|Is)\b/.test(s) || s.endsWith("?"));
      if (s.endsWith("?") !== s.startsWith("¿") || s.endsWith("!") !== s.startsWith("¡")) return false;
      return !/ (Yo|Lunes)\b/.test(s);
    };
    for (const locale of LOCALES)
      for (const q of qs("e.capitals", locale)) q.choices.forEach((c, i) => expect(ok(c.label, locale), c.label).toBe(i === 0));
  });

  it("plurals follow the spelling rules and the irregular table", () => {
    const EN_IRREGULAR: Record<string, string> = {
      child: "children", mouse: "mice", foot: "feet", tooth: "teeth", man: "men", woman: "women", goose: "geese",
      sheep: "sheep", deer: "deer", leaf: "leaves", wolf: "wolves", knife: "knives", shelf: "shelves",
    };
    const ES_LEVEL2: Record<string, string> = {
      lápiz: "lápices", pez: "peces", luz: "luces", nariz: "narices", voz: "voces", camión: "camiones", ratón: "ratones",
      león: "leones", corazón: "corazones", avión: "aviones", joven: "jóvenes", autobús: "autobuses", lunes: "lunes",
    };
    const [enL1, enL2] = ENGLISH_K_4_BANKS["e.plurals"].map((l) => l.map((e) => e.en));
    const [esL1, esL2] = ENGLISH_K_4_BANKS["e.plurals"].map((l) => l.map((e) => e.es));
    const one = (q: Q) => /^(?:One|Una?) (\S+),/.exec(q.prompt)![1];
    for (const q of enL1) expect(key(q), q.prompt).toBe(one(q) + (/(s|x|z|ch|sh)$/.test(one(q)) ? "es" : "s"));
    for (const q of enL2) expect(key(q), q.prompt).toBe(EN_IRREGULAR[one(q)]);
    for (const q of esL1) expect(key(q), q.prompt).toBe(one(q) + (/[aeiou]$/.test(one(q)) ? "s" : "es"));
    for (const q of esL2) expect(key(q), q.prompt).toBe(ES_LEVEL2[one(q)]);
  });

  it("past tense: regular -ed spelling, Spanish regular endings, and irregular tables", () => {
    const ed = (b: string) =>
      b.endsWith("e") ? `${b}d` : /[^aeiou]y$/.test(b) ? `${b.slice(0, -1)}ied` : /^[^aeiou]*[aeiou][^aeiouwxy]$/.test(b) ? `${b}${b.slice(-1)}ed` : `${b}ed`;
    const EN_IRREGULAR: Record<string, string> = {
      go: "went", run: "ran", see: "saw", eat: "ate", come: "came", sing: "sang", swim: "swam", write: "wrote",
      take: "took", give: "gave", make: "made", sit: "sat", sleep: "slept", find: "found", fly: "flew", ride: "rode",
    };
    const ES_IRREGULAR: Record<string, string> = {
      "ir|yo": "fui", "ver|yo": "vi", "hacer|yo": "hice", "hacer|mi papá": "hizo", "tener|yo": "tuve", "decir|mi mamá": "dijo",
      "poner|yo": "puse", "venir|mis primos": "vinieron", "estar|yo": "estuve", "dar|yo": "di", "traer|yo": "traje",
      "poder|Sofía": "pudo", "dormir|el bebé": "durmió", "ir|mi hermana": "fue", "decir|yo": "dije", "querer|yo": "quise",
    };
    const [en1, en2] = ENGLISH_K_4_BANKS["e.past.tense"].map((l) => l.map((e) => e.en));
    const [es1, es2] = ENGLISH_K_4_BANKS["e.past.tense"].map((l) => l.map((e) => e.es));
    for (const q of en1) {
      const base = q.steps[0].split(" → ")[0];
      expect(key(q), q.prompt).toBe(ed(base));
    }
    for (const q of en2) expect(key(q), q.prompt).toBe(EN_IRREGULAR[/The past of (\S+) is/.exec(q.steps[0])![1]]);
    for (const q of es1) {
      const inf = q.steps[0].split(" → ")[0];
      const who = /quien lo hace es (.+)\.$/.exec(q.hints[2])![1];
      const [stem, ar] = [inf.slice(0, -2), inf.endsWith("ar")];
      expect(key(q), q.prompt).toBe(stem + (who === "yo" ? (ar ? "é" : "í") : ar ? "ó" : "ió"));
    }
    for (const q of es2) {
      const [, inf, who] = /El pasado de (\S+) con (.+?) es \S+\.$/.exec(q.steps[0])!;
      expect(key(q), q.prompt).toBe(ES_IRREGULAR[`${inf}|${who}`]);
    }
  });

  it("contractions: putting the dropped letters back gives the two words; Spanish uses al and del", () => {
    for (const q of qs("e.contractions", "en")) {
      const full = /write "(.+)"\?$/.exec(q.prompt)![1];
      const gone = /place of "(.+)"\.$/.exec(q.steps[0])![1];
      expect(key(q).replace("'", gone), q.prompt).toBe(full.replace(" ", ""));
    }
    for (const q of qs("e.contractions", "es")) {
      expect(["al", "del"], q.prompt).toContain(key(q));
      expect(q.steps.at(-1), q.prompt).not.toMatch(/\b(a|de) el\b/);
    }
  });

  it("nouns, verbs and adjectives: every choice is a word from the sentence", () => {
    for (const id of ["e.nouns.verbs", "e.adjectives"])
      for (const locale of LOCALES)
        for (const q of qs(id, locale)) {
          const sentence = /“(.+)”/.exec(q.prompt)?.[1];
          if (!sentence) continue; // level 1 of nouns and verbs has no sentence
          const words = sentence.split(/[\s.,]+/);
          for (const c of q.choices) expect(words, `${q.prompt} ${c.label}`).toContain(c.label);
        }
  });

  it("prefixes: the word is prefix + base, and only the key carries the prefix's meaning", () => {
    const MEANS: Record<string, RegExp> = { re: /again|otra vez|volver a/, un: /^not |^open/, dis: /^not /, pre: /before|antes/, mis: /wrong/, in: /^no /, im: /^no /, des: /^no |soltar|dejar de/ };
    for (const locale of LOCALES)
      for (const q of qs("e.prefixes", locale)) {
        const [, word, pre, base] = /^(\S+) (?:is|es) (\S+)- \+ (\S+)\.$/.exec(q.hints[2])!;
        expect(norm(word), q.hints[2]).toBe(norm(pre + base));
        q.choices.forEach((c, i) => expect(MEANS[pre].test(c.label), `${word}: ${c.label}`).toBe(i === 0));
      }
  });

  it("synonyms and antonyms never offer the word itself", () => {
    for (const locale of LOCALES)
      for (const q of qs("e.synonyms", locale)) {
        const word = /"(.+)"/.exec(q.prompt)![1];
        expect(q.choices.map((c) => c.label), q.prompt).not.toContain(word);
      }
  });

  it("subject-verb: the key's ending matches the subject", () => {
    for (const q of qs("e.subject.verb", "en")) {
      const many = q.hints[2].includes("more than one");
      expect(key(q).endsWith("s"), q.prompt).toBe(!many);
    }
    const ES_ENDING: [RegExp, RegExp][] = [[/^más de/, /n$/], [/^un[oa] sol[oa]/, /[ae]$/], [/a quien le hablas/, /s$/], [/quien habla/, /o$/], [/otras personas/, /mos$/]];
    for (const q of qs("e.subject.verb", "es")) {
      const desc = /" es (.+)\.$/.exec(q.hints[2])![1];
      const rule = ES_ENDING.find(([who]) => who.test(desc));
      expect(rule, desc).toBeTruthy();
      expect(key(q), q.prompt).toMatch(rule![1]);
    }
  });

  it("commas: English lists use the serial comma, Spanish lists never put a comma before y", () => {
    for (const q of qs("e.commas", "en")) if (q.hints[1].startsWith("In a list")) expect(key(q)).toContain(", and ");
    for (const q of qs("e.commas", "es")) {
      if (q.hints[1].startsWith("En una lista")) {
        expect(key(q)).not.toContain(", y ");
        expect(q.choices.slice(1).some((c) => c.label.includes(", y ")), q.choices[0].label).toBe(true);
      }
      if (q.hints[1].includes("antes de pero")) expect(key(q)).toContain(", pero ");
    }
  });

  it("figurative: a sentence is a simile exactly when it compares with like, as or como", () => {
    for (const locale of LOCALES)
      for (const q of qs("e.figurative", locale)) {
        if (q.choices.length !== 3) continue; // idiom meanings
        const sentence = /“(.+)”/.exec(q.prompt)![1];
        expect(/^(simile|símil)$/i.test(key(q)), sentence).toBe(/\b(like|as|como)\b/.test(sentence));
      }
  });
});
