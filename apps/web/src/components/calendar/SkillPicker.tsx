"use client";

import { useId, useMemo, useState } from "react";
import { IconPlus, IconX } from "@/components/icons";
import { useT } from "@/i18n";
import type { Locale } from "@/lib/types";
import { getSkill, SKILLS } from "@/practice/skills";

/** Linked skills as removable chips, plus a search to add more. Suggestions show as dashed chips. */
export function SkillPicker({ value, onChange, suggestions = [], locale, label }: { value: string[]; onChange: (ids: string[]) => void; suggestions?: string[]; locale: Locale; label: string }) {
  const t = useT();
  const id = useId();
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
      {(value.length > 0 || extra.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {value.map((id) => (
            <span key={id} className="inline-flex min-h-11 items-center gap-1 rounded-full border border-border bg-panel2 pl-3 text-xs text-ink">
              {getSkill(id)?.title[locale] ?? id}
              <button type="button" aria-label={`${t("calendar.unlink")}: ${getSkill(id)?.title[locale] ?? id}`} onClick={() => onChange(value.filter((x) => x !== id))} className="grid size-11 place-items-center rounded-full text-muted hover:bg-panel hover:text-ink">
                <IconX size={14} />
              </button>
            </span>
          ))}
          {extra.map((id) => (
            <button key={id} type="button" onClick={() => onChange([...value, id])} aria-label={t("cal.linkSkill", { skill: getSkill(id)!.title[locale] })} className="inline-flex min-h-11 items-center gap-1 rounded-full border border-dashed border-accent/60 px-3 text-xs text-accent hover:bg-accent/5">
              <IconPlus size={12} /> {getSkill(id)!.title[locale]}
            </button>
          ))}
        </div>
      )}
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("calendar.skillSearch")} aria-label={t("calendar.skillSearch")} aria-controls={results.length ? `${id}-results` : undefined} className="k-input h-11 text-sm" />
      {results.length > 0 && (
        <ul id={`${id}-results`} aria-label={t("cal.skillResults")} className="divide-y divide-border rounded-md border border-border bg-panel">
          {results.map((k) => (
            <li key={k.id}>
              <button type="button" onClick={() => (onChange([...value, k.id]), setQ(""))} className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm text-ink hover:bg-panel2">
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
