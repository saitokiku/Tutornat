"use client";

import { useStore } from "@/lib/store";
import type { Grade, Locale } from "@/lib/types";
import en, { type Key } from "./en";
import es from "./es";

export type { Key };
const dicts: Record<Locale, Record<Key, string>> = { en, es };

export function t(locale: Locale, key: Key, vars?: Record<string, string | number>): string {
  const s = dicts[locale][key] ?? en[key];
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}

/** Active learner's language, else the device preference. */
export function useLocale(): Locale {
  return useStore((s) => {
    const p = s.profiles.find((x) => x.id === s.session.profileId);
    return p?.locale ?? s.prefs.locale;
  });
}

export function useT() {
  const locale = useLocale();
  return (key: Key, vars?: Record<string, string | number>) => t(locale, key, vars);
}

export function gradeLabel(locale: Locale, g: Grade, short = false) {
  if (g === "K") return t(locale, short ? "grade.short.K" : "grade.K");
  if (g === "adult") return t(locale, short ? "grade.short.adult" : "grade.adult");
  return t(locale, short ? "grade.short.n" : "grade.n", { n: g });
}
