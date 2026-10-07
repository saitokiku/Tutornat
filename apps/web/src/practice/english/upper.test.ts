import { describe, expect, it } from "vitest";
import { check } from "../answer";
import { makeItem } from "../skills";
import type { Item } from "../types";
import { BANKS, DEVICE_NAMES, DEVICE_OVERLAP, ENGLISH_5_9, sentenceType, TRANSITION_WORDS } from "./upper";

// Grades 5–9 English is hand-written (draft), so a calculator cannot re-derive the key. Instead this
// checks every bank entry for shape and internal consistency by routes the generators do not use
// (clue text really is in the sentence, clauses really are in the sentence, the concise version really
// is shorter, passive sentences really name the doer after "by"/"por"…), then builds many items per
// level in both languages and checks the copy, the choices and the key.

const SEEDS = Array.from({ length: 600 }, (_, i) => i * 104729 + 7);
const LOCALES = ["en", "es"] as const;
/** Prerequisites owned by the K–4 English strand. */
const K4 = new Set(["e.synonyms", "e.subject.verb", "e.commas", "e.figurative"]);
const TWO_WAY = new Set(["Fact", "Opinion", "Hecho", "Opinión", "Active", "Passive", "Activa", "Pasiva"]);

const strings = (v: unknown): string[] =>
  typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === "object" ? Object.values(v).flatMap(strings) : [];
const lc = (s: string) => s.toLowerCase();
const words = (s: string) => lc(s).replace(/[^\p{L}\p{N}' ]/gu, " ").split(/\s+/).filter(Boolean);
const promptText = (item: Item) => item.prompt.map((p) => (typeof p === "string" ? p : "blank" in p ? "___" : "")).join("");
const sentenceCount = (s: string) => (s.match(/[.?!]["”]?(?=\s|$)/g) ?? []).length;

const BY_LEVEL: Record<string, readonly (readonly { en: unknown; es: unknown }[])[]> = {
  "e.context.clues": BANKS.CONTEXT,
  "e.fact.opinion": [BANKS.FACT_OPINION],
  "e.main.idea": BANKS.MAIN_IDEA,
  "e.claim.evidence": [BANKS.ARGUMENTS, BANKS.SUPPORT],
  "e.pronouns": [BANKS.PRONOUN_CASE, BANKS.PRONOUN_AGREE],
  "e.sentence.types": [BANKS.SENTENCE_TYPES],
  "e.transitions": [BANKS.TRANSITIONS],
  "e.appeals": BANKS.APPEALS,
  "e.active.passive": [BANKS.VOICE],
  "e.fallacies": BANKS.FALLACIES,
  "e.rhetorical.devices": [BANKS.DEVICE_LINES, BANKS.DEVICE_PURPOSES],
  "e.thesis": [BANKS.THESES],
  "e.concision": [BANKS.CONCISION],
};

describe("grades 5–9 English: strand shape", () => {
  it("has the planned skills in teaching order, all draft, with prerequisites that come first", () => {
    expect(ENGLISH_5_9.map((s) => s.id)).toEqual(Object.keys(BY_LEVEL));
    const seen = new Set<string>();
    for (const s of ENGLISH_5_9) {
      expect(s.subject).toBe("english");
      expect(s.content).toBe("draft");
      for (const p of s.prereqs) expect(seen.has(p) || K4.has(p), `${s.id} needs ${p}`).toBe(true);
      seen.add(s.id);
    }
  });

  it("has a bank for every level, each with at least 12 complete entries in both languages", () => {
    for (const s of ENGLISH_5_9) {
      const banks = BY_LEVEL[s.id];
      expect(banks.length, s.id).toBe(s.levels);
      for (const [i, bank] of banks.entries()) {
        expect(bank.length, `${s.id} L${i + 1}`).toBeGreaterThanOrEqual(12);
        for (const entry of bank) {
          for (const locale of LOCALES) {
            const all = strings(entry[locale]);
            expect(all.length, `${s.id} ${locale}`).toBeGreaterThan(0);
            for (const t of all) {
              expect(t.trim(), `${s.id} ${locale} empty string`).not.toBe("");
              expect(t, `${s.id} ${locale} exclamation in "${t}"`).not.toMatch(/[!¡]/);
              expect(t, `${s.id} ${locale} emoji in "${t}"`).not.toMatch(/\p{Extended_Pictographic}/u);
              expect(t, `${s.id} ${locale} double space in "${t}"`).not.toMatch(/ {2}/);
            }
          }
          expect(strings(entry.en).join(" "), `${s.id} English and Spanish are identical`).not.toBe(strings(entry.es).join(" "));
        }
      }
    }
  });
});

describe("grades 5–9 English: bank content", () => {
  it("context clues: the word and every piece of the clue are in the sentence, and the clue does not contain the answer", () => {
    for (const bank of BANKS.CONTEXT)
      for (const entry of bank)
        for (const locale of LOCALES) {
          const [sentence, word, right, wrong, clue] = entry[locale];
          expect(lc(sentence), word).toContain(lc(word));
          for (const piece of clue.split(" … ")) expect(lc(sentence), `${word}: ${piece}`).toContain(lc(piece));
          expect(lc(clue), `${word} clue gives away ${right}`).not.toContain(lc(right));
          expect(new Set([right, ...wrong].map(lc)).size, word).toBe(4);
        }
  });

  it("fact or opinion: both kinds are well represented and match across languages", () => {
    for (const locale of LOCALES) {
      const facts = BANKS.FACT_OPINION.filter((e) => e[locale][1]).length;
      expect(facts).toBeGreaterThanOrEqual(8);
      expect(BANKS.FACT_OPINION.length - facts).toBeGreaterThanOrEqual(8);
    }
    for (const e of BANKS.FACT_OPINION) expect(e.en[1], e.en[0]).toBe(e.es[1]);
  });

  it("main idea: paragraphs have 3 to 5 sentences and four different options", () => {
    for (const bank of BANKS.MAIN_IDEA)
      for (const entry of bank)
        for (const locale of LOCALES) {
          const [passage, main, detail, broad, unrelated] = entry[locale];
          const n = sentenceCount(passage);
          expect(n >= 3 && n <= 5, `${n} sentences: ${passage}`).toBe(true);
          expect(new Set([main, detail, broad, unrelated].map(lc)).size).toBe(4);
          // The too-broad and the unrelated options must not be sentences of the paragraph.
          for (const o of [broad, unrelated]) expect(lc(passage), `${o} is in the paragraph`).not.toContain(lc(o.replace(/\.$/, "")));
        }
  });

  it("arguments: three different sentences; support options are all different", () => {
    for (const e of BANKS.ARGUMENTS) for (const l of LOCALES) expect(new Set(e[l]).size).toBe(3);
    for (const e of BANKS.SUPPORT) for (const l of LOCALES) expect(new Set(e[l].map(lc)).size).toBe(5);
  });

  it("pronouns: one blank per sentence and three different options", () => {
    for (const e of [...BANKS.PRONOUN_CASE, ...BANKS.PRONOUN_AGREE])
      for (const l of LOCALES) {
        const v = e[l];
        const [sentence, right, wrong] = v.length === 5 ? [v[0], v[1], v[2]] : [v[1], v[2], v[3]];
        expect(sentence.split("___").length, sentence).toBe(2);
        expect(new Set([right, ...wrong].map(lc)).size, sentence).toBe(3);
      }
  });

  it("sentence types: every clause's words are in the sentence; both languages agree; each type appears", () => {
    const counts = [0, 0, 0, 0];
    for (const e of BANKS.SENTENCE_TYPES) {
      for (const l of LOCALES) {
        const [sentence, ind, dep] = e[l];
        const have = new Set(words(sentence));
        for (const clause of [...ind, ...dep]) for (const w of words(clause)) expect(have.has(w), `${w} not in ${sentence}`).toBe(true);
        expect(ind.length, sentence).toBeGreaterThanOrEqual(1);
      }
      const t = sentenceType(e.en[1].length, e.en[2].length);
      expect(sentenceType(e.es[1].length, e.es[2].length), e.en[0]).toBe(t);
      counts[t]++;
    }
    for (const c of counts) expect(c).toBeGreaterThanOrEqual(3);
  });

  it("transitions: the key word belongs to the entry's link, and no word belongs to two links", () => {
    for (const l of LOCALES) {
      const all = Object.values(TRANSITION_WORDS[l]).flat();
      expect(new Set(all).size).toBe(all.length);
      for (const e of BANKS.TRANSITIONS) {
        const [first, rest, link, word] = e[l];
        expect(TRANSITION_WORDS[l][link], first).toContain(word);
        expect(rest.startsWith(", "), rest).toBe(true);
      }
    }
  });

  it("appeals: each appeal appears at least four times per level, the same in both languages", () => {
    for (const bank of BANKS.APPEALS) {
      for (const a of [0, 1, 2]) expect(bank.filter((e) => e.en[1] === a).length).toBeGreaterThanOrEqual(4);
      for (const e of bank) expect(e.es[1], e.en[0]).toBe(e.en[1]);
    }
  });

  it("voice: passive names the doer after by/por with was/were or fue/fueron; active starts with the doer", () => {
    for (const e of BANKS.VOICE)
      for (const l of LOCALES) {
        const [passive, active, changed, stillPassive, receiver, doer] = e[l];
        const by = l === "en" ? / by /i : / por /i;
        const be = l === "en" ? /\b(was|were)\b/ : /\b(fue|fueron)\b/;
        expect(passive, passive).toMatch(by);
        expect(passive, passive).toMatch(be);
        expect(stillPassive, stillPassive).toMatch(by);
        expect(active, active).not.toMatch(by);
        expect(passive.startsWith(receiver), passive).toBe(true);
        expect(active.startsWith(doer), active).toBe(true);
        expect(lc(passive), passive).toContain(lc(doer));
        expect(new Set([passive, active, changed, stillPassive]).size).toBe(4);
      }
  });

  it("fallacies: level 1 uses only the first four; level 2 covers each new one at least three times", () => {
    const first = new Set(["adHominem", "bandwagon", "falseDilemma", "strawMan"]);
    for (const e of BANKS.FALLACIES[0]) expect(first.has(e.en[1]), e.en[0]).toBe(true);
    for (const f of ["slipperySlope", "hasty", "authority", "redHerring"]) expect(BANKS.FALLACIES[1].filter((e) => e.en[1] === f).length, f).toBeGreaterThanOrEqual(3);
    for (const bank of BANKS.FALLACIES) for (const e of bank) expect(e.es[1], e.en[0]).toBe(e.en[1]);
  });

  it("rhetorical devices: every device appears twice per level, the same in both languages", () => {
    for (const bank of [BANKS.DEVICE_LINES, BANKS.DEVICE_PURPOSES]) {
      for (const d of Object.keys(DEVICE_OVERLAP)) {
        const n = bank.filter((e) => (bank === BANKS.DEVICE_LINES ? e.en[1] : e.en[2]) === d).length;
        expect(n, d).toBeGreaterThanOrEqual(2);
      }
    }
    for (const e of BANKS.DEVICE_LINES) expect(e.es[1]).toBe(e.en[1]);
    for (const e of BANKS.DEVICE_PURPOSES) expect(e.es[2]).toBe(e.en[2]);
  });

  it("thesis: only the question is a question, and the thesis is the most developed option", () => {
    for (const e of BANKS.THESES)
      for (const l of LOCALES) {
        const [thesis, fact, question, vague] = e[l];
        expect(question.trim().endsWith("?"), question).toBe(true);
        for (const s of [thesis, fact, vague]) expect(s.includes("?"), s).toBe(false);
        for (const s of [fact, question, vague]) expect(thesis.length, thesis).toBeGreaterThan(s.length);
      }
  });

  it("concision: the concise version is shorter than both wordy versions, and the meaning-losing one is shorter still than the original", () => {
    for (const e of BANKS.CONCISION)
      for (const l of LOCALES) {
        const [wordy, concise, alsoWordy, lost] = e[l];
        expect(concise.length, concise).toBeLessThan(wordy.length);
        expect(concise.length, concise).toBeLessThan(alsoWordy.length);
        expect(lost.length, lost).toBeLessThan(wordy.length);
        expect(new Set([wordy, concise, alsoWordy, lost]).size).toBe(4);
      }
  });
});

describe.each(ENGLISH_5_9.map((s) => [s.id, s] as const))("%s items", (id, skill) => {
  it("have three hints, a short worked answer, valid distinct choices and a key that checks, in both languages", () => {
    for (let level = 1; level <= skill.levels; level++) {
      const bankSize = BY_LEVEL[id][level - 1].length;
      for (const locale of LOCALES) {
        const prompts = new Set<string>();
        for (const seed of SEEDS) {
          const item = makeItem(id, level, seed, locale);
          const where = `${id} L${level} seed ${seed} ${locale}`;
          prompts.add([promptText(item), ...item.choices!.map((c) => c.label).sort()].join("|"));
          expect(item.hints.length, where).toBe(3);
          expect(item.steps.length >= 1 && item.steps.length <= 4, where).toBe(true);
          expect(item.input, where).toBe("choices");
          const labels = item.choices!.map((c) => c.label);
          expect(labels.length, where).toBeGreaterThanOrEqual(labels.every((l) => TWO_WAY.has(l)) ? 2 : 3);
          expect(labels.length, where).toBeLessThanOrEqual(4);
          expect(new Set(labels.map(lc)).size, `${where} ${labels}`).toBe(labels.length);
          if (item.answer.kind !== "choice") throw new Error(where);
          const index = item.answer.index;
          const right = labels[index];
          expect(right, where).toBeTruthy();
          labels.forEach((_, i) => expect(check(item.answer, i).correct, where).toBe(i === index));
          // The worked solution ends with the answer; no hint hands it over.
          expect(lc(item.steps.at(-1)!), `${where} last step lacks ${right}`).toContain(lc(right));
          item.hints.forEach((h, i) => {
            expect(lc(h), where).not.toBe(lc(right));
            const listsChoices = i === 1 && (id === "e.fallacies" || (id === "e.rhetorical.devices" && level === 1));
            if (right.includes(" ") && !listsChoices) expect(lc(h), `${where} hint ${i + 1} gives away ${right}`).not.toContain(lc(right));
          });
          const all = [promptText(item), item.say, ...item.hints, ...item.steps, ...labels];
          for (const t of all) {
            expect(t, `${where} "${t}"`).not.toMatch(/[!¡]/);
            expect(t, `${where} "${t}"`).not.toMatch(/\p{Extended_Pictographic}/u);
          }
          if (locale === "es") expect(promptText(item), where).not.toBe(promptText(makeItem(id, level, seed, "en")));
          if (id === "e.rhetorical.devices" && level === 1) {
            const names = DEVICE_NAMES[locale];
            const device = (Object.keys(names) as (keyof typeof names)[]).find((d) => names[d][0] === right)!;
            for (const other of DEVICE_OVERLAP[device]) expect(labels, `${where} offers an overlapping device`).not.toContain(names[other][0]);
          }
          if (id === "e.transitions") {
            const groups = labels.map((l) => Object.entries(TRANSITION_WORDS[locale]).find(([, ws]) => ws.includes(l))?.[0]);
            expect(new Set(groups).size, `${where} two choices share a link`).toBe(4);
          }
        }
        expect(prompts.size, `${id} L${level} ${locale} distinct items`).toBeGreaterThanOrEqual(Math.max(12, bankSize));
      }
    }
  });
});
