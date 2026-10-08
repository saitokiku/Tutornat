import { describe, expect, it } from "vitest";
import { answerText, check } from "../answer";
import { makeItem } from "../skills";
import { ENGLISH_PHONICS, PHONICS_BANKS, type Q } from "./phonics";

// The phonics banks are hand-written, so these tests check them two ways: the shape every item must
// have (audio script, pictures, tags), and each answer key and misconception tag re-derived here by a
// separate rule (first letter, last sound, vowel pattern, sound count from spelling rules…).

const TABLE: [id: string, grade: string, standard: string, prereqs: string[], levels: number][] = [
  ["e.letter.names", "K", "RF.K.1d", [], 2],
  ["e.first.sound", "K", "RF.K.2d", [], 1],
  ["e.final.sound", "K", "RF.K.2d", ["e.first.sound"], 1],
  ["e.middle.vowel", "K", "RF.K.2d", ["e.final.sound"], 2],
  ["e.word.families", "K", "RF.K.2a", ["e.rhyme"], 2],
  ["e.blend.onset", "K", "RF.K.2c", ["e.word.families"], 2],
  ["e.sound.swap", "K", "RF.K.2e", ["e.blend.onset"], 2],
  ["e.sight.preprimer", "K", "RF.K.3c", ["e.sight.words"], 2],
  ["e.sight.primer", "K", "RF.K.3c", ["e.sight.preprimer"], 2],
  ["e.segment.sounds", "1", "RF.1.2d", ["e.sound.swap"], 1],
  ["e.short.vowels", "1", "RF.1.3b", ["e.cvc.words", "e.middle.vowel"], 2],
  ["e.digraphs", "1", "RF.1.3a", ["e.short.vowels"], 2],
  ["e.blends.initial", "1", "RF.1.2b", ["e.short.vowels"], 2],
  ["e.blends.final", "1", "RF.1.3b", ["e.blends.initial"], 2],
  ["e.silent.e", "1", "RF.1.3c", ["e.short.vowels"], 2],
  ["e.vowel.teams", "1", "RF.1.3c", ["e.silent.e"], 2],
  ["e.y.vowel", "1", "RF.1.3", ["e.vowel.teams"], 2],
  ["e.ending.ed", "1", "RF.1.3f", ["e.short.vowels"], 2],
  ["e.ending.ing", "1", "RF.1.3f", ["e.ending.ed"], 2],
  ["e.sight.grade1", "1", "RF.1.3g", ["e.sight.primer"], 2],
  ["e.r.controlled", "2", "RF.2.3", ["e.vowel.teams"], 2],
  ["e.diphthongs", "2", "RF.2.3b", ["e.vowel.teams"], 2],
  ["e.soft.c.g", "2", "RF.2.3e", ["e.short.vowels"], 2],
  ["e.silent.letters", "2", "RF.2.3e", ["e.digraphs"], 1],
  ["e.compound.words", "2", "L.2.4d", ["e.syllables"], 2],
  ["e.syllable.split", "2", "RF.2.3c", ["e.blends.final", "e.compound.words"], 2],
  ["e.syllable.types", "2", "RF.2.3c", ["e.syllable.split", "e.r.controlled"], 2],
  ["e.sight.grade2", "2", "RF.2.3f", ["e.sight.grade1"], 2],
];

/** Reading skills built from the shared gap (level 1) and picture-word (level 2) shapes. */
const READING = ["e.digraphs", "e.blends.initial", "e.blends.final", "e.vowel.teams"];
const SIGHT = ["e.sight.preprimer", "e.sight.primer", "e.sight.grade1", "e.sight.grade2"];
/** Levels a pre-reader answers by listening: every choice is a spoken picture. */
const LISTENING: [string, number][] = [
  ["e.first.sound", 1], ["e.final.sound", 1], ["e.middle.vowel", 1], ["e.word.families", 1], ["e.blend.onset", 1], ["e.sound.swap", 1],
  ["e.soft.c.g", 1],
];
/** Levels where reading the choices (or finding a letter shape) is the skill: choices are not read aloud. */
const SILENT: [string, number][] = [
  ["e.letter.names", 1], ["e.letter.names", 2], ["e.word.families", 2], ["e.blend.onset", 2], ["e.sound.swap", 2],
  ...SIGHT.flatMap((id): [string, number][] => [[id, 1], [id, 2]]),
  ["e.short.vowels", 1], ...READING.flatMap((id): [string, number][] => [[id, 1], [id, 2]]),
  ["e.silent.e", 1], ["e.silent.e", 2], ["e.ending.ed", 2], ["e.ending.ing", 1], ["e.ending.ing", 2],
  ["e.r.controlled", 1], ["e.r.controlled", 2], ["e.diphthongs", 1], ["e.diphthongs", 2], ["e.soft.c.g", 2], ["e.silent.letters", 1],
  ["e.compound.words", 2], ["e.syllable.split", 1], ["e.syllable.split", 2], ["e.syllable.types", 1], ["e.syllable.types", 2],
];

const LOCALES = ["en", "es"] as const;
type L = (typeof LOCALES)[number];
const SEEDS = Array.from({ length: 240 }, (_, i) => i * 104729 + 7);
/** Lower case without accents; ñ stays ñ, since it is its own letter and sound. */
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/n\u0303/g, "ñ").replace(/\p{Diacritic}/gu, "");
const key = (q: Q) => q.choices[0].label;
const lv = (id: string, level: number, locale: L) => PHONICS_BANKS[id][level - 1].map((e) => e[locale]);
const qs = (id: string, locale: L) => PHONICS_BANKS[id].flat().map((e) => e[locale]);
const strings = (q: Q) => [q.prompt, q.say, q.alt ?? "", ...q.hints, ...q.steps, ...q.choices.flatMap((c) => [c.label, c.say ?? ""])];
const label = (q: Q, why: string) => q.choices.find((c) => c.why === why)?.label ?? "";
const vowels = (w: string) => norm(w).replace(/[^aeiou]/g, "");
/** The words of a text, normalized. */
const words = (s: string) => norm(s).split(/[^\p{L}\d]+/u).filter(Boolean);
const frame = (w: string) => norm(w).replace(/[aeiou]/g, "");

describe("ENGLISH_PHONICS skill list", () => {
  it("matches the skill table: ids, order, grades, standards, prereqs, levels", () => {
    expect(ENGLISH_PHONICS.map((s) => s.id)).toEqual(TABLE.map((t) => t[0]));
    for (const [id, grade, standard, prereqs, levels] of TABLE) {
      const s = ENGLISH_PHONICS.find((k) => k.id === id)!;
      expect([s.grade, s.standard, s.prereqs, s.levels, s.subject, s.content], id).toEqual([grade, standard, prereqs, levels, "english", "draft"]);
      expect(s.title.en && s.title.es, id).toBeTruthy();
    }
  });
});

describe.each(TABLE.map((t) => [t[0]] as const))("%s bank", (id) => {
  const bank = PHONICS_BANKS[id];

  it("has at least 12 distinct items per level in each language", () => {
    for (const level of bank)
      for (const locale of LOCALES) expect(new Set(level.map((e) => JSON.stringify(e[locale]))).size, `${id} ${locale}`).toBeGreaterThanOrEqual(12);
  });

  it("has complete, well-formed items in English and Spanish", () => {
    for (const locale of LOCALES)
      for (const q of qs(id, locale)) {
        const where = `${id} ${locale} "${q.prompt}" / ${key(q)}`;
        expect(q.prompt.trim() && q.say.trim(), where).toBeTruthy();
        expect(q.say, `${where} notation in say`).not.toMatch(/\^|\d\/\d|\{|\}|___|\/[a-z]+\//);
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
        for (const s of strings(q)) expect(s, `${where} filler`).not.toMatch(/great job|good job|awesome|well done|amazing|let's dive|excelente|genial|buen trabajo|muy bien/i);
        for (const s of strings(q)) expect(s, `${where} exclamation`).not.toMatch(/[!¡]/);
      }
  });

  it("tags every wrong choice with a kebab-case misconception, never the key", () => {
    for (const locale of LOCALES)
      for (const q of qs(id, locale)) {
        expect(q.choices[0].why, `${id} ${q.say} key has a tag`).toBeUndefined();
        for (const c of q.choices.slice(1)) expect(c.why, `${id} ${locale} ${q.say} ${c.label}`).toMatch(/^[a-z]+(-[a-z]+)+$|^[a-z]+$/);
      }
  });

  it("keeps K–2 English sentences to 10 words or fewer", () => {
    for (const q of qs(id, "en"))
      for (const text of [q.prompt, q.say, ...q.hints, ...q.steps])
        for (const sentence of text.split(/(?<=[.?:]”?)\s+/)) {
          const words = sentence.split(/\s+/).filter((w) => /[\p{L}\d]/u.test(w));
          expect(words.length, `${id}: "${sentence}"`).toBeLessThanOrEqual(10);
        }
  });
});

describe.each(ENGLISH_PHONICS.map((s) => [s.id, s] as const))("%s generator", (id, skill) => {
  it("picks one slot for both languages and keys it correctly (240 seeds a level)", () => {
    for (let level = 1; level <= skill.levels; level++) {
      const bank = PHONICS_BANKS[id][level - 1];
      const positions = new Set<number>();
      for (const seed of SEEDS) {
        const slots = LOCALES.map((locale) => {
          const item = makeItem(id, level, seed, locale);
          const slot = bank.findIndex((e) => e[locale].hints === item.hints);
          const where = `${id} L${level} seed ${seed} ${locale}`;
          expect(slot, where).toBeGreaterThanOrEqual(0);
          const q = bank[slot][locale];
          expect(item.answer.kind, where).toBe("choice");
          if (item.answer.kind !== "choice") return slot;
          const index = item.answer.index;
          expect(item.choices![index].label, where).toBe(key(q));
          expect(item.choices![index].why, where).toBeUndefined();
          expect(item.choices!.filter((c) => c.why).length, where).toBe(q.choices.length - 1);
          expect(item.choices!.map((c) => c.label).sort(), where).toEqual(q.choices.map((c) => c.label).sort());
          item.choices!.forEach((_, i) => expect(check(item.answer, i).correct, `${where} choice ${i}`).toBe(i === index));
          // answerText is for display; a choice is checked by its index (line above), never by text.
          expect(answerText(item.answer, item.choices), `${where} answerText`).toBe(item.choices![index].label);
          positions.add(index);
          return slot;
        });
        expect(slots[0], `${id} L${level} seed ${seed}: same slot in en and es`).toBe(slots[1]);
      }
      expect(positions.size, `${id} L${level}: key always in the same place`).toBeGreaterThan(1);
    }
  });
});

describe("audio scripts", () => {
  it("listening levels: a spoken line, and every choice is a spoken picture", () => {
    for (const [id, level] of LISTENING)
      for (const locale of LOCALES)
        for (const q of lv(id, level, locale)) {
          expect(q.say.trim(), `${id} ${q.prompt}`).toBeTruthy();
          for (const c of q.choices) expect(c.say?.trim() && c.picture, `${id} L${level} ${locale} ${q.say} ${c.label}`).toBeTruthy();
        }
  });

  it("reading levels never read the choices aloud, and the line never says the key", () => {
    for (const [id, level] of SILENT)
      for (const locale of LOCALES)
        for (const q of lv(id, level, locale)) {
          expect(q.choices.some((c) => c.say), `${id} L${level} ${q.say}`).toBe(false);
          // Letter names and sight-word level 1 say the target on purpose: finding its written form is the task.
          // A category question names every choice in its spoken line; that gives nothing away.
          const lists = q.choices.every((c) => norm(q.say).includes(norm(c.label)));
          if (id !== "e.letter.names" && !(SIGHT.includes(id) && level === 1) && !lists) expect(norm(q.say).split(/[^\p{L}]+/u), `${id} ${q.say}`).not.toContain(norm(key(q)));
        }
  });
});

// ---- Answer keys, checked another way ----

/** The last sound of an English word from its spelling: drop a silent e, then read the final grapheme. */
function lastSound(w: string) {
  const s = /[aeiou][^aeiou]e$/.test(w) ? w.slice(0, -1) : w;
  const m = /(tch|ck|ss|ll|sh|ch|ng|[a-z])$/.exec(s)!;
  return ({ tch: "ch", ck: "k", ss: "s", ll: "l" } as Record<string, string>)[m[1]] ?? m[1];
}
/** Spelled the same from the last two letters on: the rhyme test used for these banks. */
const rhymes = (a: string, b: string) => norm(a).slice(-2) === norm(b).slice(-2);
const ES_NAMES: Record<string, string> = { eme: "M", eñe: "Ñ", e: "E", pe: "P", be: "B", o: "O", ele: "L", te: "T", hache: "H", ge: "G", ene: "N", u: "U", ese: "S", efe: "F", erre: "R", de: "D", cu: "Q", a: "A" };

describe("answer keys, checked another way (kindergarten)", () => {
  it("letter names: the key is the letter named; small letters pair with their capital", () => {
    for (const locale of LOCALES) {
      for (const q of lv("e.letter.names", 1, locale)) {
        const named = locale === "en" ? /letter (\S)\.$/.exec(q.say)![1] : ES_NAMES[/mayúscula (\S+)\.$/.exec(q.say)![1]];
        expect(key(q), q.say).toBe(named);
        for (const c of q.choices) expect(c.label, q.say).toMatch(/^\p{Lu}$/u);
      }
      for (const q of lv("e.letter.names", 2, locale)) {
        const capital = /(\p{Lu})\?$/u.exec(q.prompt)![1];
        expect(key(q).toUpperCase(), q.prompt).toBe(capital);
        for (const c of q.choices.slice(1)) expect(c.label.toUpperCase(), q.prompt).not.toBe(capital);
        for (const c of q.choices) expect(c.label, q.prompt).toMatch(/^\p{Ll}$/u);
        // A reversal tag only on letters that are reversals or flips of each other.
        const mirror = ["bd", "bp", "bq", "dp", "dq", "pq", "nu", "mw"];
        for (const c of q.choices.slice(1))
          expect(c.why === "mirror-letter", `${q.prompt} ${c.label}`).toBe(mirror.includes([key(q), c.label].sort().join("")));
      }
    }
  });

  it("first sound: the key starts like the target and does not rhyme; the near miss rhymes", () => {
    for (const locale of LOCALES)
      for (const q of qs("e.first.sound", locale)) {
        const t = norm(/(?:sound as|sonido que) (\S+)\?$/.exec(q.prompt)![1]);
        const [k, near, other] = q.choices.map((c) => norm(c.label));
        expect(k[0], q.prompt).toBe(t[0]);
        expect(/^(sh|ch|th|wh|ll)/.test(k) || /^(sh|ch|th|wh|ll)/.test(t), q.prompt).toBe(false);
        expect(rhymes(k, t), `${q.prompt} key rhymes`).toBe(false);
        expect(rhymes(near, t) && near[0] !== t[0], `${q.prompt} ${near}`).toBe(true);
        expect(other[0] !== t[0] && !rhymes(other, t), `${q.prompt} ${other}`).toBe(true);
      }
  });

  it("final sound: the key ends with the target's last sound; the near miss only starts like it", () => {
    for (const locale of LOCALES)
      for (const q of qs("e.final.sound", locale)) {
        const t = norm(/(?:sound as|sonido que) (\S+)\?$/.exec(q.prompt)![1]);
        const last = (w: string) => (locale === "en" ? lastSound(w) : w.slice(-1));
        const [k, near, other] = q.choices.map((c) => norm(c.label));
        expect(last(k), q.prompt).toBe(last(t));
        expect(rhymes(k, t), `${q.prompt} key rhymes`).toBe(false);
        expect(near[0] === t[0] && last(near) !== last(t), `${q.prompt} ${near}`).toBe(true);
        expect(last(other), `${q.prompt} ${other}`).not.toBe(last(t));
      }
  });

  it("middle vowel: the key has the target's vowels; the consonant tag means only the vowel changed", () => {
    for (const locale of LOCALES) {
      for (const q of lv("e.middle.vowel", 1, locale)) {
        const t = /(?:as|que) (\S+)\?$/.exec(q.prompt)![1];
        expect(vowels(key(q)), q.prompt).toBe(vowels(t));
        if (locale === "en") expect(vowels(t), t).toMatch(/^[aeiou]$/);
        else expect(new Set(vowels(t)).size, t).toBe(1);
        for (const c of q.choices.slice(1)) {
          expect(vowels(c.label), `${t} ${c.label}`).not.toBe(vowels(t));
          expect(c.why === "matched-consonants", `${t} ${c.label}`).toBe(frame(c.label) === frame(t));
        }
      }
      for (const q of lv("e.middle.vowel", 2, locale)) {
        const shown = q.prompt.split(" ").at(-1)!;
        const said = norm(q.say.split(".")[0]);
        expect(norm(shown.replace("___", key(q))), q.prompt).toBe(said);
        expect(said.search(/[aeiou]/), q.prompt).toBe(shown.indexOf("___"));
        for (const c of q.choices) expect("aeiou", q.prompt).toContain(c.label);
      }
    }
  });

  it("word families: members and key end with the family; tags match how each miss differs", () => {
    for (const locale of LOCALES) {
      for (const q of lv("e.word.families", 1, locale)) {
        const fam = norm(/-(\S+?)(?: family)?\?$/.exec(q.prompt)![1]);
        const members = q.say.split(".")[0].split(", ").map(norm);
        expect(members.length, q.say).toBe(3);
        for (const m of [...members, norm(key(q))]) expect(m.endsWith(fam), `${q.say} ${m}`).toBe(true);
        for (const c of q.choices.slice(1)) expect(norm(c.label).endsWith(fam), `${q.say} ${c.label}`).toBe(false);
        const near = norm(label(q, "same-vowel-only"));
        expect(near, `${q.say} ${near}`).toContain(fam.match(/[aeiou]/)![0]);
      }
      for (const q of lv("e.word.families", 2, locale)) {
        const fam = norm(/-(\S+?) /.exec(q.prompt)![1]);
        const k = norm(key(q));
        expect(k.endsWith(fam), q.prompt).toBe(true);
        for (const c of q.choices.slice(1)) {
          const w = norm(c.label);
          const why = w.endsWith(fam) && w[0] !== k[0] ? "wrong-first-letter" : frame(w) === frame(k) ? "wrong-vowel" : w[0] === k[0] && !w.endsWith(fam) ? "wrong-ending" : "?";
          expect(c.why, `${k} ${w}`).toBe(why);
        }
      }
    }
  });

  it("blending: the key is the start plus the ending; each miss changes the part its tag names", () => {
    for (const q of lv("e.blend.onset", 1, "en")) {
      const [, anchor, rime] = /of (\S+)\. Then add (\S+)\.$/.exec(q.prompt)!;
      expect(key(q), q.prompt).toBe(anchor[0] + rime);
      const start = label(q, "wrong-start"), end = label(q, "wrong-end");
      expect(start.endsWith(rime) && start[0] !== anchor[0], `${q.prompt} ${start}`).toBe(true);
      expect(end[0] === anchor[0] && !end.endsWith(rime), `${q.prompt} ${end}`).toBe(true);
    }
    for (const q of lv("e.blend.onset", 1, "es")) {
      const [a, b] = /sílabas: (\S+)… (\S+)\.$/.exec(q.prompt)!.slice(1).map(norm);
      expect(norm(key(q)), q.prompt).toBe(a + b);
      const start = norm(label(q, "wrong-start")), end = norm(label(q, "wrong-end"));
      expect(start.endsWith(b) && !start.startsWith(a), `${q.prompt} ${start}`).toBe(true);
      expect(end.startsWith(a) && end !== a + b, `${q.prompt} ${end}`).toBe(true);
    }
    for (const locale of LOCALES)
      for (const q of lv("e.blend.onset", 2, locale)) {
        const [a, b] = q.prompt.split(" + ");
        expect(key(q), q.prompt).toBe(a + b);
        expect(label(q, "dropped-start"), q.prompt).toBe(b);
        const v = label(q, "wrong-vowel"), s = label(q, "wrong-start");
        expect(frame(v) === frame(a + b) && vowels(v) !== vowels(a + b), `${q.prompt} ${v}`).toBe(true);
        expect(s.endsWith(b) && !s.startsWith(a), `${q.prompt} ${s}`).toBe(true);
      }
  });

  it("sound swap: the key keeps the word and changes exactly the part asked for", () => {
    for (const q of lv("e.sound.swap", 1, "en")) {
      const [, w, clue] = /^(\S+)\. Change its first sound to the start of (\S+)\.$/.exec(q.prompt)!;
      expect(key(q), q.prompt).toBe(clue[0] + w.toLowerCase().slice(1));
      expect(label(q, "kept-old-sound"), q.prompt).toBe(w.toLowerCase());
      expect(label(q, "wrong-new-sound")[0], q.prompt).not.toBe(clue[0]);
    }
    for (const q of lv("e.sound.swap", 1, "es")) {
      const [, w, old, neu] = /^(\S+)\. Cambia (\S+) por (\S+)\.$/.exec(q.prompt)!;
      const rest = w.toLowerCase().slice(old.length);
      expect(w.toLowerCase().startsWith(old), q.prompt).toBe(true);
      expect(key(q), q.prompt).toBe(neu + rest);
      const other = label(q, "wrong-new-sound");
      expect(other.endsWith(rest) && !other.startsWith(neu), `${q.prompt} ${other}`).toBe(true);
    }
    for (const locale of LOCALES)
      for (const q of lv("e.sound.swap", 2, locale)) {
        const [, old, w, neu] = /(?:the letter|la) (\S) (?:in|de) (\S+) (?:to|por) (\S)\.$/.exec(q.prompt)!;
        expect(w.split(old).length, `${q.prompt}: one ${old}`).toBe(2);
        expect(key(q), q.prompt).toBe(w.replace(old, neu));
        expect(label(q, "kept-old-letter"), q.prompt).toBe(w);
        expect(label(q, "wrong-new-letter").includes(neu), q.prompt).toBe(false);
      }
  });
});

describe("answer keys, checked another way (grade 1)", () => {
  it("segmenting: the key equals the sound count from spelling rules; letter counts are tagged", () => {
    const enUnits = (w: string) => (/[aeiou][^aeiou]e$/.test(w) ? w.slice(0, -1) : w).match(/sh|ch|th|ck|ng|ee|oo|oa|ai|ay|ea|ow|ey|oe|ll|gg|ss|./g)!.length;
    // Spanish: ch, ll, rr and qu are one sound each; h alone makes no sound.
    const esUnits = (w: string) => norm(w).replace(/(?<!c)h/g, "").match(/ch|ll|rr|qu|./g)!.length;
    for (const locale of LOCALES)
      for (const q of qs("e.segment.sounds", locale)) {
        const w = /(?:in|tiene) (\S+)\?$/.exec(q.prompt)![1];
        const n = locale === "en" ? enUnits(w) : esUnits(w);
        expect(Number(key(q)), q.prompt).toBe(n);
        for (const c of q.choices.slice(1)) expect(c.why === "counted-letters", `${w} ${c.label}`).toBe(Number(c.label) === w.length);
      }
  });
});

describe("answer keys, checked another way (sight words)", () => {
  // The Dolch lists, typed here separately from the banks.
  const DOLCH: Record<string, string> = {
    "e.sight.preprimer": "a and away big blue can come down find for funny go help here I in is it jump little look make me my not one play red run said see the three to two up we where yellow you",
    "e.sight.primer": "all am are at ate be black brown but came did do eat four get good have he into like must new no now on our out please pretty ran ride saw say she so soon that there they this too under want was well went what white who will with yes",
    "e.sight.grade1": "after again an any as ask by could every fly from give going had has her him his how just know let live may of old once open over put round some stop take thank them then think walk were when",
    "e.sight.grade2": "always around because been before best both buy call cold does don't fast first five found gave goes green its made many off or pull read right sing sit sleep tell their these those upon us use very wash which why wish work would write your",
  };
  const HOMOPHONES = [["to", "two", "too"], ["by", "buy", "bye"], ["one", "won"], ["for", "four"], ["see", "sea"], ["no", "know"], ["new", "knew"], ["our", "hour"], ["right", "write"], ["their", "there"], ["would", "wood"], ["which", "witch"], ["blue", "blew"], ["red", "read"], ["tu", "tú"], ["si", "sí"], ["el", "él"], ["mas", "más"], ["que", "qué"], ["se", "sé"], ["te", "té"], ["hay", "ay", "ahí"]];
  const soundsAlike = (a: string, b: string) => HOMOPHONES.some((h) => h.includes(a.toLowerCase()) && h.includes(b.toLowerCase()));
  const tagOf = (w: string, d: string) => {
    const [a, b] = [norm(w), norm(d)];
    if (a === b) return "accent-mixup";
    if (a === b.split("").reverse().join("")) return "reversed-letters";
    if (a.split("").sort().join() === b.split("").sort().join()) return "mixed-up-letters";
    return a[0] === b[0] && a[1] === b[1] ? "same-start" : "look-alike-word";
  };

  it("English keys come from the right Dolch list; Spanish bands do not repeat a key", () => {
    for (const id of SIGHT) for (const q of qs(id, "en")) expect(DOLCH[id].split(" "), `${id} ${key(q)}`).toContain(key(q).replace(/^\p{Lu}(?!$)/u, (c) => c.toLowerCase()));
    const seen = new Map<string, string>();
    for (const id of SIGHT)
      for (const k of new Set(qs(id, "es").map((q) => norm(key(q))))) {
        expect(seen.get(k) ?? id, `${k} is in ${seen.get(k)} and ${id}`).toBe(id);
        seen.set(k, id);
      }
  });

  it("level 1 says the word and shows none; level 2 has one blank and no sound-alike choices", () => {
    for (const id of SIGHT)
      for (const locale of LOCALES) {
        for (const q of lv(id, 1, locale)) {
          expect(q.say.endsWith(`: ${key(q)}.`), q.say).toBe(true);
          const shown = norm(q.prompt).split(/[\s.,]+/);
          for (const c of q.choices) expect(shown, `${q.prompt} shows ${c.label}`).not.toContain(norm(c.label));
          for (const c of q.choices.slice(1)) expect(soundsAlike(key(q), c.label), `${q.say} ${c.label}`).toBe(false);
        }
        for (const q of lv(id, 2, locale)) {
          expect(q.prompt.split("___").length, q.prompt).toBe(2);
          expect(q.steps[0], q.prompt).toBe(q.prompt.replace("___", key(q)));
        }
      }
  });

  it("every look-alike's tag says how it differs from the key", () => {
    for (const id of SIGHT)
      for (const locale of LOCALES)
        for (const q of qs(id, locale)) for (const c of q.choices.slice(1)) expect(c.why, `${key(q)} / ${c.label}`).toBe(tagOf(key(q), c.label));
  });
});

// ---- Reading patterns: every miss is re-derived from the key and the wrong word ----

const PAIRS = ["sh", "ch", "th", "wh", "ck", "ng", "ll", "rr"];
const TEAMS = ["ai", "ay", "ee", "ea", "oa", "ow", "oi", "oy", "ou", "au", "aw", "ew", "ue", "ua", "ui", "ie", "ia", "io", "ei", "eu", "oo", "ey", "uy"];
const isVowel = (c: string) => "aeiou".includes(c);
/** Every misconception a wrong word could show, worked out from the two spellings. */
function kinds(key: string, wrong: string): Set<string> {
  const [k, d] = [norm(key), norm(wrong)];
  const out = new Set<string>();
  for (let i = 0; i < k.length; i++) if (k.slice(0, i) + k.slice(i + 1) === d) out.add("dropped-letter");
  for (let i = 0; i + 1 < k.length; i++) if (k.slice(0, i) + k[i + 1] + k[i] + k.slice(i + 2) === d) out.add("swapped-letters");
  if (k.length === d.length) {
    const diff = [...k].map((c, i) => i).filter((i) => k[i] !== d[i]);
    if (diff.length === 1 && !isVowel(k[diff[0]]) && !isVowel(d[diff[0]])) out.add("wrong-consonant").add("wrong-blend");
  }
  if (frame(k) === frame(d) && vowels(k) !== vowels(d)) out.add("wrong-vowel");
  for (const g of TEAMS)
    for (let i = k.indexOf(g); i >= 0; i = k.indexOf(g, i + 1)) {
      const put = d.slice(i, d.length - (k.length - i - 2));
      if (d.startsWith(k.slice(0, i)) && d.endsWith(k.slice(i + 2)) && put !== g && TEAMS.includes(put)) out.add("wrong-team");
    }
  const R = ["ar", "or", "er", "ir", "ur"];
  for (const g of R)
    for (let i = k.indexOf(g); i >= 0; i = k.indexOf(g, i + 1)) {
      const put = d.slice(i, d.length - (k.length - i - 2));
      if (!d.startsWith(k.slice(0, i)) || !d.endsWith(k.slice(i + 2)) || put === g || !R.includes(put)) continue;
      out.add(["er", "ir", "ur"].includes(g) && ["er", "ir", "ur"].includes(put) ? "sound-alike-spelling" : "wrong-r-vowel");
    }
  for (let i = 0; i < k.length; i++) {
    if (k.slice(0, i + 1) + k[i] + k.slice(i + 1) === d) out.add("doubled-letter");
    if ("iy".includes(k[i]) && k.slice(0, i) + (k[i] === "i" ? "y" : "i") + k.slice(i + 1) === d) out.add("sound-alike-spelling");
  }
  if (k.length > 2 && (k.slice(0, -1) === d.slice(0, -1) || (d.startsWith(k) && d.length === k.length + 1))) out.add("wrong-ending");
  for (const g of PAIRS)
    for (let i = k.indexOf(g); i >= 0; i = k.indexOf(g, i + 1)) {
      const [before, after] = [k.slice(0, i), k.slice(i + 2)];
      if (!d.startsWith(before) || !d.endsWith(after)) continue;
      const put = d.slice(before.length, d.length - after.length);
      if (put.length === 1) out.add(g === "ll" && put === "y" ? "sound-alike-spelling" : "single-letter");
      if (put.length === 2 && put !== g && PAIRS.includes(put)) out.add("wrong-digraph");
    }
  return out;
}

describe("answer keys, checked another way (grade 1 reading)", () => {
  it("short vowels: misses differ from the key only in the vowel, or in one consonant", () => {
    for (const q of lv("e.short.vowels", 1, "en")) {
      expect(key(q), q.prompt).toMatch(/^[^aeiou][aeiou][^aeiou]$/);
      expect(q.picture && q.alt, q.prompt).toBeTruthy();
      expect(words(q.alt!), `${key(q)}: the alt names the answer`).not.toContain(norm(key(q)));
      for (const c of q.choices.slice(1)) expect(kinds(key(q), c.label).has(c.why!), `${key(q)} ${c.label} ${c.why}`).toBe(true);
    }
    for (const q of lv("e.short.vowels", 1, "es")) {
      const w = norm(q.say.split(".")[0]);
      expect(w.startsWith(norm(key(q))), q.say).toBe(true);
      expect(norm(key(q)), q.say).toMatch(/^[^aeiou][aeiou]$/);
      expect(norm(q.prompt.split(" ").at(-1)!.replace("___", key(q))), q.prompt).toBe(w);
      for (const c of q.choices.slice(1)) expect(c.why, `${w} ${c.label}`).toBe(c.label[0] === key(q)[0] ? "wrong-vowel" : "wrong-consonant");
    }
    for (const locale of LOCALES)
      for (const q of lv("e.short.vowels", 2, locale)) {
        const w = q.prompt.split(": ")[1];
        expect(q.choices[0].say, q.prompt).toBe(w);
        expect(q.steps.at(-1), q.prompt).toBe(`${w}: ${key(q)}`);
        for (const c of q.choices.slice(1)) {
          expect(c.say, q.prompt).not.toBe(w);
          expect(c.why, `${w} ${c.say}`).toBe(frame(c.say!) === frame(w) && c.say!.length === w.length ? "wrong-vowel" : "wrong-consonant");
        }
      }
  });

  it("letter pairs and blends, level 1: the key fills the gap to spell the spoken word; each fill's tag fits", () => {
    for (const id of READING)
      for (const locale of LOCALES)
        for (const q of lv(id, 1, locale)) {
          const w = q.say.split(".")[0].toLowerCase();
          const shown = q.prompt.split(" ").at(-1)!;
          expect(shown.replace("___", key(q)), q.prompt).toBe(w);
          for (const c of q.choices.slice(1)) {
            const made = shown.replace("___", c.label);
            expect(made, q.prompt).not.toBe(w);
            expect(kinds(w, made).has(c.why!), `${w} → ${made} (${c.why})`).toBe(true);
          }
          if (id === "e.digraphs") expect(PAIRS, q.prompt).toContain(key(q));
        }
  });

  it("letter pairs and blends, level 2: the key names the picture; each wrong word's tag fits", () => {
    for (const id of READING)
      for (const locale of LOCALES)
        for (const q of lv(id, 2, locale)) {
          expect(words(q.alt!), `${key(q)}: the alt names the answer`).not.toContain(norm(key(q)));
          for (const c of q.choices.slice(1)) expect(kinds(key(q), c.label).has(c.why!), `${key(q)} → ${c.label} (${c.why})`).toBe(true);
        }
  });
});

describe("answer keys, checked another way (silent letters and endings)", () => {
  const noH = (w: string) => norm(w).replace(/(?<!c)h/g, "");
  /** Spellings that sound the same in Spanish: hue/güe, hie/ye, c/s before e, hay/ay/ahí. */
  const soundsSame = (a: string, b: string) => {
    const say = (w: string) => noH(w).replace(/^ue/, "gue").replace(/^ie/, "ye").replace(/ce/g, "se").replace(/v/g, "b").replace(/^ay$|^ai$/, "ai");
    return say(a) === say(b) || [["hay", "ay", "ahi"]].some((g) => g.includes(norm(a)) && g.includes(norm(b)));
  };

  it("silent e and silent h: each tag matches how the wrong spelling differs", () => {
    for (const locale of LOCALES)
      for (const level of [1, 2])
        for (const q of lv("e.silent.e", level, locale))
          for (const c of q.choices.slice(1)) {
            const [k, d] = [key(q), c.label];
            const where = `${k} → ${d} (${c.why})`;
            if (locale === "en" && c.why === "dropped-silent-letter") expect(d, where).toBe(k.replace(/e$/, ""));
            else if (locale === "en" && c.why === "added-silent-letter") expect(d, where).toBe(`${k}e`);
            else if (c.why === "dropped-silent-letter") expect(norm(d), where).toBe(noH(k));
            else if (c.why === "added-silent-letter") expect(noH(d), where).toBe(norm(k));
            else if (c.why === "h-as-j") expect(norm(d), where).toBe(norm(k).replace("h", "j"));
            else if (c.why === "sound-alike-spelling") expect(soundsSame(k, d), where).toBe(true);
            else if (c.why === "wrong-ending") expect(norm(d).startsWith(norm(k)), where).toBe(true);
            else expect(kinds(k, d).has(c.why!), where).toBe(true);
          }
    for (const q of lv("e.silent.e", 1, "es")) expect(norm(key(q)), q.alt).toContain("h");
  });

  it("-ed sounds follow the last sound of the base word", () => {
    const edSound = (w: string) => {
      const stem = w.slice(0, -2);
      if (/[td]$/.test(stem)) return "id";
      return /([pkfsx]|sh|ch|gh)$/.test(stem) ? "t" : "d";
    };
    const TAG: Record<string, string> = { t: "ed-as-t", d: "ed-as-d", id: "ed-as-extra-syllable" };
    for (const q of lv("e.ending.ed", 1, "en")) {
      const t = /sound as (\S+)\?$/.exec(q.prompt)![1];
      expect(edSound(key(q)), q.prompt).toBe(edSound(t));
      for (const c of q.choices.slice(1)) expect(c.why, `${t} ${c.label}`).toBe(TAG[edSound(c.label)]);
      expect(new Set(q.choices.map((c) => edSound(c.label))).size, q.prompt).toBe(3);
    }
    for (const q of lv("e.ending.ed", 1, "es")) {
      const t = norm(/que (\S+)\?$/.exec(q.prompt)![1]);
      const end = (w: string) => norm(w).slice(-3);
      expect(end(key(q)), q.prompt).toBe(end(t));
      expect(["ado", "ido"], t).toContain(end(t));
      expect(end(label(q, "other-participle-ending")), q.prompt).toBe(end(t) === "ado" ? "ido" : "ado");
      expect(norm(label(q, "gerund-ending")).endsWith("ndo"), q.prompt).toBe(true);
    }
  });

  it("-ed and -ing spellings follow the spelling rules; each wrong spelling's tag fits", () => {
    const doubles = (b: string) => /^[^aeiou]*[aeiou][^aeiouwxy]$/.test(b);
    const ed = (b: string) => (b.endsWith("e") ? `${b}d` : /[^aeiou]y$/.test(b) ? `${b.slice(0, -1)}ied` : doubles(b) ? `${b}${b.at(-1)}ed` : `${b}ed`);
    const ing = (b: string) => (/[^e]e$/.test(b) ? `${b.slice(0, -1)}ing` : doubles(b) ? `${b}${b.at(-1)}ing` : `${b}ing`);
    for (const [id, end, make] of [["e.ending.ed", "ed", ed], ["e.ending.ing", "ing", ing]] as const)
      for (const level of id === "e.ending.ed" ? [2] : [1, 2])
        for (const q of lv(id, level, "en")) {
          const base = q.prompt.split(" + ")[0];
          expect(key(q), q.prompt).toBe(make(base));
          for (const c of q.choices.slice(1)) {
            const d = c.label;
            const why = {
              "did-not-double": d === base + end && doubles(base),
              "doubled-wrongly": !doubles(base) && (d === base + base.at(-1) + end || d === base.replace(/e$/, "") + base.replace(/e$/, "").at(-1) + end),
              "kept-silent-e": base.endsWith("e") && d === base + end,
              "kept-y": /[^aeiou]y$/.test(base) && d === base + end,
              "changed-y-wrongly": base.endsWith("y") && d.includes("i") && !key(q).includes(`${base.slice(0, -1)}i`),
              "spelled-by-sound": !d.endsWith(end),
              "dropped-g": d === key(q).slice(0, -1),
              "dropped-letter": kinds(key(q), d).has("dropped-letter") || kinds(base, d.slice(0, -end.length)).has("dropped-letter"),
            }[c.why!];
            expect(why, `${base}: ${d} (${c.why})`).toBe(true);
          }
        }
  });

  it("Spanish participles and gerunds match the tables; each wrong form's tag fits", () => {
    const PARTICIPLE: Record<string, string> = { escribir: "escrito", abrir: "abierto", romper: "roto", poner: "puesto", hacer: "hecho", ver: "visto", decir: "dicho", volver: "vuelto", cubrir: "cubierto" };
    const GERUND: Record<string, string> = {
      dormir: "durmiendo", pedir: "pidiendo", decir: "diciendo", venir: "viniendo", leer: "leyendo", oir: "oyendo", caer: "cayendo", traer: "trayendo",
      construir: "construyendo", ir: "yendo", sentir: "sintiendo", servir: "sirviendo", seguir: "siguiendo", elegir: "eligiendo", reir: "riendo", repetir: "repitiendo",
    };
    const regular = (inf: string, ar: string, erir: string) => inf.slice(0, -2) + (inf.endsWith("ar") ? ar : erir);
    for (const q of lv("e.ending.ed", 2, "es")) {
      const inf = /\((\S+)\)$/.exec(q.prompt)![1];
      expect(norm(key(q)), inf).toBe(PARTICIPLE[inf] ?? regular(inf, "ado", "ido"));
      for (const c of q.choices.slice(1)) {
        const d = norm(c.label);
        const ok = {
          "ado-for-ido": !inf.endsWith("ar") && d === inf.slice(0, -2) + "ado",
          "ido-for-ado": inf.endsWith("ar") && d === inf.slice(0, -2) + "ido",
          "regular-for-irregular": !!PARTICIPLE[inf] && d === inf.slice(0, -2) + "ido",
          "gerund-for-participle": d.endsWith("ndo"),
        }[c.why!];
        expect(ok, `${inf}: ${d} (${c.why})`).toBe(true);
      }
    }
    for (const level of [1, 2])
      for (const q of lv("e.ending.ing", level, "es")) {
        const inf = norm(/\((\S+)\)$/.exec(q.prompt)![1]);
        const want = GERUND[inf] ?? regular(inf, "ando", "iendo");
        expect(norm(key(q)), inf).toBe(want);
        expect(!!GERUND[inf], `${inf} on level ${level}`).toBe(level === 2);
        for (const c of q.choices.slice(1)) {
          const d = norm(c.label);
          const ok = {
            "wrong-ending": d === inf.slice(0, -2) + (inf.endsWith("ar") ? "iendo" : "ando"),
            "participle-for-gerund": /(ado|ido|to|cho)$/.test(d),
            "no-stem-change": d === inf.slice(0, -2) + "iendo" && !want.includes("yendo"),
            "i-for-y": d === inf.slice(0, -2) + "iendo" && want.includes("yendo"),
          }[c.why!];
          expect(ok, `${inf}: ${d} (${c.why})`).toBe(true);
        }
      }
  });
});

describe("answer keys, checked another way (grade 2 reading)", () => {
  /** How a Spanish spelling sounds (Latin American): qu/k, ce ci z s, ge gi j, b v, silent h. */
  const esSound = (w: string) =>
    norm(w)
      .replace(/qu(?=[ei])/g, "k")
      .replace(/gu(?=[ei])/g, "G")
      .replace(/g(?=[ei])/g, "j")
      .replace(/c(?=[ei])/g, "s")
      .replace(/c(?!h)/g, "k")
      .replace(/z/g, "s")
      .replace(/v/g, "b")
      .replace(/(?<!c)h/g, "")
      .replace(/G/g, "g");
  /** How an English spelling sounds, for soft c and g only. */
  const enSoft = (w: string) => w.replace(/dge/g, "je").replace(/c(?=[eiy])/g, "s").replace(/g(?=[eiy])/g, "j");

  it("vowels with r and diphthongs: gaps spell the spoken word; every miss is tagged by how it differs", () => {
    for (const id of ["e.r.controlled", "e.diphthongs"])
      for (const locale of LOCALES) {
        for (const q of lv(id, 1, locale)) {
          const w = q.say.split(".")[0].toLowerCase();
          const shown = q.prompt.split(" ").at(-1)!;
          expect(shown.replace("___", key(q)), q.prompt).toBe(w);
          for (const c of q.choices.slice(1)) expect(kinds(w, shown.replace("___", c.label)).has(c.why!), `${w}: ${c.label} (${c.why})`).toBe(true);
        }
        for (const q of lv(id, 2, locale)) {
          if (q.alt) expect(words(q.alt), `${key(q)}: the alt names the answer`).not.toContain(norm(key(q)));
          else expect(q.steps[0], q.prompt).toBe(q.prompt.replace("___", key(q)));
          for (const c of q.choices.slice(1)) expect(kinds(key(q), c.label).has(c.why!), `${key(q)}: ${c.label} (${c.why})`).toBe(true);
        }
      }
    // Spanish r: one r at the start of a word is strong, so it is never doubled there.
    for (const q of lv("e.r.controlled", 1, "es")) if (q.prompt.split(" ").at(-1)!.startsWith("___")) expect(key(q), q.prompt).toBe("r");
  });

  it("soft c and g: the read word's letter and the key picture start with the same sound", () => {
    const EN_FIRST: Record<string, string> = {
      sun: "s", sock: "s", seal: "s", saw: "s", sea: "s", kite: "k", key: "k", cat: "k", cow: "k", car: "k", cake: "k",
      jet: "j", jeans: "j", juice: "j", goat: "g", gift: "g", game: "g", girl: "g", guitar: "g", gorilla: "g",
    };
    const enRead = (w: string) => (w[0] === "c" ? (/^c[eiy]/.test(w) ? "s" : "k") : /^g[eiy]/.test(w) ? "j" : "g");
    const EN_TAG: Record<string, string> = { s: "hard-for-soft", j: "hard-for-soft", k: "soft-for-hard", g: "soft-for-hard" };
    const ES_TAG: Record<string, string> = { s: "k-sound-for-s", k: "s-sound-for-k", j: "g-sound-for-j", g: "j-sound-for-g" };
    for (const locale of LOCALES)
      for (const q of lv("e.soft.c.g", 1, locale)) {
        const w = /: (\S+)\./.exec(q.prompt)![1];
        const first = (x: string) => (locale === "en" ? EN_FIRST[x] : esSound(x)[0]);
        const sound = locale === "en" ? enRead(w) : esSound(w)[0];
        expect(first(key(q)), `${w} → ${key(q)}`).toBe(sound);
        const near = q.choices[1];
        expect(first(near.label), `${w} → ${near.label}`).not.toBe(sound);
        expect(near.why, `${w} → ${near.label}`).toBe((locale === "en" ? EN_TAG : ES_TAG)[sound]);
        expect(first(q.choices[2].label), `${w} → ${q.choices[2].label}`).not.toBe(sound);
      }
    for (const locale of LOCALES)
      for (const q of lv("e.soft.c.g", 2, locale))
        for (const c of q.choices.slice(1)) {
          const [k, d] = [key(q), c.label];
          const where = `${k}: ${d} (${c.why})`;
          if (c.why === "sound-alike-spelling") expect(locale === "en" ? enSoft(k) === d : esSound(k) === esSound(d), where).toBe(true);
          else if (c.why === "hard-for-soft") expect([k.replace(/c(?=[eiy])/, "k"), k.replace(/g(?=[eiy])/, "gu")], where).toContain(d);
          else if (c.why === "k-sound-for-s") expect(d, where).toBe(k.replace(/c(?=[eiy])/, "k"));
          else if (c.why === "g-sound-for-j") expect([k.replace(/g(?=[eiy])/, "gu"), k.replace(/j/, "gu")], where).toContain(d);
          else if (c.why === "s-sound-for-k") expect([k.replace(/c(?=[aou])/, "s"), k.replace(/qu/, "c")], where).toContain(d);
          else if (c.why === "j-sound-for-g") expect(d, where).toBe(k.replace(/gu(?=[ei])/, "g"));
          else expect(kinds(k, d).has(c.why!), where).toBe(true);
        }
  });

  it("silent letters: the dropped letter is one you do not hear; the u of que, gue and the dieresis follow the rule", () => {
    const SILENT: Record<string, string> = { knot: "k", write: "w", wrench: "w", thumb: "b", climb: "b", lamb: "b", castle: "t", ghost: "h", island: "s", scissors: "c", rhino: "h", two: "w", walk: "l" };
    const SAME: Record<string, string> = { sign: "sine", castle: "cassle", rhino: "rhyno", eight: "ate" };
    for (const q of lv("e.silent.letters", 1, "en"))
      for (const c of q.choices.slice(1)) {
        const [k, d] = [key(q), c.label];
        if (c.why === "dropped-silent-letter") expect(d, k).toBe(k.replace(SILENT[k], ""));
        else if (c.why === "sound-alike-spelling") expect(SAME[k], k).toBe(d);
        else expect(kinds(k, d).has(c.why!), `${k}: ${d} (${c.why})`).toBe(true);
      }
    for (const q of lv("e.silent.letters", 1, "es")) {
      const k = key(q);
      expect(/(qu|gu|gü)[eiéí]/.test(k), k).toBe(true);
      for (const c of q.choices.slice(1)) {
        const d = c.label;
        const where = `${k}: ${d} (${c.why})`;
        if (c.why === "dropped-silent-letter") expect([k.replace(/(?<=[qg])u(?=[eiéí])/, ""), k.replace(/^h/, "")], where).toContain(d);
        else if (c.why === "sound-alike-spelling") expect(esSound(d), where).toBe(esSound(k));
        else if (c.why === "missing-dieresis") expect(d, where).toBe(k.replace("ü", "u"));
        else if (c.why === "added-dieresis") expect(d, where).toBe(k.replace("gu", "gü"));
        else expect(kinds(k, d).has(c.why!), where).toBe(true);
      }
    }
  });
});

describe("answer keys, checked another way (grade 2 word study)", () => {
  it("compound words: the key joins the two words; each miss changes the part its tag names", () => {
    // Spanish compounds that change a letter when joined, typed here separately.
    const ES_JOINED: Record<string, string> = { "para+aguas": "paraguas", "tela+araña": "telaraña", "pelo+rojo": "pelirrojo", "arco+iris": "arcoíris", "alta+voz": "altavoz", "balón+cesto": "baloncesto" };
    for (const locale of LOCALES)
      for (const q of lv("e.compound.words", 1, locale)) {
        const [a, b] = q.prompt.replace(" = ___", "").split(" + ");
        expect(key(q), q.prompt).toBe(locale === "es" ? (ES_JOINED[`${a}+${b}`] ?? a + b) : a + b);
        for (const c of q.choices.slice(1)) {
          const d = c.label;
          const ok = {
            "wrong-first-word": d.endsWith(b) && !d.startsWith(a),
            "wrong-last-word": d.startsWith(a) && !d.endsWith(b),
            "one-part-only": [a, b, norm(b).replace(/s$/, "")].includes(norm(d)),
            "reversed-parts": d === b + a,
            "no-spelling-change": d === a + b && d !== key(q),
            "kept-accent": d === a + b && /[áéíóú]/.test(a),
          }[c.why!];
          expect(ok, `${a} + ${b}: ${d} (${c.why})`).toBe(true);
        }
      }
    for (const locale of LOCALES)
      for (const q of lv("e.compound.words", 2, locale)) {
        const [a, b] = q.steps[0].split(":")[0].split(" + ");
        const stem = (w: string) => norm(w).slice(0, 4);
        const head = locale === "en" ? b : b;
        expect(norm(key(q)), q.prompt).toContain(stem(head).slice(0, 3));
        expect(norm(label(q, "reversed-meaning")), q.prompt).toContain(stem(locale === "en" ? a : b).slice(0, 3));
        expect(label(q, "one-part-only").startsWith(locale === "en" ? `a kind of ${a}` : "un tipo de"), q.prompt).toBe(true);
      }
  });

  it("syllable splits match the dictionary; each wrong split is tagged by where it goes wrong", () => {
    const DICTIONARY =
      "rab-bit nap-kin bas-ket kit-ten mit-ten pup-pet sun-set muf-fin pic-nic hel-met tab-let in-sect pen-cil mag-net den-tist but-ton " +
      "ti-ger ro-bot pa-per mu-sic ba-by spi-der ze-ro ba-con cab-in lem-on wag-on sev-en cam-el ta-ble can-dle puz-zle " +
      "pe-lo-ta ca-mi-sa to-ma-te za-pa-to pa-lo-ma gu-sa-no co-ne-jo pe-pi-no ma-le-ta le-chu-ga mu-ñe-ca ca-ba-llo co-me-ta he-la-do cu-cha-ra ba-na-na " +
      "li-bro cua-der-no es-tre-lla a-vión ca-mión puer-ta ti-gre a-bra-zo bi-ci-cle-ta ven-ta-na can-ción dien-tes san-dí-a rí-o pa-ís hor-mi-ga";
    const right = new Map(DICTIONARY.split(" ").map((x) => [x.replace(/-/g, ""), x]));
    const cuts = (x: string) => [...x].reduce<number[]>((acc, ch, i) => (ch === "-" ? [...acc, i - acc.length] : acc), []);
    const V = (ch: string) => "aeiouáéíóú".includes(ch);
    for (const locale of LOCALES)
      for (const level of [1, 2])
        for (const q of lv("e.syllable.split", level, locale)) {
          const w = /(?:does|separa) (\S+) (?:split|en)/.exec(q.prompt)![1];
          expect(key(q), w).toBe(right.get(w));
          const good = cuts(key(q));
          for (const c of q.choices.slice(1)) {
            const bad = cuts(c.label);
            const where = `${w}: ${c.label} (${c.why})`;
            expect(c.label.replace(/-/g, ""), where).toBe(w);
            const at = bad.find((x) => !good.includes(x));
            const left = (x: number) => w[x - 1], rightOf = (x: number) => w[x];
            const ok = {
              "split-too-early": at !== undefined && at < good[bad.indexOf(at)],
              "split-too-late": at !== undefined && at > good[bad.indexOf(at)],
              "closed-for-open": bad.length === 1 && bad[0] === good[0] + 1 && V(w[good[0] - 1]),
              "open-for-closed": bad.length === 1 && bad[0] === good[0] - 1 && V(w[bad[0] - 1]),
              "missed-a-syllable": bad.length < good.length && bad.every((x) => good.includes(x)) && !good.some((x) => !bad.includes(x) && V(left(x)) && V(rightOf(x))),
              "split-letter-pair": at !== undefined && ["ch", "ll", "rr"].includes(w.slice(at - 1, at + 1)),
              "split-blend": at !== undefined && /^[bcdfgpt][lr]$/.test(w.slice(at - 1, at + 1)),
              "split-diphthong": at !== undefined && V(left(at)) && V(rightOf(at)),
              "joined-hiatus": good.some((x) => !bad.includes(x) && V(left(x)) && V(rightOf(x))),
            }[c.why!];
            expect(ok, where).toBe(true);
          }
        }
  });

  it("syllable types follow the spelling rules; Spanish stress follows the accent rules", () => {
    const type = (s: string) =>
      /[^aeiou]le$/.test(s) ? "consonant-le" : /[aeiou]r/.test(s) ? "r-controlled" : /(ai|ay|ee|ea|oa|ow|oe|oi|oy|ou)/.test(s) ? "vowel team" : /[aeiou][^aeiou]e$/.test(s) ? "silent e" : /[aeiou]$/.test(s) ? "open" : "closed";
    for (const level of [1, 2])
      for (const q of lv("e.syllable.types", level, "en")) {
        const s = q.steps[0].split(":")[0];
        expect(key(q), s).toBe(type(s));
        for (const c of q.choices.slice(1)) expect(c.why, s).toBe(`${key(q).replace(" ", "-")}-as-${c.label.replace(" ", "-")}`);
      }
    // Stressed syllables, typed here separately.
    const STRONG: Record<string, string> = {
      pelota: "lo", zapato: "pa", ventana: "ta", tomate: "ma", camisa: "mi", helado: "la", sábado: "sá", música: "mú",
      pájaro: "pá", plátano: "plá", corazón: "zón", jabalí: "lí", colibrí: "brí", autobús: "bús", cámara: "cá", brújula: "brú",
    };
    for (const q of lv("e.syllable.types", 1, "es")) {
      const w = /de (\S+)\?$/.exec(q.prompt)![1];
      expect(key(q), w).toBe(STRONG[w]);
      const parts = q.steps[0].split("-");
      const names = ["stress-on-first", "stress-on-middle", "stress-on-last"];
      for (const c of q.choices.slice(1)) expect(c.why, `${w} ${c.label}`).toBe(names[parts.indexOf(c.label)]);
    }
    const KIND: Record<string, string> = {
      corazón: "aguda", reloj: "aguda", papel: "aguda", ratón: "aguda", ciudad: "aguda", pelota: "llana", árbol: "llana", lápiz: "llana",
      mesa: "llana", fácil: "llana", sábado: "esdrújula", música: "esdrújula", pájaro: "esdrújula", teléfono: "esdrújula", murciélago: "esdrújula", cámara: "esdrújula",
    };
    for (const q of lv("e.syllable.types", 2, "es")) {
      const w = norm(q.prompt.split(":")[0]);
      const entry = Object.entries(KIND).find(([k]) => norm(k) === w)!;
      expect(key(q), w).toBe(entry[1]);
      // Accent rules: a written accent on the last syllable, or none and ending in a consonant other than n or s, is aguda.
      const word = entry[0];
      const last = q.steps[0].split(":")[0].split("-");
      const strong = /[áéíóú]/.test(word) ? last.findIndex((p) => /[áéíóú]/.test(p)) : /[aeiouns]$/.test(word) ? last.length - 2 : last.length - 1;
      expect(["aguda", "llana", "esdrújula"][last.length - 1 - strong], w).toBe(key(q));
    }
  });
});

describe("answer keys, checked another way (y as a vowel)", () => {
  /** English: y at the start is a consonant; at the end of a one-syllable word it says long i, else long e. */
  const ySound = (w: string) => (w.startsWith("y") ? "y" : w === "butterfly" || !/[aeiou]/.test(w.slice(0, -1)) ? "i" : "e");
  it("English: the key ends with the target's y sound; wrong sounds are tagged", () => {
    const TAG: Record<string, string> = { i: "y-as-long-i", e: "y-as-long-e", y: "y-as-consonant" };
    for (const q of lv("e.y.vowel", 1, "en")) {
      const t = /sound as (\S+)\?$/.exec(q.prompt)![1];
      expect(ySound(key(q)), q.prompt).toBe(ySound(t));
      for (const c of q.choices.slice(1)) expect(c.why, `${t} ${c.label}`).toBe(TAG[ySound(c.label)]);
    }
    const NAME: Record<string, string> = { i: "long-i", e: "long-e", y: "consonant" };
    for (const q of lv("e.y.vowel", 2, "en")) {
      const w = /in (\S+)\?$/.exec(q.prompt)![1];
      expect(key(q)[0], w).toBe(ySound(w));
      for (const c of q.choices.slice(1)) expect(c.why, `${w} ${c.label}`).toBe(`${NAME[ySound(w)]}-as-${NAME[c.label[0]]}`);
    }
  });

  it("Spanish: y at the end sounds like i; inside, the i sound is written i; each wrong spelling is tagged", () => {
    for (const q of lv("e.y.vowel", 1, "es")) {
      const w = /en (\S+)\?$/.exec(q.prompt)![1];
      expect(key(q), w).toBe(w.endsWith("y") ? "como la vocal i" : "como en yo");
    }
    for (const q of lv("e.y.vowel", 2, "es")) {
      const k = key(q);
      expect(/y$/.test(k) || /i/.test(k.replace(/y/g, "")) || /y[aeiou]/.test(k), k).toBe(true);
      for (const c of q.choices.slice(1)) {
        const d = c.label;
        const ok = {
          "i-for-y": d === k.replace("y", "i"),
          "y-for-i": d === k.replace("i", "y"),
          "ll-for-y": d === k.replace("y", "ll"),
          "dropped-letter": kinds(k, d).has("dropped-letter"),
          "dropped-silent-letter": d === k.replace(/^h/, ""),
          "wrong-consonant": kinds(k, d).has("wrong-consonant"),
        }[c.why!];
        expect(ok, `${k}: ${d} (${c.why})`).toBe(true);
      }
    }
  });
});

// ---- Checks for the content audit (docs/handoff/content-audits.json, "eng-phonics") ----

describe("content audit: items a child could answer right and be marked wrong", () => {
  it("English items carry no Spanish text (the silent-h hint once reached English hand)", () => {
    const SPANISH = /[ñáéíóú¿¡]|\b(los|las|una|suena|escribe|sonido|palabra|que|del|dibujo|letra)\b/i;
    for (const [id] of TABLE) for (const q of qs(id, "en")) for (const s of strings(q)) expect(s, `${id}: ${s}`).not.toMatch(SPANISH);
  });

  it("a spelling question points to the picture, or says the word in a sentence with a blank", () => {
    let seen = 0;
    for (const [id] of TABLE)
      for (const locale of LOCALES)
        for (const q of qs(id, locale)) {
          if (!/spelled right|bien escrit/.test(q.prompt)) continue;
          seen++;
          if (q.picture) expect(q.prompt, `${id} ${q.prompt}`).toMatch(/picture|dibujo/);
          else expect(q.prompt.split("___").length, `${id} ${q.prompt}`).toBe(2);
          // Some keys are not the picture's own name (rey on a crown, lamb on a sheep), so the item says "goes with".
          for (const s of [q.prompt, q.say, ...q.hints, ...q.steps]) expect(s, `${id} ${q.prompt}`).not.toMatch(/names the picture|picture's name|nombre del dibujo/);
        }
    expect(seen).toBeGreaterThan(80);
  });

  it("Spanish y spelling: no wrong spelling is another Spanish word that would sound right", () => {
    const REAL = ["re", "le", "esto", "do", "so", "mu", "are", "rallo", "mallo", "ayo", "oye", "sol", "res", "mus", "vos", "dos", "sor", "malo", "mago", "raso"];
    // English words a bilingual child knows.
    const ENGLISH = ["my", "boy", "toy", "ray", "hey", "may", "day", "say", "lay", "die", "lie"];
    for (const q of lv("e.y.vowel", 2, "es"))
      for (const c of q.choices.slice(1)) expect([...REAL, ...ENGLISH], `${key(q)}: ${c.label}`).not.toContain(norm(c.label));
  });

  it("Spanish y spelling: every wrong spelling reads aloud as Spanish, so hint 1 (they sound alike) is true", () => {
    for (const q of lv("e.y.vowel", 2, "es")) {
      expect(q.hints[0]).toBe("Todas suenan parecido. Mira la i y la y.");
      for (const c of q.choices.slice(1)) {
        // No y after a consonant (ry, myo), and every word has a vowel.
        expect(c.label, `${key(q)}: ${c.label}`).not.toMatch(/[^aeiouy]y/);
        expect(c.label, `${key(q)}: ${c.label}`).toMatch(/[aeiou]/);
      }
    }
  });

  it("Spanish y spelling: a sentence that opens with the word is said and shown with a capital", () => {
    for (const q of lv("e.y.vowel", 2, "es")) {
      expect(q.steps[0], q.prompt).toMatch(/^\p{Lu}/u);
      expect(q.say, q.prompt).toMatch(/^\p{Lu}/u);
    }
  });

  it("a heard gap never offers a fill that sounds like the word unless it asks for the spelling; hint 3 says which", () => {
    // Spanish, the whole word as said in America: rr and r sound alike except between two vowels (rrata,
    // cerrdo); n before b, v, p or m says m (imvierno); b and v, s and z or soft c, ll and y sound alike;
    // h is silent.
    const esHeard = (w: string) =>
      norm(w)
        .replace(/(?<![aeiou])rr|rr(?![aeiou])/g, "r")
        .replace(/n(?=[bvpm])/g, "m")
        .replace(/v/g, "b")
        .replace(/z|c(?=[ei])/g, "s")
        .replace(/ll/g, "y")
        .replace(/(?<!c)h/g, "");
    expect(["cerrdo", "imvierno", "rrata"].map(esHeard)).toEqual(["cerdo", "invierno", "rata"].map(esHeard));
    expect(esHeard("perro")).not.toBe(esHeard("pero"));
    // Spellings that say the same sound in the same place. ow is in two groups (snow, cow).
    const SAME = [["ai", "ay"], ["ee", "ea"], ["oa", "ow"], ["oi", "oy"], ["ou", "ow"], ["er", "ir", "ur"], ["ei", "ey"], ["wh", "w"], ["ck", "k", "c"], ["ll", "y"]];
    const GAPS: [string, number][] = [...READING.map((id): [string, number] => [id, 1]), ["e.r.controlled", 1], ["e.diphthongs", 1]];
    for (const [id, level] of GAPS)
      for (const locale of LOCALES)
        for (const q of lv(id, level, locale)) {
          const shown = q.prompt.split(" ").at(-1)!;
          const k = key(q);
          const soundsLike = (fill: string) =>
            SAME.some((g) => g.includes(k) && g.includes(fill)) ||
            // Spanish: a word starts with a strong r, so rr there sounds just like r.
            (locale === "es" && k === "r" && fill === "rr" && shown.startsWith("___")) ||
            (locale === "es" && esHeard(shown.replace("___", fill)) === esHeard(shown.replace("___", k))) ||
            // English: one vowel left at the end of a word says its name (be, sno), like the team.
            (locale === "en" && /^[aeiou]{2}$/.test(k) && /^[aeiou]$/.test(fill) && shown.endsWith("___"));
          const same = q.choices.slice(1).map((c) => soundsLike(c.label));
          const where = `${id} ${locale} ${q.prompt}`;
          expect(/spell it right|se escribe bien/.test(q.prompt), where).toBe(same.includes(true));
          expect(/sounds the same|suena igual/.test(q.hints[2]), `${where}: ${q.hints[2]}`).toBe(same[0]);
        }
  });

  it("vowel teams, level 2: a dropped letter never leaves the vowel at the end, where it reads as the key (be, sno)", () => {
    for (const q of lv("e.vowel.teams", 2, "en"))
      for (const c of q.choices.slice(1)) if (c.why === "dropped-letter") expect(c.label, key(q)).toMatch(/[^aeiou]$/);
  });

  it("pre-primer Spanish does not test the written accent (tu / tú, se / sé), a grade 2–3 lesson", () => {
    for (const q of qs("e.sight.preprimer", "es")) for (const c of q.choices.slice(1)) expect(c.why, `${key(q)} / ${c.label}`).not.toBe("accent-mixup");
  });
});

describe("content audit: hints, pictures and speech", () => {
  it("no hint names the answer, except a hint 2 rule that names the choices it decides between", () => {
    // Category answers (syllable types, letter shapes, sound counts) are named by the rule itself.
    const CATEGORY = ["e.syllable.types", "e.letter.names", "e.segment.sounds"];
    // Accents kept: a hint may name a look-alike that differs only by one (pinguino for pingüino).
    const phrase = (s: string) => ` ${s.toLowerCase().split(/[^\p{L}\d]+/u).filter(Boolean).join(" ")} `;
    for (const [id] of TABLE) {
      if (CATEGORY.includes(id)) continue;
      for (const locale of LOCALES)
        for (const q of qs(id, locale)) {
          if (norm(key(q)).length < 3) continue;
          for (const [i, h] of q.hints.entries()) {
            const named = q.choices.filter((c) => phrase(h).includes(phrase(c.label)));
            if (i === 1 && named.length >= 2) continue;
            expect(phrase(h), `${id} ${locale} ${key(q)}: ${h}`).not.toContain(phrase(key(q)));
          }
        }
    }
  });

  it("letter names, level 1: hints never show the target letter's shape", () => {
    for (const locale of LOCALES)
      for (const q of lv("e.letter.names", 1, locale)) for (const h of q.hints) expect(h.split(/[^\p{L}]+/u), `${key(q)}: ${h}`).not.toContain(key(q));
  });

  it("a picture's alt never names an answer the item does not already say", () => {
    for (const [id] of TABLE)
      for (const locale of LOCALES)
        for (const q of qs(id, locale)) {
          if (!q.alt) continue;
          const k = norm(key(q));
          if (k.length < 3 || words(q.say).includes(k) || words(q.prompt).includes(k)) continue;
          expect(words(q.alt), `${id} ${locale} ${key(q)}: ${q.alt}`).not.toContain(k);
        }
  });

  it("speech never has to say a lone function word: blend rimes are content words; swaps name the letter", () => {
    const WEAK = ["a", "an", "at", "up", "in", "it", "on", "and", "as", "am", "all", "of", "to", "is"];
    for (const q of lv("e.blend.onset", 1, "en")) expect(WEAK, q.prompt).not.toContain(/Then add (\S+)\.$/.exec(q.prompt)![1]);
    for (const q of lv("e.sound.swap", 2, "en")) expect(q.say, q.say).toMatch(/^Change the letter \S in /);
  });

  it("Spanish text has none of the words that are vulgar in some countries", () => {
    const VULGAR = ["pito", "guevo", "güevo", "poto", "puto", "culo", "verga", "polla", "coño", "pija", "pinga", "chocho", "porro"];
    for (const [id] of TABLE)
      for (const locale of LOCALES)
        for (const q of qs(id, locale)) for (const s of strings(q)) for (const w of words(s)) expect(VULGAR, `${id} ${locale}: ${s}`).not.toContain(w);
  });

  it("sight words, level 2: hint 2 points to the meaning and hint 3 says the wrong fill means nothing", () => {
    for (const id of SIGHT)
      for (const locale of LOCALES)
        for (const q of lv(id, 2, locale)) {
          expect(q.hints[1], `${id} ${locale}`).toMatch(/meaning|quiere decir/);
          expect(q.hints[2], `${id} ${locale}`).toMatch(/makes no sense\.$|no quiere decir nada\.$/);
        }
  });

  it("Spanish compounds, level 2: hint 2 reads them as verb + the thing it acts on (a lavaplatos washes plates)", () => {
    for (const q of lv("e.compound.words", 2, "es")) {
      expect(q.hints[1]).toMatch(/a qué cosa/);
      expect(q.hints[1]).not.toMatch(/con qué/);
    }
  });

  it("Spanish participles: hint 2's irregular example has only one participle (not freír: freído and frito)", () => {
    const TWO = ["freir", "frito", "freido", "imprimir", "impreso", "imprimido", "proveer", "provisto", "proveido"];
    for (const q of qs("e.ending.ed", "es")) for (const w of words(q.hints[1])) expect(TWO, q.hints[1]).not.toContain(w);
  });

  it("Spanish middle vowels: a matched-consonants near miss keeps the consonants as heard (boca is not bici)", () => {
    const heard = (w: string) =>
      norm(w)
        .replace(/qu(?=[ei])/g, "k")
        .replace(/c(?=[ei])/g, "s")
        .replace(/c/g, "k")
        .replace(/z/g, "s")
        .replace(/v/g, "b")
        .replace(/ll/g, "y")
        .replace(/h/g, "")
        .replace(/[aeiou]/g, "");
    for (const q of lv("e.middle.vowel", 1, "es")) {
      const t = /que (\S+)\?$/.exec(q.prompt)![1];
      for (const c of q.choices.slice(1)) if (c.why === "matched-consonants") expect(heard(c.label), `${t} ${c.label}`).toBe(heard(t));
    }
  });
});
