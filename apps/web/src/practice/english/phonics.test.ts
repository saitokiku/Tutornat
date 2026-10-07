import { describe, expect, it } from "vitest";
import { check } from "../answer";
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
  ["e.ending.ed", "1", "RF.1.3f", ["e.short.vowels"], 2],
  ["e.ending.ing", "1", "RF.1.3f", ["e.ending.ed"], 2],
  ["e.sight.grade1", "1", "RF.1.3g", ["e.sight.primer"], 2],
  ["e.sight.grade2", "2", "RF.2.3f", ["e.sight.grade1"], 2],
];

/** Reading skills built from the shared gap (level 1) and picture-word (level 2) shapes. */
const READING = ["e.digraphs", "e.blends.initial", "e.blends.final", "e.vowel.teams"];
const SIGHT = ["e.sight.preprimer", "e.sight.primer", "e.sight.grade1", "e.sight.grade2"];
/** Levels a pre-reader answers by listening: every choice is a spoken picture. */
const LISTENING: [string, number][] = [
  ["e.first.sound", 1], ["e.final.sound", 1], ["e.middle.vowel", 1], ["e.word.families", 1], ["e.blend.onset", 1], ["e.sound.swap", 1],
];
/** Levels where reading the choices (or finding a letter shape) is the skill: choices are not read aloud. */
const SILENT: [string, number][] = [
  ["e.letter.names", 1], ["e.letter.names", 2], ["e.word.families", 2], ["e.blend.onset", 2], ["e.sound.swap", 2],
  ...SIGHT.flatMap((id): [string, number][] => [[id, 1], [id, 2]]),
  ["e.short.vowels", 1], ...READING.flatMap((id): [string, number][] => [[id, 1], [id, 2]]),
  ["e.silent.e", 1], ["e.silent.e", 2], ["e.ending.ed", 2], ["e.ending.ing", 1], ["e.ending.ing", 2],
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
        if (locale === "en") for (const s of strings(q)) expect(s, `${where} exclamation`).not.toContain("!");
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
          if (id !== "e.letter.names" && !(SIGHT.includes(id) && level === 1)) expect(norm(q.say).split(/[^\p{L}]+/u), `${id} ${q.say}`).not.toContain(norm(key(q)));
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
        const t = norm(/(?:like|como) (\S+)\?$/.exec(q.prompt)![1]);
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
        const t = norm(/(?:like|como) (\S+)\?$/.exec(q.prompt)![1]);
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
        const [, old, w, neu] = /(?:the|la) (\S) (?:in|de) (\S+) (?:to|por) (\S)\.$/.exec(q.prompt)!;
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
const TEAMS = ["ai", "ay", "ee", "ea", "oa", "ow", "oi", "oy", "ou", "au", "aw", "ew", "ue", "ua", "ui", "ie", "ia", "io", "ei", "eu", "oo"];
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
      expect(key(q), q.alt).toMatch(/^[^aeiou][aeiou][^aeiou]$/);
      expect(norm(q.alt!), q.alt).toBe(`a ${key(q)}`);
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
          expect(norm(q.alt!).split(" ").at(-1), q.alt).toBe(norm(key(q)));
          for (const c of q.choices.slice(1)) expect(kinds(key(q), c.label).has(c.why!), `${key(q)} → ${c.label} (${c.why})`).toBe(true);
        }
  });
});

describe("answer keys, checked another way (silent letters and endings)", () => {
  const noH = (w: string) => norm(w).replace(/(?<!c)h/g, "");
  /** Spellings that sound the same in Spanish: hue/güe, hie/ye, c/s before e, hay/ay/ahí. */
  const soundsSame = (a: string, b: string) => {
    const say = (w: string) => noH(w).replace(/^ue/, "gue").replace(/^ie/, "ye").replace(/ce/g, "se").replace(/^ay$|^ai$/, "ai");
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
      const t = /like (\S+)\?$/.exec(q.prompt)![1];
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
      construir: "construyendo", ir: "yendo", sentir: "sintiendo", servir: "sirviendo", seguir: "siguiendo", poder: "pudiendo", reir: "riendo", repetir: "repitiendo",
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
