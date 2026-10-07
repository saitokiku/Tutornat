import { t, useLocale } from "@/i18n";
import type { Sentence } from "@/learning/outcomes";
import type { Locale } from "@/lib/types";

/** A learner-model sentence in words: values that are keys are translated first. */
export function say(s: Sentence, locale: Locale): string {
  const vars = Object.fromEntries(Object.entries(s.vars ?? {}).map(([k, v]) => [k, typeof v === "object" ? t(locale, v.key) : v]));
  return t(locale, s.key, vars);
}

export function useSay() {
  const locale = useLocale();
  return (s: Sentence) => say(s, locale);
}
