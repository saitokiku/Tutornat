"use client";

import { useRef, useState } from "react";
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
const SHOWN = 12;

/** Books read, by whom and for how long. Counts toward English minutes in records. Deleting a book asks first. */
export function ReadingLog({ child, now }: { child: Profile; now: number }) {
  const t = useT();
  const entries = useStore((s) => s.reading.filter((r) => r.profileId === child.id).sort((a, b) => b.date.localeCompare(a.date)));
  const [form, setForm] = useState({ title: "", author: "", minutes: "20", date: localDate(now) });
  const young = ["K", "1", "2"].includes(child.grade);
  const libraries = RESOURCES.filter((r) => LIBRARIES.includes(r.id) && (young ? r.grades[0] === "K" : r.grades[1] !== "3"));
  const [asking, setAsking] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const trash = useRef(new Map<string, HTMLButtonElement>());
  const id = `reading-${child.id}`;
  const shown = all ? entries : entries.slice(0, SHOWN);
  // Focus never drops to the page: back to the book's delete button on cancel, on to the next after a delete.
  const focusLater = (entryId?: string) => requestAnimationFrame(() => (entryId ? trash.current.get(entryId) : document.getElementById(id))?.focus());
  const remove = (entryId: string) => {
    const i = shown.findIndex((r) => r.id === entryId);
    const next = shown[i + 1] ?? shown[i - 1];
    removeReading(entryId);
    setAsking(null);
    focusLater(next?.id);
  };
  return (
    <section aria-labelledby={id} className="space-y-4">
      <h2 id={id} tabIndex={-1} className="font-brand text-t2 font-semibold text-ink outline-none">
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
          {shown.map((r) => (
            <li key={r.id} className="px-4 py-3 sm:px-5">
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-medium text-ink">{r.title}</span>
                  <span className="block text-xs text-muted">
                    {r.author ? `${r.author} · ` : ""}
                    {shortDate(fromLocalDate(r.date).getTime(), child.locale)}
                  </span>
                </span>
                <span className="font-opmono text-xs tabular-nums text-muted">{t("common.minutes", { n: r.minutes })}</span>
                {asking !== r.id && (
                  <button
                    ref={(el) => void (el ? trash.current.set(r.id, el) : trash.current.delete(r.id))}
                    type="button"
                    onClick={() => setAsking(r.id)}
                    aria-label={`${t("common.delete")}: ${r.title}`}
                    className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-panel2 hover:text-bad"
                  >
                    <IconTrash size={16} />
                  </button>
                )}
              </div>
              {asking === r.id && (
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2">
                  <p id={`${id}-ask`} className="min-w-0 flex-1 text-sm text-ink">
                    {t("lm.reading.deleteAsk", { title: r.title })}
                  </p>
                  <Button variant="ghost" aria-describedby={`${id}-ask`} onClick={() => (setAsking(null), focusLater(r.id))}>
                    {t("common.cancel")}
                  </Button>
                  <Button variant="secondary" aria-describedby={`${id}-ask`} autoFocus onClick={() => remove(r.id)}>
                    {t("common.confirmDelete")}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {entries.length > SHOWN && (
        <Button variant="ghost" aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? t("lm.list.fewer") : t("lm.list.all", { n: entries.length })}
        </Button>
      )}
      <ResourceList list={libraries} locale={child.locale} title={t("reading.where")} max={4} />
    </section>
  );
}
