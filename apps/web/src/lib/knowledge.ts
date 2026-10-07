"use client";

import type { Book, Definition, Poem, Standard, WikiSummary } from "@/knowledge";
import type { Locale } from "./types";

// Browser side of the knowledge layer. Every call goes through /api/know so nothing identifying leaves.

async function get<T>(kind: string, q?: string, lang?: Locale): Promise<T | null> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (lang) params.set("lang", lang);
  const res = await fetch(`/api/know/${kind}?${params}`).catch(() => null);
  if (!res?.ok) return null;
  return (await res.json()) as T;
}

export const know = {
  wiki: async (topic: string, lang: Locale) => (await get<{ summary: WikiSummary | null }>("wiki", topic, lang))?.summary ?? null,
  define: async (word: string) => (await get<{ definitions: Definition[] }>("define", word))?.definitions ?? [],
  rhymes: async (word: string) => (await get<{ rhymes: { word: string; syllables?: number }[] }>("rhymes", word))?.rhymes ?? [],
  books: async (q: string) => (await get<{ books: Book[] }>("books", q))?.books ?? [],
  audiobooks: async (q: string) => (await get<{ books: Book[] }>("audiobooks", q))?.books ?? [],
  texts: async (q: string, lang: Locale) => (await get<{ books: Book[] }>("texts", q, lang))?.books ?? [],
  poems: async (author: string) => (await get<{ poems: Poem[] }>("poems", author))?.poems ?? [],
  shortPoems: async () => (await get<{ poems: Poem[] }>("short-poems"))?.poems ?? [],
  standard: async (code: string) => (await get<{ standard: Standard | null }>("standard", code))?.standard ?? null,
};
