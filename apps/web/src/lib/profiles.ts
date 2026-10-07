import type { Key } from "@/i18n/en";
import { newId, update, type StoreState } from "./store";
import { GRADES, type Grade, type Locale, type Profile } from "./types";

const COLORS = ["#A93B5D", "#3E6E8E", "#4F7A5B", "#8A6412", "#6B4E8E", "#B4643A"];

export const currentAccount = (s: StoreState) => s.accounts.find((a) => a.id === s.session.accountId) ?? null;
export const learnersOf = (s: StoreState) => s.profiles.filter((p) => p.accountId === s.session.accountId);
export const currentLearner = (s: StoreState) =>
  s.profiles.find((p) => p.id === s.session.profileId && p.accountId === s.session.accountId) ?? null;

type Input = { nickname: string; grade: Grade; locale: Locale };

export function checkLearner(input: Input): Key | null {
  const n = input.nickname.trim();
  if (n.length < 1 || n.length > 40) return "err.nickname";
  if (!GRADES.includes(input.grade)) return "err.nickname";
  return null;
}

export function createLearner(input: Input): Profile | Key {
  const error = checkLearner(input);
  if (error) return error;
  let created!: Profile;
  update((s) => {
    if (!s.session.accountId) throw new Error("not signed in");
    const mine = s.profiles.filter((p) => p.accountId === s.session.accountId);
    created = {
      id: newId(),
      accountId: s.session.accountId,
      nickname: input.nickname.trim(),
      grade: input.grade,
      locale: input.locale,
      color: COLORS[mine.length % COLORS.length],
      createdAt: Date.now(),
    };
    s.profiles.push(created);
  });
  return created;
}

export function updateLearner(id: string, input: Input): Key | null {
  const error = checkLearner(input);
  if (error) return error;
  update((s) => {
    const p = s.profiles.find((x) => x.id === id && x.accountId === s.session.accountId);
    if (p) Object.assign(p, { nickname: input.nickname.trim(), grade: input.grade, locale: input.locale });
  });
  return null;
}

/** Removes the learner and everything that belongs to them on this device. */
export function removeLearner(id: string) {
  update((s) => {
    s.profiles = s.profiles.filter((p) => !(p.id === id && p.accountId === s.session.accountId));
    s.courses = s.courses.filter((c) => c.profileId !== id);
    s.activity = s.activity.filter((e) => e.profileId !== id);
    s.notes = s.notes.filter((n) => n.profileId !== id);
    if (s.session.profileId === id) s.session.profileId = null;
  });
}

export function selectLearner(id: string | "parent" | null) {
  update((s) => void (s.session.profileId = id));
}

export function addNote(profileId: string, text: string) {
  const clean = text.trim().slice(0, 1000);
  if (!clean) return;
  update((s) => void s.notes.push({ id: newId(), profileId, at: Date.now(), text: clean }));
}

export function removeNote(id: string) {
  update((s) => void (s.notes = s.notes.filter((n) => n.id !== id)));
}

export function renameAccount(displayName: string) {
  const name = displayName.trim().slice(0, 80);
  if (!name) return;
  update((s) => {
    const a = s.accounts.find((x) => x.id === s.session.accountId);
    if (a) a.displayName = name;
  });
}
