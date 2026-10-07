import { audiobooks, cleanQuery, define, KnowError, poemsBy, poemTitled, related, rhymes, searchBooks, shortPoems, standardText, syllables, texts, wikiSummary } from "@/knowledge";
import { limited } from "@/lib/server/rate";

// Public knowledge for the browser, through our server: no learner identifiers reach a third party,
// answers are cached for a day, and inputs are capped. Everything here is deterministic data from a
// named source, never model output.

export const maxDuration = 20;

const KINDS = ["wiki", "define", "rhymes", "syllables", "related", "books", "audiobooks", "texts", "poems", "poem", "short-poems", "standard"] as const;

export async function GET(req: Request, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  if (!(KINDS as readonly string[]).includes(kind)) return Response.json({ error: "kind" }, { status: 404 });
  if (limited(req, "know", 120)) return Response.json({ error: "rate" }, { status: 429 });
  const url = new URL(req.url);
  const q = cleanQuery(url.searchParams.get("q"));
  const lang = url.searchParams.get("lang") === "es" ? "es" : "en";
  if (!q && kind !== "short-poems") return Response.json({ error: "q" }, { status: 400 });
  try {
    const data = await (async () => {
      switch (kind) {
        case "wiki": return { summary: await wikiSummary(q!, lang) };
        case "define": return { definitions: await define(q!) };
        case "rhymes": return { rhymes: await rhymes(q!) };
        case "syllables": return { syllables: await syllables(q!) };
        case "related": return { related: await related(q!) };
        case "books": return { books: await searchBooks(q!) };
        case "audiobooks": return { books: await audiobooks(q!) };
        case "texts": return { books: await texts(q!, lang) };
        case "poems": return { poems: await poemsBy(q!) };
        case "poem": return { poem: await poemTitled(q!) };
        case "short-poems": return { poems: await shortPoems() };
        case "standard": return { standard: await standardText(q!) };
      }
    })();
    return Response.json(data, { headers: { "cache-control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch (e) {
    const code = e instanceof KnowError ? e.code : "status";
    return Response.json({ error: code }, { status: 502, headers: { "cache-control": "no-store" } });
  }
}
