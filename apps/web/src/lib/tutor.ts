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

/**
 * A conversation turned to a skill: the tutor's help is meant to make the next try on it right. One act
 * per conversation (thread) and day; the outcome is resolved later from the evidence, never here.
 */
export function logTutorAct(profileId: string, threadId: string, skillId: string) {
  if (!getSkill(skillId)) return;
  logAct({ profileId, kind: "tutor", intent: "next-try-right", skillId, ref: threadId }, { once: true });
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
  /** Key points from a ready-made KaizenEDU lesson. */
  | { type: "lesson"; catalogueId: string; courseTitle: string; lessonId: string; lessonTitle: string; lead?: string; points: string[] }
  | { type: "books"; topic: string; list: { title: string; author?: string; year?: number; url: string; source: string; kind: "borrow" | "audio" | "read" }[] }
  | { type: "poem"; title: string; author: string; lines: string[]; url: string }
  | { type: "standard"; code: string; text: string; subject: string; url: string };
