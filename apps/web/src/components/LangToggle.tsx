"use client";

import { useLocale, useT } from "@/i18n";
import { update } from "@/lib/store";
import type { Locale } from "@/lib/types";

const NAME = { en: "ds.lang.en", es: "ds.lang.es" } as const;

/** EN/ES switch for signed-out pages and the family's own language. Each language is named in itself. */
export function LangToggle() {
  const t = useT();
  const locale = useLocale();
  const set = (l: Locale) => update((s) => void (s.prefs.locale = l));
  return (
    <div role="group" aria-label={t("ds.lang.group")} className="inline-flex rounded-full border border-border bg-panel p-0.5 text-xs font-semibold">
      {(["en", "es"] as const).map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-label={t(NAME[l])}
          aria-pressed={locale === l}
          onClick={() => set(l)}
          className={`min-h-8 min-w-10 rounded-full px-2.5 uppercase transition-colors duration-(--duration-quick) pointer-coarse:min-h-11 pointer-coarse:min-w-11 ${
            locale === l ? "bg-ink text-paper" : "text-muted hover:text-ink"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
