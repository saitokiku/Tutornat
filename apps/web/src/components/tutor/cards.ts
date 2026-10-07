import type { UIMessage } from "ai";
import type { BoardCard } from "@/lib/tutor";
import type { Locale, Visual } from "@/lib/types";
import type { EventKind } from "@/planner/types";
import { getSkill, makeItem } from "@/practice/skills";

// The AI tutor's tool calls, turned into the cards the board draws. Board tools (show_visual,
// start_practice, add_to_calendar, note_for_grownup) are drawn from what the model asked for; knowledge
// and practice tools from what our server returned. Pure, so it is tested against a mock model's stream.

type ToolPart = { type: string; state?: string; input?: Record<string, unknown>; output?: Record<string, unknown>; toolCallId?: string };

const KINDS: EventKind[] = ["test", "quiz", "homework", "project", "event"];
const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.slice(0, max) : "");
/** Links the board opens: our server built them, but only web links are ever drawn. */
const web = (v: unknown) => (typeof v === "string" && /^https:\/\//.test(v) ? v : null);

export function cardsOf(m: UIMessage, locale: Locale): BoardCard[] {
  const out: BoardCard[] = [];
  for (const raw of m.parts) {
    const p = raw as ToolPart;
    if (!p.type.startsWith("tool-") || p.state === "input-streaming" || p.state === "output-error") continue;
    const input = p.input ?? {};
    const o = p.state === "output-available" ? (p.output ?? {}) : null;
    switch (p.type) {
      case "tool-show_visual":
        if (input.visual) out.push({ type: "visual", visual: input.visual as Visual, description: str(input.description, 200) });
        break;
      case "tool-similar_problem": {
        const id = str(o?.skillId);
        if (id && getSkill(id) && typeof o?.seed === "number") out.push({ type: "worked", item: makeItem(id, typeof o.level === "number" ? o.level : 1, o.seed, locale) });
        break;
      }
      case "tool-start_practice":
        if (getSkill(str(input.skillId))) out.push({ type: "practice", skillId: str(input.skillId), reason: str(input.reason, 140) || undefined });
        break;
      case "tool-add_to_calendar": {
        const kind = KINDS.includes(input.kind as EventKind) ? (input.kind as EventKind) : "event";
        const date = /^\d{4}-\d{2}-\d{2}$/.test(str(input.date)) ? str(input.date) : undefined;
        if (str(input.title)) out.push({ type: "calendar", key: p.toolCallId ?? str(input.title), title: str(input.title, 120), kind, date });
        break;
      }
      case "tool-find_resources": {
        const list = (o?.resources as { title: string; source: string; url: string }[] | undefined)?.filter((r) => web(r.url));
        if (list?.length) out.push({ type: "resources", list });
        break;
      }
      case "tool-note_for_grownup":
        if (str(input.text)) out.push({ type: "note", text: str(input.text, 280) });
        break;
      case "tool-look_up":
        if (o?.found && web(o.url)) out.push({ type: "fact", title: str(o.title, 200), extract: str(o.extract, 900), url: web(o.url)!, lang: o.lang === "es" ? "es" : "en" });
        break;
      case "tool-define_word":
        if (o?.found && web(o.url) && Array.isArray(o.senses))
          out.push({ type: "definition", word: str(o.word, 40), senses: (o.senses as { partOfSpeech: string; text: string }[]).slice(0, 3).map((s) => ({ partOfSpeech: str(s.partOfSpeech, 20), text: str(s.text, 400) })), url: web(o.url)! });
        break;
      case "tool-find_book": {
        const list = Array.isArray(o?.books) ? (o.books as BookRow[]).filter((b) => web(b.url)).slice(0, 4) : [];
        if (o?.found && list.length) out.push({ type: "books", topic: str(o.query, 100), list: list.map((b) => ({ title: str(b.title, 200), author: b.author ? str(b.author, 100) : undefined, year: typeof b.year === "number" ? b.year : undefined, url: b.url, source: str(b.source, 40), kind: b.kind === "audio" || b.kind === "read" ? b.kind : "borrow" })) });
        break;
      }
      case "tool-read_poem":
        if (o?.found && web(o.url) && Array.isArray(o.lines)) out.push({ type: "poem", title: str(o.title, 200), author: str(o.author, 100), lines: (o.lines as unknown[]).slice(0, 40).map((l) => str(l, 300)), url: web(o.url)! });
        break;
      case "tool-standard_text":
        if (o?.found && web(o.url)) out.push({ type: "standard", code: str(o.code, 20), text: str(o.text, 1200), subject: str(o.subject, 60), url: web(o.url)! });
        break;
    }
  }
  return out;
}

type BookRow = { title: string; author?: string; year?: number; url: string; source: string; kind: string };

/** Skills the conversation turned to: what find_skill found, what practice was offered, what was worked. */
export function skillsIn(m: UIMessage): string[] {
  const ids: string[] = [];
  for (const raw of m.parts) {
    const p = raw as ToolPart;
    if (p.type === "tool-start_practice") ids.push(str(p.input?.skillId));
    if (p.state !== "output-available") continue;
    if (p.type === "tool-find_skill") ids.push(...((p.output?.skills as { skillId: string }[] | undefined) ?? []).map((s) => s.skillId));
    if (p.type === "tool-similar_problem") ids.push(str(p.output?.skillId));
  }
  return ids.filter((id, i) => id && getSkill(id) && ids.indexOf(id) === i);
}
