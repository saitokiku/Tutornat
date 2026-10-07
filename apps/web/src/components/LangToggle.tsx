"use client";

import { useLocale } from "@/i18n";
import { update } from "@/lib/store";
import type { Locale } from "@/lib/types";

/** EN/ES switch for signed-out pages and the family's own language. */
export function LangToggle() {
  const locale = useLocale();
  const set = (l: Locale) => update((s) => void (s.prefs.locale = l));
  return (
    <div className="inline-flex rounded-full border border-border bg-panel p-0.5 text-xs font-semibold">
      {(["en", "es"] as const).map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={locale === l}
          onClick={() => set(l)}
          className={`min-h-8 rounded-full px-2.5 uppercase ${locale === l ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
