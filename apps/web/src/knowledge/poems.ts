import { cachedJson } from "./fetch";

// PoetryDB: public-domain poems with full text. Good for reading aloud, rhyme and rhetoric practice.

export type Poem = { title: string; author: string; lines: string[]; url: string };

type PDB = { title: string; author: string; lines: string[] }[] | { status: number; reason: string };

const clean = (rows: PDB): Poem[] =>
  Array.isArray(rows)
    ? rows.map((p) => ({ ...p, url: `https://poetrydb.org/title/${encodeURIComponent(p.title)}` }))
    : [];

export async function poemsBy(author: string, max = 5): Promise<Poem[]> {
  return clean(await cachedJson<PDB>(`https://poetrydb.org/author/${encodeURIComponent(author)}/title,author,lines`)).filter((p) => p.lines.length <= 40).slice(0, max);
}

export async function poemTitled(title: string): Promise<Poem | null> {
  const rows = clean(await cachedJson<PDB>(`https://poetrydb.org/title/${encodeURIComponent(title)}/title,author,lines`));
  return rows[0] ?? null;
}

/** Short poems (≤ 20 lines) for younger readers; PoetryDB has no length filter, so we ask for a batch and keep the short ones. */
export async function shortPoems(max = 5): Promise<Poem[]> {
  const rows = clean(await cachedJson<PDB>(`https://poetrydb.org/linecount/8;12/title,author,lines`, { ttlMs: 3600_000 }));
  return rows.slice(0, max);
}
