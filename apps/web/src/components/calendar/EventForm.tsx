"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Field } from "@/components/ui";
import { useT } from "@/i18n";
import { shortDate } from "@/lib/format";
import { addEvent, checkEvent, removeEvent, suggestSkills, updateEvent, type EventInput } from "@/lib/school";
import { read } from "@/lib/store";
import type { Locale } from "@/lib/types";
import { fromLocalDate } from "@/planner/dates";
import type { EventKind, SchoolClass, SchoolEvent } from "@/planner/types";
import { SkillPicker } from "./SkillPicker";

export const KINDS: EventKind[] = ["test", "quiz", "homework", "project", "no-school", "event"];
/** Kinds that are about schoolwork, so linking a skill makes sense (prep for tests, practice for work due). */
const WORK: EventKind[] = ["test", "quiz", "homework", "project"];

export type FormDone = { message: string; date?: string } | undefined;

/**
 * Add or edit one school item. Inline, not a modal: the week stays visible below it. A new test or
 * homework with no skill chosen is linked to the first suggestion, and the form says so beforehand.
 */
export function EventForm({ profileId, event, date, kind, classes, locale, onDone }: { profileId: string; event?: SchoolEvent; date?: string; kind?: EventKind; classes: SchoolClass[]; locale: Locale; onDone: (done: FormDone) => void }) {
  const t = useT();
  const [form, setForm] = useState<EventInput>(() => ({
    title: event?.title ?? "",
    kind: event?.kind ?? kind ?? "test",
    date: event?.date ?? date ?? "",
    time: event?.time ?? "",
    classId: event?.classId ?? "",
    notes: event?.notes ?? "",
    skillIds: event?.skillIds ?? [],
  }));
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const dateInput = useRef<HTMLInputElement>(null);
  const set = <K extends keyof EventInput>(k: K, v: EventInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const suggestions = form.title.trim().length > 2 ? suggestSkills(read(), `${form.title} ${form.notes ?? ""}`, form.classId || undefined) : [];
  const autoLink = !event && !form.skillIds?.length && WORK.includes(form.kind) && suggestions.length > 0;

  // Opening the form moves focus to it, so keyboard and screen-reader users land where they asked to go.
  useEffect(() => heading.current?.focus(), []);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const err = checkEvent(form);
    if (err) {
      setError(err);
      (err === "err.title" ? titleInput : dateInput).current?.focus();
      return;
    }
    const input = { ...form, classId: form.classId || undefined, skillIds: autoLink ? suggestions.slice(0, 1) : form.skillIds };
    if (event) updateEvent(event.id, input);
    else addEvent(profileId, input);
    onDone({ message: t("cal.saved", { title: form.title.trim(), when: shortDate(fromLocalDate(form.date).getTime(), locale) }), date: form.date });
  };

  return (
    <form onSubmit={save} aria-labelledby="event-form-title" className="space-y-5 rounded-lg border border-border bg-panel p-4 shadow-soft sm:p-6" noValidate>
      <h2 id="event-form-title" ref={heading} tabIndex={-1} className="font-brand text-t2 font-semibold text-ink">
        {event ? t("calendar.editTitle") : t("calendar.addTitle")}
      </h2>
      <Field label={t("calendar.what")} error={error === "err.title" ? t("calendar.errTitle") : undefined}>
        {(a) => <input {...a} ref={titleInput} className="k-input" value={form.title} maxLength={160} onChange={(e) => set("title", e.target.value)} placeholder={t("calendar.whatPlaceholder")} />}
      </Field>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-ink">{t("calendar.kind")}</legend>
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <label key={k} className="relative">
              <input type="radio" name="event-kind" value={k} checked={form.kind === k} onChange={() => set("kind", k)} className="peer sr-only" />
              <span className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-border bg-panel px-4 text-sm font-medium text-muted transition-colors hover:border-ink/30 hover:text-ink peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2">
                {t(`event.${k}`)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("calendar.date")} error={error === "err.date" ? t("calendar.errDate") : undefined}>
          {(a) => <input {...a} ref={dateInput} type="date" className="k-input" value={form.date} onChange={(e) => set("date", e.target.value)} />}
        </Field>
        <Field label={t("calendar.time")} hint={t("calendar.optional")}>
          {(a) => <input {...a} type="time" className="k-input" value={form.time} onChange={(e) => set("time", e.target.value)} />}
        </Field>
      </div>
      {classes.length > 0 && (
        <Field label={t("calendar.class")}>
          {(a) => (
            <select {...a} className="k-input" value={form.classId} onChange={(e) => set("classId", e.target.value)}>
              <option value="">{t("calendar.noClass")}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}
      <div className="space-y-1.5">
        <SkillPicker value={form.skillIds ?? []} onChange={(ids) => set("skillIds", ids)} suggestions={suggestions} locale={locale} label={t("calendar.skills")} />
        {autoLink && <p className="text-xs text-muted">{t("cal.autoLink")}</p>}
      </div>
      <Field label={t("calendar.notes")} hint={t("calendar.optional")}>
        {(a) => <textarea {...a} rows={2} className="k-input min-h-20 py-2" value={form.notes} maxLength={1000} onChange={(e) => set("notes", e.target.value)} />}
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">{t("common.save")}</Button>
        <Button variant="secondary" onClick={() => onDone(undefined)}>
          {t("common.cancel")}
        </Button>
        {event &&
          (confirm ? (
            <span className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <span className="text-sm text-ink">{t("cal.deleteItem", { title: event.title })}</span>
              <Button variant="secondary" className="text-bad" onClick={() => (removeEvent(event.id), onDone({ message: t("cal.deleted", { title: event.title }) }))}>
                {t("common.confirmDelete")}
              </Button>
              <Button variant="ghost" onClick={() => setConfirm(false)}>
                {t("common.cancel")}
              </Button>
            </span>
          ) : (
            <Button variant="ghost" className="sm:ml-auto" onClick={() => setConfirm(true)}>
              {t("common.delete")}
            </Button>
          ))}
      </div>
    </form>
  );
}
