import type { EventKind, TutorThread } from "@/planner/types";
import { getSkill } from "@/practice/skills";
import type { Item } from "@/practice/types";
import { logAct } from "./acts";
import { read, update, type StoreState } from "./store";
import type { Locale, Visual } from "./types";

// Tutor conversations are kept so a grown-up can read them (and so the record says when the tutor helped).

const MAX_THREADS = 200;

export function saveThread(thread: TutorThread) {
  if (thread.lines.length < 2) return; // the tutor's opening alone is not a conversation
  const saved = read().threads.find((x) => x.id === thread.id);
  if (saved && JSON.stringify(saved) === JSON.stringify(thread)) return; // nothing new: no write
  update((s) => {
    const i = s.threads.findIndex((x) => x.id === thread.id);
    if (i >= 0) s.threads[i] = thread;
    else s.threads.push(thread);
    if (s.threads.length > MAX_THREADS) s.threads.splice(0, s.threads.length - MAX_THREADS);
  });
}

export const threadsOf = (s: StoreState, profileId: string) =>
  s.threads.filter((x) => x.profileId === profileId).sort((a, b) => b.startedAt - a.startedAt);

/** Every name the family entered: the learners' nicknames (and each word of them) and the grown-up's name. */
export function familyNames(s: StoreState, profileId: string): string[] {
  const accountId = s.profiles.find((p) => p.id === profileId)?.accountId;
  const names = [...s.profiles.filter((p) => p.accountId === accountId).map((p) => p.nickname), ...s.accounts.filter((a) => a.id === accountId).map((a) => a.displayName)];
  return [...new Set(names.flatMap((n) => [n, ...n.split(/\s+/)]).map((n) => n.trim()).filter((n) => n.length >= 2))];
}

/**
 * Text for the AI tutor with the family's names taken out: learner names never go to a model, but a
 * teacher's note ("Ada still needs page 4") or a child typing "my name is Ada" would carry them. A name
 * is matched as a whole word, as entered, Capitalized or in capitals ("will" in a sentence stays; "Will"
 * goes, which errs toward privacy).
 */
export function withoutNames(text: string, names: string[]): string {
  let out = text;
  for (const name of [...names].sort((a, b) => b.length - a.length)) {
    const forms = [...new Set([name, name[0].toUpperCase() + name.slice(1), name.toUpperCase()])].map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    out = out.replace(new RegExp(`(?<![\\p{L}\\p{N}])(?:${forms.join("|")})(?![\\p{L}\\p{N}])`, "gu"), "[name]");
  }
  return out;
}

/**
 * A conversation turned to a skill: the tutor's help is meant to make the next try on it right. One act
 * per conversation (ref = thread id), skill and day, with the practice set when the tutor sat beside one;
 * a conversation that moves from fallacies to fractions records both. The outcome is resolved later from
 * the evidence, never here.
 */
export function logTutorAct(profileId: string, threadId: string, skillId: string, setId?: string, now = Date.now()) {
  if (!getSkill(skillId)) return;
  const day = new Date(now).toDateString();
  const logged = read().acts.some((a) => a.profileId === profileId && a.kind === "tutor" && a.ref === threadId && a.skillId === skillId && new Date(a.at).toDateString() === day);
  if (logged) return;
  logAct({ profileId, kind: "tutor", intent: "next-try-right", skillId, ref: threadId, ...(setId ? { setId } : {}) }, { at: now });
}

/**
 * What the tutor puts on the board: pictures, worked examples, practice and dates it offers, and cited
 * knowledge. The AI tutor's tools and the demo tutor both produce these; every knowledge card carries its
 * source and link.
 */
export type BoardCard =
  | { type: "visual"; visual: Visual; description: string }
  | { type: "worked"; item: Item }
  | { type: "practice"; skillId: string; reason?: string }
  /** No date: the card opens the calendar's add form instead of adding in one tap. */
  | { type: "calendar"; key: string; title: string; kind: EventKind; date?: string; skillIds?: string[] }
  | { type: "resources"; list: { title: string; source: string; url: string }[] }
  | { type: "note"; text: string }
  /** A Wikipedia extract, shown as written with its link and licence. */
  | { type: "fact"; title: string; extract: string; url: string; lang: Locale }
  /** Dictionary senses (Wiktionary, through Datamuse). */
  | { type: "definition"; word: string; senses: { partOfSpeech: string; text: string }[]; url: string }
  /** Key points from a ready-made KaizenEDU lesson, in the language it is written in (`lang`). */
  | { type: "lesson"; catalogueId: string; courseTitle: string; lessonId: string; lessonTitle: string; lead?: string; points: string[]; lang?: Locale }
  | { type: "books"; topic: string; list: { title: string; author?: string; year?: number; url: string; source: string; kind: "borrow" | "audio" | "read" }[] }
  | { type: "poem"; title: string; author: string; lines: string[]; url: string }
  | { type: "standard"; code: string; text: string; subject: string; url: string };
