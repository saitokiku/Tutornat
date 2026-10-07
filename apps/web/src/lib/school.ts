import { isDay } from "@/planner/dates";
import { classify, parseIcs } from "@/planner/ics";
import { matchSkills } from "@/planner/skillmatch";
import type { EventKind, Feedback, SchoolClass, SchoolEvent, SchoolResult } from "@/planner/types";
import { deleteBlob } from "./blobs";
import { newId, update, type StoreState } from "./store";
import type { Subject } from "./types";

// School: classes, dated items, teacher notes and scores, per learner. Backend-shaped like the rest
// of lib/: these bodies become API calls when accounts move to a server.

export const CLASS_COLORS = ["#3E6E8E", "#4F7A5B", "#A93B5D", "#8A6412", "#6B4E8E", "#B4643A", "#2F6F6A"];

export const classesOf = (s: StoreState, profileId: string) => s.classes.filter((c) => c.profileId === profileId);
export const eventsOf = (s: StoreState, profileId: string) =>
  s.events.filter((e) => e.profileId === profileId).sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));
export const feedbackOf = (s: StoreState, profileId: string) => s.feedback.filter((f) => f.profileId === profileId).sort((a, b) => b.at - a.at);
export const resultsOf = (s: StoreState, profileId: string) => s.results.filter((r) => r.profileId === profileId).sort((a, b) => b.date.localeCompare(a.date));

const clean = (s: string, max: number) => s.replace(/\s+/g, " ").trim().slice(0, max);

export function addClass(profileId: string, input: { name: string; subject: Subject; teacher?: string; feedUrl?: string }): SchoolClass | null {
  const name = clean(input.name, 60);
  if (!name) return null;
  let made!: SchoolClass;
  update((s) => {
    const n = s.classes.filter((c) => c.profileId === profileId).length;
    made = { id: newId(), profileId, name, subject: input.subject, teacher: input.teacher ? clean(input.teacher, 60) : undefined, color: CLASS_COLORS[n % CLASS_COLORS.length], feedUrl: input.feedUrl, createdAt: Date.now() };
    s.classes.push(made);
  });
  return made;
}

export function updateClass(id: string, patch: Partial<Pick<SchoolClass, "name" | "subject" | "teacher" | "feedUrl">>) {
  update((s) => {
    const c = s.classes.find((x) => x.id === id);
    if (c) Object.assign(c, { ...patch, name: patch.name !== undefined ? clean(patch.name, 60) || c.name : c.name });
  });
}

export function removeClass(id: string) {
  update((s) => {
    s.classes = s.classes.filter((c) => c.id !== id);
    for (const e of s.events) if (e.classId === id) e.classId = undefined;
  });
}

export type EventInput = { title: string; kind: EventKind; date: string; time?: string; classId?: string; notes?: string; skillIds?: string[]; attachment?: SchoolEvent["attachment"] };

/** One school item, only for the learner it belongs to (undefined for a wrong id or someone else's). */
export const getEvent = (s: StoreState, id: string, profileId: string) => s.events.find((e) => e.id === id && e.profileId === profileId);

/** What may be kept with an item: pasted text (capped), and a pointer to a file in the browser's file store. */
function cleanAttachment(a: SchoolEvent["attachment"]): SchoolEvent["attachment"] {
  if (!a) return undefined;
  const out: NonNullable<SchoolEvent["attachment"]> = {};
  const text = typeof a.text === "string" ? a.text.trim().slice(0, 4000) : "";
  if (text) out.text = text;
  if (typeof a.blobId === "string" && /^[\w-]{1,64}$/.test(a.blobId)) {
    out.blobId = a.blobId;
    if (typeof a.name === "string" && a.name.trim()) out.name = clean(a.name, 120);
    if (typeof a.mediaType === "string" && /^[\w.+-]+\/[\w.+-]+$/.test(a.mediaType)) out.mediaType = a.mediaType.slice(0, 80);
  }
  return out.text || out.blobId ? out : undefined;
}

export function checkEvent(input: EventInput): "err.title" | "err.date" | null {
  if (!clean(input.title, 160)) return "err.title";
  if (!isDay(input.date)) return "err.date";
  return null;
}

/** Skills suggested for an item: from its words, within the class subject when there is one. */
export function suggestSkills(s: StoreState, text: string, classId?: string) {
  const subject = s.classes.find((c) => c.id === classId)?.subject;
  return matchSkills(text, subject);
}

export function addEvent(profileId: string, input: EventInput, source: SchoolEvent["source"] = "typed"): SchoolEvent | null {
  if (checkEvent(input)) return null;
  let made!: SchoolEvent;
  update((s) => {
    made = {
      id: newId(),
      profileId,
      title: clean(input.title, 160),
      kind: input.kind,
      date: input.date,
      time: input.time && /^\d{2}:\d{2}$/.test(input.time) ? input.time : undefined,
      classId: input.classId,
      notes: input.notes ? input.notes.trim().slice(0, 1000) : undefined,
      skillIds: input.skillIds ?? [],
      source,
      createdAt: Date.now(),
    };
    const attachment = cleanAttachment(input.attachment);
    if (attachment) made.attachment = attachment;
    s.events.push(made);
  });
  return made;
}

export function updateEvent(id: string, patch: Partial<EventInput & { done: boolean }>) {
  let dropped: string | undefined;
  update((s) => {
    const e = s.events.find((x) => x.id === id);
    if (!e) return;
    if (patch.title !== undefined) e.title = clean(patch.title, 160) || e.title;
    if (patch.date !== undefined && isDay(patch.date)) e.date = patch.date;
    if (patch.time !== undefined) e.time = /^\d{2}:\d{2}$/.test(patch.time) ? patch.time : undefined;
    if (patch.kind) e.kind = patch.kind;
    if ("classId" in patch) e.classId = patch.classId || undefined;
    if (patch.notes !== undefined) e.notes = patch.notes.trim().slice(0, 1000) || undefined;
    if (patch.skillIds) e.skillIds = patch.skillIds;
    if (patch.done !== undefined) e.done = patch.done;
    if ("attachment" in patch) {
      const next = cleanAttachment(patch.attachment);
      if (e.attachment?.blobId && e.attachment.blobId !== next?.blobId) dropped = e.attachment.blobId;
      if (next) e.attachment = next;
      else delete e.attachment;
    }
  });
  // A photo or PDF the item no longer points to leaves the file store too.
  if (dropped) void deleteBlob(dropped);
}

export function removeEvent(id: string) {
  let blobId: string | undefined;
  update((s) => {
    blobId = s.events.find((e) => e.id === id)?.attachment?.blobId;
    s.events = s.events.filter((e) => e.id !== id);
    s.planDone = s.planDone.filter((d) => !d.key.endsWith(id));
  });
  // The photo or PDF goes with the item.
  if (blobId) void deleteBlob(blobId);
}

export type Draft = { key: string; title: string; date: string; time?: string; kind: EventKind; classId?: string; skillIds: string[]; uid?: string; include: boolean };

/** Calendar file text → reviewable drafts (nothing is saved until the grown-up confirms). */
export function draftsFromIcs(s: StoreState, profileId: string, text: string, fromDate: string, classId?: string): Draft[] {
  const classes = classesOf(s, profileId);
  return parseIcs(text)
    .filter((e) => e.date >= fromDate)
    .slice(0, 300)
    .map((e) => {
      const cls = classId ?? classes.find((c) => e.title.toLowerCase().includes(c.name.toLowerCase()))?.id;
      return {
        key: e.uid ?? `${e.date}:${e.title}`,
        title: e.title,
        date: e.date,
        time: e.time,
        kind: classify(`${e.title} ${e.description ?? ""}`),
        classId: cls,
        skillIds: suggestSkills(s, `${e.title} ${e.description ?? ""}`, cls),
        uid: e.uid,
        include: true,
      };
    });
}

/** Saves reviewed drafts. Items with a calendar UID update the earlier import instead of duplicating it. */
export function importDrafts(profileId: string, drafts: Draft[], source: SchoolEvent["source"]): { added: number; updated: number } {
  let added = 0, updated = 0;
  update((s) => {
    for (const d of drafts.filter((x) => x.include)) {
      if (!isDay(d.date) || !clean(d.title, 160)) continue;
      const existing = d.uid ? s.events.find((e) => e.profileId === profileId && e.uid === d.uid) : undefined;
      if (existing) {
        Object.assign(existing, { title: clean(d.title, 160), date: d.date, time: d.time, kind: d.kind, classId: d.classId ?? existing.classId, skillIds: d.skillIds.length ? d.skillIds : existing.skillIds });
        updated++;
      } else {
        s.events.push({ id: newId(), profileId, title: clean(d.title, 160), kind: d.kind, date: d.date, time: d.time, classId: d.classId, skillIds: d.skillIds, source, uid: d.uid, createdAt: Date.now() });
        added++;
      }
    }
  });
  return { added, updated };
}

export function addFeedback(profileId: string, input: { text: string; classId?: string; skillIds: string[] }, source: Feedback["source"] = "typed"): Feedback | null {
  const text = input.text.trim().slice(0, 1000);
  if (!text) return null;
  const f: Feedback = { id: newId(), profileId, at: Date.now(), classId: input.classId, text, skillIds: input.skillIds, source };
  update((s) => void s.feedback.push(f));
  return f;
}

export function removeFeedback(id: string) {
  update((s) => void (s.feedback = s.feedback.filter((f) => f.id !== id)));
}

export function addResult(profileId: string, input: Omit<SchoolResult, "id" | "profileId">): SchoolResult | null {
  if (!clean(input.title, 120) || !isDay(input.date) || !(input.outOf > 0) || input.score < 0 || input.score > input.outOf * 2) return null;
  const r: SchoolResult = { ...input, title: clean(input.title, 120), id: newId(), profileId };
  update((s) => void s.results.push(r));
  return r;
}

export function removeResult(id: string) {
  update((s) => void (s.results = s.results.filter((r) => r.id !== id)));
}
