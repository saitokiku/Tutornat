import { describe, expect, it } from "vitest";
import { check } from "../answer";
import { makeItem } from "../skills";
import type { Item } from "../types";
import { type Ask, PASSAGES, type Passage, type Question, type Structure, type Tag } from "./passages-69";
import { ENGLISH_READING_6_9, POOLS, STRUCTURE_LABELS, TAG_TEXT } from "./reading-69";

// Grades 6–9 reading is hand-written (draft), so no calculator can re-derive a key. Instead this checks
// each passage and question by routes the generator does not use: every quote a question leans on is
// found in the passage, in the same paragraph in both languages; every phrase an ask quotes is really
// in the text (and in the paragraph it names); choices that quote the passage either all do or none
// do; the overall-structure answer agrees with signal words counted from an independent word list; the
// right answer is not given away by being the longest choice; and every built item's key is re-found
// from the prompt text alone. Then it builds 240 seeds per level in both languages.

const SEEDS = Array.from({ length: 240 }, (_, i) => i * 104729 + 11);
const LOCALES = ["en", "es"] as const;
type L = (typeof LOCALES)[number];

/** English skills from the other strands (the ids this strand must not reuse, and may build on). */
const OTHER = new Set(
  "e.letter.sounds e.rhyme e.syllables e.sight.words e.cvc.words e.capitals e.plurals e.nouns.verbs e.past.tense e.contractions e.adjectives e.homophones e.prefixes e.synonyms e.subject.verb e.commas e.figurative e.context.clues e.fact.opinion e.main.idea e.claim.evidence e.pronouns e.sentence.types e.transitions e.appeals e.active.passive e.fallacies e.rhetorical.devices e.thesis e.concision".split(" "),
);

/** Each skill's diagnostic vocabulary, typed out here rather than read from the strand. */
const ALLOWED: Record<string, Tag[]> = {
  central: ["not-in-text", "contradicts-text", "too-narrow", "too-broad", "adds-opinion", "misses-key-point"],
  infer: ["not-in-text", "contradicts-text", "overgeneralizes", "wrong-character", "off-point-evidence", "too-narrow"],
  words: ["too-literal", "ignores-connotation", "opposite-tone", "topic-not-tone", "wrong-context-meaning", "not-in-text", "contradicts-text", "too-narrow"],
  structure: ["wrong-section-role", "not-in-text", "contradicts-text", "too-narrow", "misread-as-chronological", "misread-as-compare-contrast", "misread-as-cause-effect", "misread-as-problem-solution"],
  theme: ["topic-not-theme", "plot-not-theme", "misses-the-change", "not-in-text", "contradicts-text", "too-narrow", "wrong-character", "off-point-evidence"],
  pov: ["confuses-speaker-author", "misses-author-stance", "overstates-view", "wrong-purpose", "off-point-evidence", "not-in-text", "contradicts-text"],
  argument: ["evidence-not-claim", "counterclaim-not-claim", "anecdote-as-proof", "opinion-as-evidence", "misjudges-relevance", "not-a-flaw", "off-point-evidence", "not-in-text", "contradicts-text", "overgeneralizes"],
  compare: ["swaps-texts", "one-text-only", "same-not-different", "not-in-text", "contradicts-text", "overstates-view"],
};
const PAIRED_ONLY = new Set<Tag>(["swaps-texts", "one-text-only", "same-not-different"]);

/** Signal words for each overall structure, listed independently of the passages' own lists. */
const SIGNALS: Record<L, Record<Structure, string[]>> = {
  en: {
    chronological: ["in 18", "in 19", "in 20", "by 18", "by 19", "then", "later", "after", "afterward", "first", "next", "finally", "years later", "that same year", "when he was", "when she was", "began", "by the time", "today"],
    "compare-contrast": ["both", "but", "while", "unlike", "differ", "difference", "similar", "same", "whereas", "on the other hand", "in contrast", "alike", "instead"],
    "cause-effect": ["because", "cause", "caused", "as a result", "result", "effect", "effects", "led to", "leads to", "so ", "therefore", "without", "since"],
    "problem-solution": ["problem", "solution", "solve", "solved", "fix", "answer", "instead", "plan", "tried", "worked"],
  },
  es: {
    chronological: ["en 18", "en 19", "en 20", "para 18", "para 19", "luego", "después", "más tarde", "primero", "finalmente", "años después", "ese mismo año", "cuando tenía", "empezó", "para cuando", "hoy"],
    "compare-contrast": ["ambos", "ambas", "pero", "mientras que", "a diferencia", "diferencia", "se diferencian", "parecido", "parecidos", "igual", "en cambio", "en contraste", "en lugar de"],
    "cause-effect": ["porque", "causa", "causó", "como resultado", "resultado", "efecto", "efectos", "provocó", "provoca", "así que", "por eso", "sin ", "ya que"],
    "problem-solution": ["problema", "solución", "soluciones", "resolver", "resolvió", "arreglar", "respuesta", "en lugar de", "plan", "intentó", "intentaron", "funcionó"],
  },
};

const lc = (s: string) => s.toLowerCase();
const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;
const paras = (p: Passage, l: L) => p[l].flatMap((t) => t.paras);
const body = (p: Passage, l: L) => paras(p, l).join("\n\n");
const focus = (a: Ask) => a.slice(0, a.indexOf("."));
/** Phrases an ask quotes, without the comma or period that English puts inside the quote marks. */
const quoted = (s: string) => [...s.matchAll(/“([^”]+)”/g)].map((m) => m[1].replace(/[,.;:]$/, ""));
/** [text, paragraph] of the first paragraph holding a quote, or undefined. */
const find = (p: Passage, l: L, s: string) => {
  for (const [t, text] of p[l].entries()) {
    const i = text.paras.findIndex((x) => x.includes(s));
    if (i >= 0) return [t, i] as const;
  }
};
const count = (text: string, list: string[]) => list.reduce((n, w) => n + (lc(text).split(lc(w)).length - 1), 0);
const choicesOf = (x: Question, l: L) => [x[l][1], ...x[l][2]];
const promptText = (item: Item) => item.prompt.map((p) => (typeof p === "string" ? p : "")).join("");
const NO = [/[!¡]/, /\p{Extended_Pictographic}/u, / {2}/, /\d\/\d/, /[{}^]/, /"/];

describe("grades 6–9 reading: strand shape", () => {
  it("has the planned skills in teaching order, all draft English with two levels", () => {
    expect(ENGLISH_READING_6_9.map((s) => [s.id, s.grade, s.standard, s.levels, s.content, s.subject])).toEqual([
      ["e.central.summary", "6", "RI.6.2", 2, "draft", "english"],
      ["e.inference.evidence", "6", "RL.6.1", 2, "draft", "english"],
      ["e.word.choice", "6", "RL.6.4", 2, "draft", "english"],
      ["e.text.structure", "7", "RI.7.5", 2, "draft", "english"],
      ["e.theme.development", "7", "RL.7.2", 2, "draft", "english"],
      ["e.author.pov", "8", "RI.8.6", 2, "draft", "english"],
      ["e.compare.texts", "8", "RI.8.9", 2, "draft", "english"],
      ["e.argument.evaluate", "9", "RI.9-10.8", 2, "draft", "english"],
    ]);
  });

  it("uses new ids, and every prerequisite is an existing skill or one listed earlier here", () => {
    const seen = new Set<string>();
    for (const s of ENGLISH_READING_6_9) {
      expect(OTHER.has(s.id), `${s.id} reuses an id`).toBe(false);
      for (const p of s.prereqs) expect(seen.has(p) || OTHER.has(p), `${s.id} needs ${p}`).toBe(true);
      seen.add(s.id);
      expect(s.title.en && s.title.es && s.title.en !== s.title.es).toBeTruthy();
    }
  });
});

describe("grades 6–9 reading: passages", () => {
  it("has 45 original passages across genres and both levels", () => {
    expect(PASSAGES.length).toBe(45);
    expect(new Set(PASSAGES.map((p) => p.id)).size).toBe(45);
    const genres = (g: Passage["genre"]) => PASSAGES.filter((p) => p.genre === g).length;
    expect(genres("story")).toBeGreaterThanOrEqual(8);
    expect(genres("poem")).toBeGreaterThanOrEqual(5);
    expect(genres("informational")).toBeGreaterThanOrEqual(9);
    expect(genres("argument")).toBeGreaterThanOrEqual(6);
    expect(genres("primary")).toBeGreaterThanOrEqual(4);
    expect(genres("paired")).toBeGreaterThanOrEqual(8);
    for (const level of [1, 2]) expect(PASSAGES.filter((p) => p.level === level).length).toBeGreaterThanOrEqual(20);
  });

  it.each(PASSAGES.map((p) => [p.id, p] as const))("%s: complete, aligned, 200–450 words in both languages", (id, p) => {
    expect(p.en.length, id).toBe(p.genre === "paired" ? 2 : 1);
    expect(p.es.length, id).toBe(p.en.length);
    p.en.forEach((t, i) => {
      expect(p.es[i].paras.length, `${id} text ${i + 1} paragraph count`).toBe(t.paras.length);
      expect(p.es[i].title, id).not.toBe(t.title);
    });
    for (const l of LOCALES) {
      const n = wordCount(body(p, l));
      expect(n >= 200 && n <= 450, `${id} ${l} has ${n} words`).toBe(true);
      for (const t of [...p[l].map((x) => x.title), ...paras(p, l), ...(p.note ? [p.note[l]] : [])]) {
        expect(t.trim(), id).not.toBe("");
        for (const bad of NO) expect(t, `${id} ${l} ${bad}: ${t}`).not.toMatch(bad);
      }
      if (p.genre === "poem") for (const s of paras(p, l)) expect(s.split("\n").length, `${id} stanza`).toBeGreaterThanOrEqual(3);
    }
    // Imagined historical documents say so, in both languages.
    if (p.genre === "primary") expect(p.note, id).toBeDefined();
    if (p.note) {
      expect(lc(p.note.en), id).toContain("imagined");
      expect(lc(p.note.es), id).toMatch(/imaginad/);
    }
    const questions = p.qs.length + (p.structure ? 1 : 0);
    expect(questions >= 3 && questions <= 5, `${id} has ${questions} questions`).toBe(true);
    if (p.structure) expect(["informational", "argument"]).toContain(p.genre);
  });
});

describe("grades 6–9 reading: questions", () => {
  const all = PASSAGES.flatMap((p) => p.qs.map((x, i) => [`${p.id} Q${i + 1} ${x.ask}`, p, x] as const));

  it.each(all)("%s", (where, p, x) => {
    const f = focus(x.ask);
    expect(x.tags.length, where).toBeGreaterThanOrEqual(2);
    expect(x.tags.length, where).toBeLessThanOrEqual(3);
    for (const tag of x.tags) {
      expect(tag, where).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(tag.length).toBeLessThanOrEqual(40);
      expect(ALLOWED[f], `${where}: ${tag} is not a ${f} misconception`).toContain(tag);
      if (PAIRED_ONLY.has(tag)) expect(p.genre, where).toBe("paired");
      expect(TAG_TEXT[tag].en && TAG_TEXT[tag].es).toBeTruthy();
    }
    if (f === "compare") expect(p.genre, where).toBe("paired");
    expect(x.en.join("|"), `${where} English and Spanish are identical`).not.toBe(x.es.join("|"));
    const located: (readonly [number, number])[][] = [];
    for (const l of LOCALES) {
      const [ask, right, wrong, evidence, explain] = x[l];
      expect(wrong.length, `${where} ${l}`).toBe(x.tags.length);
      const labels = choicesOf(x, l);
      expect(new Set(labels.map(lc)).size, `${where} ${l} duplicate choices`).toBe(labels.length);
      for (const t of [ask, ...labels, ...evidence, explain]) {
        expect(t.trim(), where).not.toBe("");
        for (const bad of NO) expect(t, `${where} ${l} ${bad}: ${t}`).not.toMatch(bad);
      }
      expect(lc(explain), where).not.toBe(lc(right));
      // Every quote the question leans on is in the passage, in one paragraph.
      expect(evidence.length >= 1 && evidence.length <= 2, where).toBe(true);
      located.push(evidence.map((e) => {
        const at = find(p, l, e);
        expect(at, `${where} ${l}: evidence not in the passage: ${e}`).toBeDefined();
        return at!;
      }));
      // Every phrase the ask quotes is in the passage, and in the paragraph or stanza it names.
      const named = /(?:paragraph|párrafo|stanza|estrofa) (\d+)/.exec(ask);
      if (named) expect(Number(named[1]), where).toBeLessThanOrEqual(p[l].reduce((n, t) => Math.max(n, t.paras.length), 0));
      for (const phrase of quoted(ask)) {
        const at = find(p, l, phrase);
        expect(at, `${where} ${l}: the ask quotes text that is not in the passage: ${phrase}`).toBeDefined();
        if (named && p[l].length === 1) expect(at![1] + 1, `${where} ${l}: “${phrase}” is not in the paragraph named`).toBe(Number(named[1]));
      }
      // Choices that quote the passage: all of them or none of them.
      const verbatim = labels.filter((c) => body(p, l).includes(c)).length;
      expect(verbatim === 0 || verbatim === labels.length, `${where} ${l}: ${verbatim} of ${labels.length} choices are quotes`).toBe(true);
      // A topic is a word or two; a theme is a full sentence.
      x.tags.forEach((tag, i) => {
        if (tag === "topic-not-theme") expect(wordCount(wrong[i]), `${where} ${l}`).toBeLessThanOrEqual(3);
      });
      if (x.ask === "theme.statement") expect(wordCount(right) >= 6 && /\.$/.test(right), `${where} ${l}`).toBe(true);
    }
    // The evidence sits in the same text and paragraph in both languages.
    expect(located[1], `${where}: evidence moved between languages`).toEqual(located[0]);
    // Comparing or agreeing across texts needs evidence from both texts.
    if (x.ask === "compare.differ" || x.ask === "compare.agree") expect(new Set(located[0].map(([t]) => t)).size, where).toBe(2);
  });

  it("overall structure: the passage's signal words are really there and fit the structure it names", () => {
    for (const p of PASSAGES.filter((x) => x.structure)) {
      const s = p.structure!;
      for (const l of LOCALES) {
        const [signals, explain] = s[l];
        expect(signals.length, p.id).toBeGreaterThanOrEqual(3);
        expect(explain.trim(), p.id).not.toBe("");
        for (const w of signals) {
          expect(lc(body(p, l)), `${p.id} ${l}: signal ${w} not in passage`).toContain(lc(w));
          expect(SIGNALS[l][s.kind].some((k) => lc(w).includes(lc(k.trim()))), `${p.id} ${l}: ${w} is not a ${s.kind} signal`).toBe(true);
        }
        expect(count(body(p, l), SIGNALS[l][s.kind]), `${p.id} ${l}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("each skill has at least 12 questions per level, and the key is not usually the longest choice", () => {
    for (const [f, levels] of Object.entries(POOLS)) {
      for (const [i, pool] of levels.entries()) {
        expect(pool.length, `${f} L${i + 1}`).toBeGreaterThanOrEqual(12);
        const authored = pool.flatMap((e) => (e.question ? [e.question] : []));
        for (const l of LOCALES) {
          const longest = authored.filter((x) => {
            const [right, ...wrong] = choicesOf(x, l);
            return wrong.every((w) => right.length > w.length);
          }).length;
          expect(longest / authored.length, `${f} L${i + 1} ${l}: key is the longest choice in ${longest} of ${authored.length}`).toBeLessThanOrEqual(0.5);
        }
      }
    }
  });
});

/** Finds the bank question an item was built from by reading its prompt, not by asking the generator. */
function source(item: Item, l: L) {
  const text = promptText(item);
  const passage = PASSAGES.find((p) => p[l].every((t) => text.includes(t.title)) && paras(p, l).every((x) => text.includes(x)));
  const question = passage?.qs.find((x) => text.endsWith(`\n\n${x[l][0]}`));
  return { passage, question };
}

describe.each(ENGLISH_READING_6_9.map((s) => [s.id, s] as const))("%s items", (id, skill) => {
  it("show the whole passage, three hints that do not give the key away, a worked answer, tagged choices and a key that re-checks", () => {
    for (let level = 1; level <= skill.levels; level++) {
      for (const l of LOCALES) {
        const prompts = new Set<string>();
        for (const seed of SEEDS) {
          const item = makeItem(id, level, seed, l);
          const where = `${id} L${level} seed ${seed} ${l}`;
          prompts.add(promptText(item));
          expect(item.input, where).toBe("choices");
          expect(item.hints.length, where).toBe(3);
          expect(item.steps.length >= 2 && item.steps.length <= 4, where).toBe(true);
          expect(item.seconds >= 60 && item.seconds <= 240, `${where} ${item.seconds}s`).toBe(true);
          const labels = item.choices!.map((c) => c.label);
          expect(labels.length >= 3 && labels.length <= 4, where).toBe(true);
          expect(new Set(labels.map(lc)).size, where).toBe(labels.length);
          if (item.answer.kind !== "choice") throw new Error(where);
          const index = item.answer.index;
          labels.forEach((_, i) => expect(check(item.answer, i).correct, where).toBe(i === index));
          const right = labels[index];
          item.choices!.forEach((c, i) => {
            if (i === index) expect(c.why, where).toBeUndefined();
            else expect(c.why, `${where} untagged wrong choice ${c.label}`).toMatch(/^[a-z]+(-[a-z]+)*$/);
          });
          expect(lc(item.steps.at(-1)!), `${where} last step lacks the key`).toContain(lc(right));
          for (const h of item.hints) expect(lc(h), `${where} hint gives away ${right}`).not.toContain(lc(right));
          expect(item.say, where).not.toMatch(/\^|\d\/\d|\{|\}/);
          for (const t of [promptText(item), item.say, ...item.hints, ...item.steps, ...labels]) expect(t, `${where} "${t}"`).not.toMatch(/[!¡]|\p{Extended_Pictographic}/u);
          // The same seed asks the same question in both languages: same key position, same tags.
          const other = makeItem(id, level, seed, l === "en" ? "es" : "en");
          expect(other.answer, where).toEqual(item.answer);
          expect(other.choices!.map((c) => c.why), where).toEqual(item.choices!.map((c) => c.why));
          // Re-find the key from the prompt alone.
          const { passage, question } = source(item, l);
          expect(passage, `${where}: prompt does not show a whole passage`).toBeDefined();
          expect(passage!.level, where).toBe(level);
          if (question) {
            expect(right, where).toBe(question[l][1]);
          } else {
            const s = passage!.structure!;
            expect(right, where).toBe(STRUCTURE_LABELS[l][["chronological", "compare-contrast", "cause-effect", "problem-solution"].indexOf(s.kind)]);
          }
        }
        expect(prompts.size, `${id} L${level} ${l} distinct items`).toBeGreaterThanOrEqual(12);
      }
    }
  });
});
