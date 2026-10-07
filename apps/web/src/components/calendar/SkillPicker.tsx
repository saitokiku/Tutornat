"use client";

import { useMemo, useState } from "react";
import { IconPlus, IconX } from "@/components/icons";
import { useT } from "@/i18n";
import type { Locale } from "@/lib/types";
import { getSkill, SKILLS } from "@/practice/skills";

/** Linked skills as removable chips, plus a search to add more. Suggestions show as dashed chips. */
export function SkillPicker({ value, onChange, suggestions = [], locale, label }: { value: string[]; onChange: (ids: string[]) => void; suggestions?: string[]; locale: Locale; label: string }) {
  const t = useT();
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return SKILLS.filter((k) => !value.includes(k.id) && (k.title.en.toLowerCase().includes(s) || k.title.es.toLowerCase().includes(s))).slice(0, 6);
  }, [q, value]);
  const extra = suggestions.filter((id) => !value.includes(id) && getSkill(id));
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-ink">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {value.map((id) => (
          <span key={id} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border bg-panel2 pl-3 pr-1 text-xs text-ink">
            {getSkill(id)?.title[locale] ?? id}
            <button type="button" aria-label={`${t("calendar.unlink")}: ${getSkill(id)?.title[locale] ?? id}`} onClick={() => onChange(value.filter((x) => x !== id))} className="grid size-7 place-items-center rounded-full text-muted hover:bg-panel hover:text-ink">
              <IconX size={12} />
            </button>
          </span>
        ))}
        {extra.map((id) => (
          <button key={id} type="button" onClick={() => onChange([...value, id])} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-dashed border-accent/60 px-3 text-xs text-accent hover:bg-accent/5">
            <IconPlus size={12} /> {getSkill(id)!.title[locale]}
          </button>
        ))}
      </div>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("calendar.skillSearch")} aria-label={t("calendar.skillSearch")} className="k-input h-10 text-sm" />
      {results.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border bg-panel">
          {results.map((k) => (
            <li key={k.id}>
              <button type="button" onClick={() => (onChange([...value, k.id]), setQ(""))} className="flex min-h-10 w-full items-center gap-2 px-3 text-left text-sm text-ink hover:bg-panel2">
                <IconPlus size={14} className="text-muted" /> {k.title[locale]}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!value.length && !extra.length && <p className="text-xs text-muted">{t("calendar.skillsWhy")}</p>}
    </fieldset>
  );
}
