import { cachedJson } from "./fetch";

// Datamuse: definitions, rhymes, syllable counts, related words. English only; free, no key.
// Definitions come from Wiktionary through Datamuse ("n\tdefinition").

type DM = { word: string; score?: number; numSyllables?: number; defs?: string[]; tags?: string[] };

const DM = "https://api.datamuse.com/words";

export type Definition = { word: string; partOfSpeech: string; text: string };

const PART: Record<string, string> = { n: "noun", v: "verb", adj: "adjective", adv: "adverb", u: "" };

export async function define(word: string): Promise<Definition[]> {
  const rows = await cachedJson<DM[]>(`${DM}?sp=${encodeURIComponent(word.toLowerCase())}&md=d&max=1`);
  const row = rows[0];
  if (!row?.defs?.length) return [];
  return row.defs.slice(0, 4).map((d) => {
    const [pos, ...rest] = d.split("\t");
    return { word: row.word, partOfSpeech: PART[pos] ?? pos, text: rest.join("\t").replace(/^\([^)]*\)\s*/, "").trim() };
  });
}

export async function rhymes(word: string, max = 12): Promise<{ word: string; syllables?: number }[]> {
  const rows = await cachedJson<DM[]>(`${DM}?rel_rhy=${encodeURIComponent(word.toLowerCase())}&md=s&max=${max}`);
  return rows.filter((r) => /^[a-z]+$/.test(r.word)).map((r) => ({ word: r.word, syllables: r.numSyllables }));
}

export async function syllables(word: string): Promise<number | null> {
  const rows = await cachedJson<DM[]>(`${DM}?sp=${encodeURIComponent(word.toLowerCase())}&md=s&max=1`);
  return rows[0]?.word === word.toLowerCase() ? (rows[0].numSyllables ?? null) : null;
}

export async function related(word: string, max = 10): Promise<string[]> {
  const rows = await cachedJson<DM[]>(`${DM}?ml=${encodeURIComponent(word.toLowerCase())}&max=${max}`);
  return rows.map((r) => r.word);
}
