import { t, useLocale, type Key } from "@/i18n";
import en from "@/i18n/en";
import type { Sentence, SentenceVar } from "@/learning/outcomes";
import { tagLabel } from "@/learning/profile";
import type { Locale } from "@/lib/types";
import { getSkill } from "@/practice/skills";

const listOf = (items: string[], locale: Locale) => new Intl.ListFormat(locale, { type: "conjunction" }).format(items);

/**
 * A misconception tag in the reader's language: its translation when there is one, the author's own
 * words in English, and otherwise a plain "a mistake that comes back" (the skill and answer still say which).
 */
export function tagText(tag: string, locale: Locale): string {
  const key = `lm.why.tag.${tag}` as Key;
  if (key in en) return `“${t(locale, key)}”`;
  return locale === "en" ? `“${tagLabel(tag)}”` : t(locale, "lm.why.tag");
}

function word(v: SentenceVar, locale: Locale): string | number {
  if (typeof v !== "object") return v;
  if ("key" in v) return t(locale, v.key);
  if ("tag" in v) return tagText(v.tag, locale);
  if ("skills" in v) return listOf(v.skills.map((id) => getSkill(id)?.title[locale] ?? id), locale);
  return listOf(v.list.map((s) => say(s, locale)), locale);
}

/** A learner-model sentence in words: values that are keys, tags, skills or lists are put in words first. */
export function say(s: Sentence, locale: Locale): string {
  const vars = Object.fromEntries(Object.entries(s.vars ?? {}).map(([k, v]) => [k, word(v, locale)]));
  return t(locale, s.key, vars);
}

export function useSay() {
  const locale = useLocale();
  return (s: Sentence) => say(s, locale);
}
