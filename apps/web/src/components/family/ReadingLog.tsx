"use client";

import { useState } from "react";
import { IconTrash } from "@/components/icons";
import { ResourceList } from "@/components/resources/ResourceList";
import { Button, Field } from "@/components/ui";
import { useT } from "@/i18n";
import { addReading, removeReading } from "@/lib/family";
import { shortDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { fromLocalDate, localDate } from "@/planner/dates";
import { RESOURCES } from "@/resources/list";

const LIBRARIES = ["unite-literacy", "storyline", "gutenberg-children", "open-library", "libby", "lit2go"];

/** Books read, by whom and for how long. Counts toward English minutes in records. */
export function ReadingLog({ child, now }: { child: Profile; now: number }) {
  const t = useT();
  const entries = useStore((s) => s.reading.filter((r) => r.profileId === child.id).sort((a, b) => b.date.localeCompare(a.date)));
  const [form, setForm] = useState({ title: "", author: "", minutes: "20", date: localDate(now) });
  const young = ["K", "1", "2"].includes(child.grade);
  const libraries = RESOURCES.filter((r) => LIBRARIES.includes(r.id) && (young ? r.grades[0] === "K" : r.grades[1] !== "3"));
  return (
    <section aria-labelledby={`reading-${child.id}`} className="space-y-4">
      <h2 id={`reading-${child.id}`} className="font-brand text-t2 font-semibold text-ink">
        {t("reading.title")}
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (addReading(child.id, { ...form, minutes: Number(form.minutes) })) setForm({ ...form, title: "", author: "" });
        }}
        className="grid gap-3 rounded-lg border border-dashed border-border p-4 sm:grid-cols-[1fr_1fr_6rem_9rem_auto] sm:items-end"
      >
        <Field label={t("reading.book")}>{(a) => <input {...a} className="k-input" value={form.title} maxLength={160} onChange={(e) => setForm({ ...form, title: e.target.value })} />}</Field>
        <Field label={t("reading.author")} hint={t("calendar.optional")}>{(a) => <input {...a} className="k-input" value={form.author} maxLength={120} onChange={(e) => setForm({ ...form, author: e.target.value })} />}</Field>
        <Field label={t("reading.minutes")}>{(a) => <input {...a} inputMode="numeric" className="k-input" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value.replace(/\D/g, "").slice(0, 3) })} />}</Field>
        <Field label={t("calendar.date")}>{(a) => <input {...a} type="date" className="k-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />}</Field>
        <Button type="submit" variant="secondary" disabled={!form.title.trim() || !Number(form.minutes)}>
          {t("reading.add")}
        </Button>
      </form>
      {entries.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border bg-panel">
          {entries.slice(0, 12).map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">{r.title}</span>
                <span className="block text-xs text-muted">
                  {r.author ? `${r.author} · ` : ""}
                  {shortDate(fromLocalDate(r.date).getTime(), child.locale)}
                </span>
              </span>
              <span className="font-opmono text-xs tabular-nums text-muted">{t("common.minutes", { n: r.minutes })}</span>
              <button type="button" onClick={() => removeReading(r.id)} aria-label={`${t("common.delete")}: ${r.title}`} className="grid size-10 place-items-center rounded-full text-muted hover:bg-panel2 hover:text-bad">
                <IconTrash size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <ResourceList list={libraries} locale={child.locale} title={t("reading.where")} max={4} />
    </section>
  );
}
