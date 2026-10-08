import { describe, expect, it } from "vitest";
import { check } from "../answer";
import { getSkill, makeItem } from "../skills";
import type { Item } from "../types";
import { PAIRS, PASSAGES, type Passage, type Question, type SkillKey } from "./passages-35";
import { ENGLISH_READING_3_5, TAGS } from "./reading-35";

// Grades 3–5 reading is hand-written (draft), so no calculator can re-derive a key. These tests check
// the bank by routes the generator never takes: every evidence quote really is in the passage, in the
// same paragraph in both languages; a heading answer really is the section that holds the evidence;
// a first-person story really uses I/yo outside its dialogue and a third-person one never does; the
// passages really fall in their length bands. Then many seeds per level in both languages: each item
// is matched back to its passage and question by its text, and the key must be that question's answer.

const LOCALES = ["en", "es"] as const;
type L = (typeof LOCALES)[number];
const SEEDS = Array.from({ length: 300 }, (_, i) => i * 7349 + 101);

const TABLE: [id: string, grade: string, standard: string, prereqs: string[], key: SkillKey][] = [
  ["e.key.details", "3", "RL.3.1", ["e.sight.words"], "details"],
  ["e.sequence.cause", "3", "RI.3.3", ["e.key.details"], "sequence"],
  ["e.character.traits", "3", "RL.3.3", ["e.key.details", "e.adjectives"], "character"],
  ["e.text.features", "3", "RI.3.5", ["e.key.details"], "features"],
  ["e.supporting.details", "4", "RI.4.2", ["e.text.features"], "mainidea"],
  ["e.story.theme", "4", "RL.4.2", ["e.character.traits"], "theme"],
  ["e.point.of.view", "4", "RL.4.6", ["e.character.traits"], "pov"],
  ["e.passage.words", "4", "RL.4.4", ["e.key.details", "e.synonyms"], "words"],
  ["e.compare.texts", "5", "RI.5.9", ["e.supporting.details", "e.main.idea"], "compare"],
];
/** English ids from the other strands; none may be reused. */
const EXISTING = "e.letter.sounds e.rhyme e.syllables e.sight.words e.cvc.words e.capitals e.plurals e.nouns.verbs e.past.tense e.contractions e.adjectives e.homophones e.prefixes e.synonyms e.subject.verb e.commas e.figurative e.context.clues e.fact.opinion e.main.idea e.claim.evidence e.pronouns e.sentence.types e.transitions e.appeals e.active.passive e.fallacies e.rhetorical.devices e.thesis e.concision".split(" ");

const BY_ID = new Map(PASSAGES.map((p) => [p.id, p]));
const blocks = (p: Passage, l: L) => (l === "es" ? p.es : p.en);
const idx = (l: L) => (l === "es" ? 1 : 0);
const lc = (s: string) => s.toLowerCase();
/** A choice label as it would appear inside running text: lower case, no final period. */
const bare = (s: string) => lc(s).replace(/[.]$/, "");
const wordCount = (s: string) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const sentenceCount = (s: string) => (s.match(/[.?!…]["”]?(?=\s|$)/g) ?? []).length;
const promptText = (item: Item) => item.prompt.map((p) => (typeof p === "string" ? p : "")).join("");
/** The words outside “dialogue”. */
const narration = (s: string) => s.replace(/“[^”]*”/g, " ");
const tokens = (s: string) => new Set(s.split(/[^\p{L}']+/u).filter(Boolean));
const FIRST: Record<L, string[]> = { en: ["i", "me", "my", "mine", "myself", "i'm", "i've", "i'll", "i'd"], es: ["yo", "me", "mi", "mis", "mí", "conmigo"] };
const firstPerson = (s: string, l: L) => {
  const t = tokens(lc(narration(s)));
  return FIRST[l].some((w) => t.has(w));
};
/** A heading in an article: short, and no end punctuation. Written here, separately from the strand. */
const heading = (b: string) => !/[.?!:;”…)]$/.test(b) && wordCount(b) <= 8;
/** The heading whose section holds block i, if any. */
const sectionOf = (bs: string[], i: number) => bs.slice(0, i + 1).reverse().find(heading);
const quoted = (s: string) => [...s.matchAll(/“([^”]+)”/g)].map((m) => m[1].replace(/[,.]$/, ""));
const allQuestions = (): { p: Passage; b?: Passage; q: Question }[] => [
  ...PASSAGES.flatMap((p) => p.qs.map((q) => ({ p, q }))),
  ...PAIRS.flatMap((pair) => pair.qs.map((q) => ({ p: BY_ID.get(pair.a)!, b: BY_ID.get(pair.b)!, q }))),
];

describe("grades 3–5 reading: strand shape", () => {
  it("has the planned skills in teaching order, all draft English with two text-band levels", () => {
    expect(ENGLISH_READING_3_5.map((s) => s.id)).toEqual(TABLE.map((t) => t[0]));
    const seen = new Set<string>();
    for (const [id, grade, standard, prereqs] of TABLE) {
      const s = ENGLISH_READING_3_5.find((k) => k.id === id)!;
      expect([s.subject, s.grade, s.standard, s.prereqs, s.levels, s.content], id).toEqual(["english", grade, standard, prereqs, 2, "draft"]);
      expect(EXISTING, `${id} reuses an id`).not.toContain(id);
      expect(s.title.en && s.title.es && s.title.en !== s.title.es, id).toBeTruthy();
      for (const p of prereqs) expect(seen.has(p) || (EXISTING.includes(p) && getSkill(p) !== undefined), `${id} needs ${p}`).toBe(true);
      seen.add(id);
    }
  });

  it("has 45 original passages of all three kinds in both bands", () => {
    expect(PASSAGES.length).toBe(45);
    expect(new Set(PASSAGES.map((p) => p.id)).size).toBe(45);
    for (const kind of ["fiction", "info", "poem"] as const)
      for (const band of [1, 2]) expect(PASSAGES.filter((p) => p.kind === kind && p.band === band).length, `${kind} band ${band}`).toBeGreaterThanOrEqual(4);
  });

  it("has at least 12 distinct questions for every skill at every level", () => {
    for (const [id, , , , key] of TABLE)
      for (const band of [1, 2]) {
        const inBand = PASSAGES.filter((p) => p.band === band);
        let n = inBand.flatMap((p) => p.qs).filter((q) => q.skill === key).length;
        if (key === "pov") n += inBand.filter((p) => p.kind === "fiction" && p.whoTells).length;
        if (key === "compare") n += PAIRS.filter((pair) => BY_ID.get(pair.a)!.band === band).flatMap((pair) => pair.qs).length;
        expect(n, `${id} level ${band}`).toBeGreaterThanOrEqual(12);
      }
  });
});

describe("grades 3–5 reading: passages", () => {
  it("are 120–300 words in both languages, with matching paragraphs, and prose fits its band", () => {
    for (const p of PASSAGES) {
      expect(p.es.length, `${p.id} blocks`).toBe(p.en.length);
      expect(p.qs.length >= 3 && p.qs.length <= 5, `${p.id} has ${p.qs.length} questions`).toBe(true);
      const [en, es] = [wordCount(p.en.join(" ")), wordCount(p.es.join(" "))];
      for (const n of [en, es]) expect(n >= 120 && n <= 300, `${p.id}: ${n} words`).toBe(true);
      expect(es / en > 0.85 && es / en < 1.25, `${p.id}: Spanish ${es} vs English ${en} words`).toBe(true);
      if (p.kind !== "poem") expect(p.band === 1 ? en <= 200 : en >= 200, `${p.id} band ${p.band}: ${en} words`).toBe(true);
    }
  });

  it("get harder from band 1 to band 2: longer prose sentences on average, in both languages", () => {
    for (const l of LOCALES) {
      const avg = (band: number) => {
        const prose = PASSAGES.filter((p) => p.band === band && p.kind !== "poem").map((p) => blocks(p, l).join(" "));
        return prose.reduce((s, t) => s + wordCount(t) / sentenceCount(t), 0) / prose.length;
      };
      expect(avg(1), l).toBeLessThan(avg(2));
    }
  });

  it("are clean text: balanced dialogue quotes, no exclamations, emoji or double spaces, Spanish differs from English", () => {
    for (const p of PASSAGES) {
      for (const l of LOCALES)
        for (const b of [p.title[idx(l)], ...blocks(p, l)]) {
          expect((b.match(/“/g) ?? []).length, `${p.id} ${l} quotes in ${b}`).toBe((b.match(/”/g) ?? []).length);
          expect(b, `${p.id} ${l}`).not.toMatch(/[!¡]|\p{Extended_Pictographic}| {2}/u);
          expect(b.trim(), p.id).toBe(b);
        }
      p.en.forEach((b, i) => expect(b, `${p.id} block ${i} is not translated`).not.toBe(p.es[i]));
    }
  });

  it("tell stories from one point of view: I/yo in a first-person narration, never in a third-person one", () => {
    for (const p of PASSAGES) {
      expect(p.kind === "fiction", `${p.id} pov only on stories`).toBe(p.pov !== undefined && p.povEv !== undefined);
      if (!p.pov) continue;
      for (const l of LOCALES) {
        const text = blocks(p, l).join("\n\n");
        expect(firstPerson(text, l), `${p.id} ${l} narration`).toBe(p.pov === "first");
        const ev = p.povEv![idx(l)];
        expect(narration(text), `${p.id} ${l} povEv is narration`).toContain(ev);
        expect(firstPerson(ev, l), `${p.id} ${l} povEv: ${ev}`).toBe(p.pov === "first");
      }
    }
  });

  it("ask “who is telling this story?” of about half the stories, so it is at most a third of each point-of-view level", () => {
    for (const p of PASSAGES) if (p.whoTells) expect(p.kind, p.id).toBe("fiction");
    for (const band of [1, 2]) {
      const stories = PASSAGES.filter((p) => p.band === band && p.kind === "fiction");
      const narrator = stories.filter((p) => p.whoTells).length;
      const others = PASSAGES.filter((p) => p.band === band).flatMap((p) => p.qs).filter((q) => q.skill === "pov").length;
      expect(narrator / stories.length, `band ${band}: ${narrator} of ${stories.length} stories`).toBeGreaterThanOrEqual(1 / 3);
      expect(narrator / stories.length, `band ${band}: ${narrator} of ${stories.length} stories`).toBeLessThanOrEqual(2 / 3);
      expect(narrator * 3, `band ${band}: ${narrator} narrator items, ${others} other point-of-view questions`).toBeLessThanOrEqual(narrator + others);
    }
  });

  it("pair an article with a poem or story on its topic, in one band", () => {
    expect(PAIRS.length).toBeGreaterThanOrEqual(8);
    for (const pair of PAIRS) {
      const [a, b] = [BY_ID.get(pair.a), BY_ID.get(pair.b)];
      expect(a && b, `${pair.a} + ${pair.b}`).toBeTruthy();
      expect(a!.kind, pair.a).toBe("info");
      expect(b!.kind, pair.b).not.toBe("info");
      expect(a!.band, pair.a).toBe(b!.band);
      for (const q of pair.qs) expect(q.skill).toBe("compare");
    }
    for (const p of PASSAGES) for (const q of p.qs) expect(q.skill, p.id).not.toBe("compare");
  });
});

describe("grades 3–5 reading: questions", () => {
  it("have 3–4 distinct choices, a misconception tag on every wrong one, and both languages", () => {
    for (const k of Object.keys(TAGS)) expect(k).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    for (const [en, es] of Object.values(TAGS)) expect(en.trim() && es.trim() && en !== es).toBeTruthy();
    for (const { p, q } of allQuestions()) {
      const where = `${p.id}: ${q.q[0]}`;
      expect(q.wrong.length === 2 || q.wrong.length === 3, where).toBe(true);
      for (const l of LOCALES) {
        const labels = [q.right[idx(l)], ...q.wrong.map((w) => w[idx(l)])];
        expect(new Set(labels.map(lc)).size, `${where} ${l} ${labels}`).toBe(labels.length);
        for (const s of [q.q[idx(l)], q.clue[idx(l)], q.ev[idx(l)], ...labels]) {
          expect(s.trim(), where).toBe(s);
          expect(s, `${where} ${l}`).not.toMatch(/[!¡]|\p{Extended_Pictographic}| {2}/u);
        }
      }
      for (const [en, es] of [q.q, q.right, q.clue, ...(q.how ? [q.how] : [])]) expect(en, where).not.toBe(es);
      // Every text-feature question has its own hint 2; the generic one names no place to look.
      if (q.skill === "features") expect(q.how, `${where} needs its own hint 2`).toBeDefined();
      for (const l of LOCALES) for (const s of q.how ? [q.how[idx(l)]] : []) expect(s.trim() === s && !/[!¡]| {2}/.test(s), where).toBe(true);
      for (const [, , why, esWhy] of q.wrong) {
        expect(esWhy, `${where}: a Spanish tag only when it differs`).not.toBe(why);
        for (const tag of [why, ...(esWhy ? [esWhy] : [])]) {
          expect(tag, where).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
          expect(tag.length, where).toBeLessThanOrEqual(40);
          expect(TAGS[tag], `${where} tag ${tag}`).toBeDefined();
        }
      }
    }
  });

  it("quote real evidence: in the passage, in the same paragraph in both languages, never the answer itself", () => {
    for (const { p, b, q } of allQuestions()) {
      const where = `${p.id}: ${q.q[0]}`;
      const at = LOCALES.map((l) => blocks(p, l).findIndex((x) => x.includes(q.ev[idx(l)])));
      expect(at[0], `${where} evidence not found: ${q.ev[0]}`).toBeGreaterThanOrEqual(0);
      expect(at[1], `${where} evidence not in the same paragraph: ${q.ev[1]}`).toBe(at[0]);
      if (b) {
        expect(q.ev2, where).toBeDefined();
        const at2 = LOCALES.map((l) => blocks(b, l).findIndex((x) => x.includes(q.ev2![idx(l)])));
        expect(at2[0], `${where} Text 2 evidence: ${q.ev2![0]}`).toBeGreaterThanOrEqual(0);
        expect(at2[1], `${where} Text 2 evidence in Spanish: ${q.ev2![1]}`).toBe(at2[0]);
      } else expect(q.ev2, where).toBeUndefined();
      for (const l of LOCALES) {
        const right = bare(q.right[idx(l)]);
        for (const hint of [q.clue[idx(l)], q.ev[idx(l)], q.ev2?.[idx(l)] ?? "", q.how?.[idx(l)] ?? ""]) expect(lc(hint), `${where} ${l} gives away “${right}”`).not.toContain(right);
        // Anything the question quotes is in one of the texts it is about.
        const texts = [p, ...(b ? [b] : [])].map((x) => lc([x.title[idx(l)], ...blocks(x, l)].join("\n")).replace(/\s+/g, " "));
        for (const quote of quoted(q.q[idx(l)])) expect(texts.some((t) => t.includes(lc(quote))), `${where} ${l} quotes “${quote}”`).toBe(true);
      }
    }
  });

  it("word questions ask about words that are in the text, next to the context the evidence quotes", () => {
    for (const { p, q } of allQuestions().filter((x) => x.q.skill === "words"))
      for (const l of LOCALES) {
        const [term] = quoted(q.q[idx(l)]);
        expect(term, `${p.id} ${l} names no word`).toBeTruthy();
        const block = blocks(p, l).find((b) => b.includes(q.ev[idx(l)]))!;
        expect(lc(block.replace(/\s+/g, " ")), `${p.id} ${l}: “${term}” is not in the evidence paragraph`).toContain(lc(term));
      }
  });

  it("heading answers are the section that holds the evidence; glossary answers point at a real glossary entry", () => {
    let headingQuestions = 0;
    for (const { p, q } of allQuestions().filter((x) => x.q.skill === "features"))
      for (const l of LOCALES) {
        const bs = blocks(p, l);
        const heads = bs.filter(heading);
        const evAt = bs.findIndex((x) => x.includes(q.ev[idx(l)]));
        const right = q.right[idx(l)];
        if (heads.includes(right)) {
          headingQuestions++;
          expect(sectionOf(bs, evAt), `${p.id} ${l}: evidence is not under “${right}”`).toBe(right);
          for (const [en, es, why] of q.wrong) if (why === "wrong-section") expect(heads, `${p.id} ${l}`).toContain(l === "es" ? es : en);
        }
        if (/glossary|glosario/i.test(right)) {
          expect(sectionOf(bs, evAt), `${p.id} ${l} glossary`).toMatch(/^(Glossary|Glosario)$/);
          const [term] = quoted(q.q[idx(l)]);
          expect(q.ev[idx(l)].startsWith(`${term}:`), `${p.id} ${l} glossary entry for ${term}`).toBe(true);
        }
      }
    expect(headingQuestions).toBeGreaterThanOrEqual(20);
  });

  it("“which sentence shows the narrator” questions offer real sentences, and only the key is first person", () => {
    for (const { p, q } of allQuestions().filter((x) => x.q.skill === "pov" && x.p.kind === "fiction"))
      for (const l of LOCALES) {
        const text = blocks(p, l).join(" ");
        const labels = [q.right[idx(l)], ...q.wrong.map((w) => w[idx(l)])];
        if (!labels.every((s) => text.includes(s))) continue;
        expect(firstPerson(labels[0], l), `${p.id} ${l} key`).toBe(true);
        for (const w of labels.slice(1)) expect(firstPerson(w, l), `${p.id} ${l}: ${w}`).toBe(false);
      }
  });
});

/** Finds the bank entry an item came from by its text alone (no question: the narrator item). */
function entryOf(item: Item, l: L): { p: Passage; b?: Passage; q?: Question } {
  const prompt = promptText(item);
  const pair = PAIRS.find((x) => prompt.startsWith(l === "es" ? `Texto 1: ${BY_ID.get(x.a)!.title[1]}` : `Text 1: ${BY_ID.get(x.a)!.title[0]}`) && x.qs.some((q) => q.q[idx(l)] === item.say));
  if (pair) return { p: BY_ID.get(pair.a)!, b: BY_ID.get(pair.b)!, q: pair.qs.find((q) => q.q[idx(l)] === item.say)! };
  const p = PASSAGES.find((x) => prompt.startsWith(`${x.title[idx(l)]}\n\n${blocks(x, l)[0]}`))!;
  expect(p, `no passage for ${prompt.slice(0, 60)}`).toBeDefined();
  for (const b of blocks(p, l)) expect(prompt).toContain(b);
  return { p, q: p.qs.find((x) => x.q[idx(l)] === item.say) };
}

/** The answer the item's bank entry says is right. */
function expectedAnswer(item: Item, l: L): string {
  const { p, q } = entryOf(item, l);
  if (q) return q.right[idx(l)];
  // The narrator question: the key follows from the passage's point of view.
  expect(item.say).toBe(l === "es" ? "¿Quién cuenta esta historia?" : "Who is telling this story?");
  expect(p.whoTells, `${p.id} is not asked who tells it`).toBe(true);
  const label = item.choices!.find((c) => (p.pov === "first" ? /“(I|yo)”/ : /outside|fuera/).test(c.label));
  return label!.label;
}

describe.each(TABLE.map((t) => [t[0], t[4]] as const))("%s items", (id) => {
  it("match their bank entry, give three hints that do not hand over the key, and read the same in both languages", () => {
    for (const level of [1, 2]) {
      const seen = new Map<L, Set<string>>(LOCALES.map((l) => [l, new Set()]));
      for (const seed of SEEDS) {
        const keys: number[] = [];
        for (const l of LOCALES) {
          const item = makeItem(id, level, seed, l);
          const where = `${id} L${level} seed ${seed} ${l}`;
          if (item.answer.kind !== "choice") throw new Error(where);
          const index = item.answer.index;
          keys.push(index);
          const labels = item.choices!.map((c) => c.label);
          seen.get(l)!.add(`${promptText(item)}|${[...labels].sort().join("|")}`);
          expect(item.input, where).toBe("choices");
          expect(labels.length >= 2 && labels.length <= 4, where).toBe(true);
          expect(new Set(labels.map(lc)).size, `${where} ${labels}`).toBe(labels.length);
          labels.forEach((_, i) => expect(check(item.answer, i).correct, where).toBe(i === index));
          expect(labels[index], `${where} wrong key`).toBe(expectedAnswer(item, l));
          item.choices!.forEach((c, i) => (i === index ? expect(c.why, where).toBeUndefined() : expect(TAGS[c.why!], `${where} untagged ${c.label}`).toBeDefined()));
          // The question is read aloud and ends the prompt.
          expect(promptText(item).endsWith(item.say), where).toBe(true);
          expect(item.say, where).not.toMatch(/\^|\d\/\d|\{|\}/);
          expect(item.hints.length, where).toBe(3);
          for (const h of item.hints) expect(lc(h), `${where} hint gives away ${labels[index]}`).not.toContain(bare(labels[index]));
          expect(item.steps.length >= 2 && item.steps.length <= 4, where).toBe(true);
          expect(lc(item.steps.at(-1)!), `${where} last step`).toContain(lc(labels[index]));
          for (const t of [promptText(item), item.say, ...item.hints, ...item.steps, ...labels]) expect(t, where).not.toMatch(/[!¡]|\p{Extended_Pictographic}/u);
          // Every quote that opens also closes, and a quote never opens inside another.
          for (const t of [...item.hints, ...item.steps]) {
            let depth = 0;
            for (const ch of t) {
              if (ch === "“") depth++;
              if (ch === "”") depth--;
              expect(depth >= 0 && depth <= 1, `${where}: ${t}`).toBe(true);
            }
            expect(depth, `${where}: ${t}`).toBe(0);
          }
          expect(item.seconds >= 60 && item.seconds <= 300, `${where} ${item.seconds}s`).toBe(true);
          checkLocation(item, l);
        }
        expect(keys[1], `${id} L${level} seed ${seed}: the key moves between languages`).toBe(keys[0]);
        expect(promptText(makeItem(id, level, seed, "es")), `${id} L${level} seed ${seed}`).not.toBe(promptText(makeItem(id, level, seed, "en")));
      }
      for (const l of LOCALES) expect(seen.get(l)!.size, `${id} L${level} ${l} distinct items`).toBeGreaterThanOrEqual(12);
    }
  });
});

/**
 * Hint 2 ends by naming where the evidence is: a paragraph, stanza, section or box, and for a pair one
 * place in each text. The evidence must really be there, in both languages. A text-feature question
 * names no place, which would often be its answer, and a poem's point of view is about its speaker.
 */
function checkLocation(item: Item, l: L) {
  const { p, b, q } = entryOf(item, l);
  const hint = item.hints[1];
  if (!q) return;
  if (q.skill === "features") return expect(hint, p.id).toBe(q.how![idx(l)]);
  if (q.skill === "pov" && p.kind === "poem") expect(hint, p.id).not.toMatch(/third-person|tercera persona/);
  if (b) {
    const m = (l === "es" ? /En el texto 1, mira ([^.]+)\. En el texto 2, mira ([^.]+)\.$/ : /In Text 1, look at ([^.]+)\. In Text 2, look at ([^.]+)\.$/).exec(hint);
    expect(m, `${p.id} + ${b.id} ${l}: ${hint}`).not.toBeNull();
    checkSpot(p, l, m![1], q.ev[idx(l)]);
    checkSpot(b, l, m![2], q.ev2![idx(l)]);
  } else {
    const m = (l === "es" ? /Mira ([^.]+)\.$/ : /Look at ([^.]+)\.$/).exec(hint);
    expect(m, `${p.id} ${l}: ${hint}`).not.toBeNull();
    checkSpot(p, l, m![1], q.ev[idx(l)]);
  }
}

function checkSpot(p: Passage, l: L, place: string, ev: string) {
  const bs = blocks(p, l);
  const at = bs.findIndex((x) => x.includes(ev));
  expect(at, `${p.id} ${l} evidence ${ev}`).toBeGreaterThanOrEqual(0);
  const m = /^(?:paragraph|el párrafo) (\d+)$|^(?:stanza|la estrofa) (\d+)$|^(?:the section|la sección) “([^”]+)”$|^(?:the part that begins|la parte que empieza con) “([^”]+)”$/.exec(place);
  expect(m, `${p.id} ${l}: ${place}`).not.toBeNull();
  if (m![1]) expect(bs.filter((x, i) => i <= at && (p.kind !== "info" || !heading(x))).length, `${p.id} ${l} paragraph`).toBe(Number(m![1]));
  if (m![2]) expect([p.kind, at + 1], `${p.id} ${l} stanza`).toEqual(["poem", Number(m![2])]);
  if (m![3]) expect(sectionOf(bs, at), `${p.id} ${l} section`).toBe(m![3]);
  if (m![4]) expect(bs[at].startsWith(m![4]) && at > 0 && !heading(bs[at - 1]), `${p.id} ${l} box ${m![4]}`).toBe(true);
}
