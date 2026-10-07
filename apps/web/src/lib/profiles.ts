import type { Key } from "@/i18n/en";
import { REPRESENTATIONS, teachingProfile, type TeachingProfile } from "@/learning/profile";
import { actsOf, resolvedActsOf } from "./acts";
import { newId, update, type StoreState } from "./store";
import { GRADES, type Grade, type Locale, type Profile, type TeachingPrefs } from "./types";

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
    for (const k of ["attempts", "sets", "events", "classes", "feedback", "results", "planDone", "reading", "threads", "acts"] as const)
      (s[k] as { profileId: string }[]) = s[k].filter((x) => x.profileId !== id);
    if (s.session.profileId === id) s.session.profileId = null;
  });
}

export function selectLearner(id: string | "parent" | null) {
  update((s) => {
    s.session.profileId = id;
    if (id && id !== "parent") s.session.unlocked = false;
  });
}

/** Grown-up gate passed: Parent view, managing learners and account settings are open again. */
export function unlockParent() {
  update((s) => void (s.session.unlocked = true));
}

export function addNote(profileId: string, text: string, from?: "tutor" | "safety") {
  const clean = text.trim().slice(0, 1000);
  if (!clean) return;
  update((s) => void s.notes.push({ id: newId(), profileId, at: Date.now(), text: clean, from }));
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

// ----- "How we teach {name}" -----

export const TEACHING_NOTE_MAX = 400;

/**
 * A grown-up's corrections to the derived teaching profile. Replaces what was there: pass the whole
 * set of choices; a missing field goes back to what the record shows, and `{}` clears every edit.
 */
export function setTeaching(profileId: string, prefs: TeachingPrefs) {
  const clean: TeachingPrefs = {};
  if (prefs.representation && REPRESENTATIONS.includes(prefs.representation)) clean.representation = prefs.representation;
  if (prefs.leadWith === "hint" || prefs.leadWith === "example") clean.leadWith = prefs.leadWith;
  const note = prefs.note
    ?.replace(/[^\S\n]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, TEACHING_NOTE_MAX)
    .trim();
  if (note) clean.note = note;
  update((s) => {
    const p = s.profiles.find((x) => x.id === profileId && x.accountId === s.session.accountId);
    if (!p) return;
    if (Object.keys(clean).length) p.teaching = clean;
    else delete p.teaching;
  });
}

let taught: { s: StoreState; profile: Profile; hour: number; out: TeachingProfile } | null = null;

/** How this learner learns, from their record and a grown-up's choices. Cached until the record changes. */
export function teachingOf(s: StoreState, profile: Profile, now: number): TeachingProfile {
  const hour = Math.floor(now / 3600_000);
  if (taught && taught.s === s && taught.profile === profile && taught.hour === hour) return taught.out;
  const out = teachingProfile(
    {
      attempts: s.attempts.filter((a) => a.profileId === profile.id),
      acts: actsOf(s, profile.id),
      sets: s.sets.filter((x) => x.profileId === profile.id),
      prefs: profile.teaching,
      learner: profile,
      resolved: resolvedActsOf(s, profile.id, now),
    },
    now,
  );
  taught = { s, profile, hour, out };
  return out;
}
