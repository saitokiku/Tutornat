import { cachedJson } from "./fetch";

// Books a family can actually get for free: Open Library (catalogue, covers, borrowable copies),
// LibriVox (public-domain audiobooks read by volunteers), Wikisource (public-domain texts online).

export type Book = {
  title: string;
  author?: string;
  year?: number;
  cover?: string;
  /** Where to read, borrow or listen. */
  url: string;
  source: "Open Library" | "LibriVox" | "Wikisource";
  kind: "borrow" | "audio" | "read";
};

type OL = { docs?: { key: string; title: string; author_name?: string[]; first_publish_year?: number; cover_i?: number; ebook_access?: string }[] };
type LV = { books?: { id: string; title: string; url_librivox?: string; authors?: { first_name?: string; last_name?: string }[]; totaltime?: string }[] };
type WS = { query?: { search?: { title: string }[] } };

export async function searchBooks(q: string, max = 5): Promise<Book[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=${max}&fields=key,title,author_name,first_publish_year,cover_i,ebook_access`;
  const data = await cachedJson<OL>(url);
  return (data.docs ?? []).map((d) => ({
    title: d.title,
    author: d.author_name?.[0],
    year: d.first_publish_year,
    cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : undefined,
    url: `https://openlibrary.org${d.key}`,
    source: "Open Library" as const,
    kind: "borrow" as const,
  }));
}

export async function audiobooks(title: string, max = 3): Promise<Book[]> {
  const url = `https://librivox.org/api/feed/audiobooks/?title=${encodeURIComponent(`^${title}`)}&format=json&limit=${max}&fields=id,title,url_librivox,authors,totaltime`;
  try {
    const data = await cachedJson<LV>(url);
    return (data.books ?? []).map((b) => ({
      title: b.title,
      author: b.authors?.[0] ? `${b.authors[0].first_name ?? ""} ${b.authors[0].last_name ?? ""}`.trim() : undefined,
      url: b.url_librivox ?? `https://librivox.org/search?q=${encodeURIComponent(title)}`,
      source: "LibriVox" as const,
      kind: "audio" as const,
    }));
  } catch {
    return []; // LibriVox answers 404 when nothing matches
  }
}

export async function texts(q: string, lang: "en" | "es" = "en", max = 3): Promise<Book[]> {
  const data = await cachedJson<WS>(`https://${lang}.wikisource.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&srlimit=${max}`);
  return (data.query?.search ?? []).map((s) => ({ title: s.title, url: `https://${lang}.wikisource.org/wiki/${encodeURIComponent(s.title.replace(/ /g, "_"))}`, source: "Wikisource" as const, kind: "read" as const }));
}
