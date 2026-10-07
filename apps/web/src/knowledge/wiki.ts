import { cachedJson, stripTags } from "./fetch";

// Wikipedia summaries: the first paragraph of the best-matching article, with its link. Text is
// CC BY-SA; we show an extract with attribution and link to the article, never more.

export type WikiSummary = {
  title: string;
  extract: string;
  url: string;
  thumbnail?: { source: string; width: number; height: number };
  lang: "en" | "es";
  license: "CC BY-SA 4.0";
};

type Search = { query?: { search?: { title: string; snippet: string }[] } };
type Summary = { type?: string; title?: string; extract?: string; content_urls?: { desktop?: { page?: string } }; thumbnail?: WikiSummary["thumbnail"] };

const base = (lang: string) => `https://${lang}.wikipedia.org`;

async function summaryOf(title: string, lang: "en" | "es"): Promise<Summary | null> {
  try {
    return await cachedJson<Summary>(`${base(lang)}/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`);
  } catch {
    return null;
  }
}

/** The best article for a topic, skipping disambiguation pages. Null when nothing fits. */
export async function wikiSummary(topic: string, lang: "en" | "es" = "en"): Promise<WikiSummary | null> {
  const search = await cachedJson<Search>(`${base(lang)}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&srlimit=4&srqiprofile=classic_noboostlinks`);
  const hits = search.query?.search ?? [];
  for (const hit of hits.slice(0, 3)) {
    const s = await summaryOf(hit.title, lang);
    if (!s || s.type === "disambiguation" || !s.extract) continue;
    return {
      title: s.title ?? hit.title,
      extract: stripTags(s.extract).slice(0, 900),
      url: s.content_urls?.desktop?.page ?? `${base(lang)}/wiki/${encodeURIComponent(hit.title.replace(/ /g, "_"))}`,
      thumbnail: s.thumbnail,
      lang,
      license: "CC BY-SA 4.0",
    };
  }
  return null;
}
