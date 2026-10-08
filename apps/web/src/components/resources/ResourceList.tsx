"use client";

import { useT } from "@/i18n";
import type { Locale } from "@/lib/types";
import { linkOf, resourcesFor, type Resource } from "@/resources";

const KIND_KEY = { video: "resources.kind.video", simulation: "resources.kind.simulation", book: "resources.kind.book", text: "resources.kind.text", practice: "resources.kind.practice", library: "resources.kind.library", tool: "resources.kind.tool" } as const;

/** Real sources to read, watch or try, as plain rows. Each opens the source's own site. */
export function ResourceList({ list, locale, title, max = 3 }: { list: Resource[]; locale: Locale; title?: string; max?: number }) {
  const t = useT();
  if (!list.length) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-ink">{title ?? t("resources.title")}</h3>
      <ul className="divide-y divide-border rounded-md border border-border bg-panel">
        {list.slice(0, max).map((r) => (
          <li key={r.id}>
            <a href={linkOf(r, locale)} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-0.5 px-4 py-3 hover:bg-panel2">
              <span className="text-sm font-medium text-ink underline-offset-4 hover:underline">{r.title}</span>
              <span className="text-xs text-muted">
                {r.source} · {t(KIND_KEY[r.kind])}
                {r.note?.[locale] ? ` · ${r.note[locale]}` : ""}
              </span>
              <span className="text-xs text-muted">{r.about[locale]}</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">{t("resources.why")}</p>
    </section>
  );
}

export function SkillResources({ skillId, grade, locale, max = 3 }: { skillId: string; grade?: string; locale: Locale; max?: number }) {
  return <ResourceList list={resourcesFor({ skillId, grade, locale })} locale={locale} max={max} />;
}
