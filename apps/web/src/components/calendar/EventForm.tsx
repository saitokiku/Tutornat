"use client";

import { useState } from "react";
import { Button, Field } from "@/components/ui";
import { useT } from "@/i18n";
import { addEvent, checkEvent, removeEvent, suggestSkills, updateEvent, type EventInput } from "@/lib/school";
import { read } from "@/lib/store";
import type { Locale } from "@/lib/types";
import type { EventKind, SchoolClass, SchoolEvent } from "@/planner/types";
import { SkillPicker } from "./SkillPicker";

export const KINDS: EventKind[] = ["test", "quiz", "homework", "project", "no-school", "event"];

/** Add or edit one school item. Inline, not a modal: the week stays visible beside it. */
export function EventForm({ profileId, event, date, classes, locale, onDone }: { profileId: string; event?: SchoolEvent; date?: string; classes: SchoolClass[]; locale: Locale; onDone: () => void }) {
  const t = useT();
  const [form, setForm] = useState<EventInput>(() => ({
    title: event?.title ?? "",
    kind: event?.kind ?? "test",
    date: event?.date ?? date ?? "",
    time: event?.time ?? "",
    classId: event?.classId ?? "",
    notes: event?.notes ?? "",
    skillIds: event?.skillIds ?? [],
  }));
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const set = <K extends keyof EventInput>(k: K, v: EventInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const suggestions = form.title.trim().length > 2 ? suggestSkills(read(), `${form.title} ${form.notes ?? ""}`, form.classId || undefined) : [];

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const err = checkEvent(form);
    if (err) return setError(err);
    const input = { ...form, classId: form.classId || undefined };
    if (event) updateEvent(event.id, input);
    else addEvent(profileId, input);
    onDone();
  };

  return (
    <form onSubmit={save} className="space-y-5 rounded-lg border border-border bg-panel p-5 shadow-soft sm:p-6" noValidate>
      <h2 className="font-brand text-t2 font-semibold text-ink">{event ? t("calendar.editTitle") : t("calendar.addTitle")}</h2>
      <Field label={t("calendar.what")} error={error === "err.title" ? t("calendar.errTitle") : undefined}>
        {(a) => <input {...a} className="k-input" value={form.title} maxLength={160} onChange={(e) => set("title", e.target.value)} placeholder={t("calendar.whatPlaceholder")} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("calendar.kind")}>
          {(a) => (
            <select {...a} className="k-input" value={form.kind} onChange={(e) => set("kind", e.target.value as EventKind)}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`event.${k}`)}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={t("calendar.date")} error={error === "err.date" ? t("calendar.errDate") : undefined}>
          {(a) => <input {...a} type="date" className="k-input" value={form.date} onChange={(e) => set("date", e.target.value)} />}
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
      <SkillPicker value={form.skillIds ?? []} onChange={(ids) => set("skillIds", ids)} suggestions={suggestions} locale={locale} label={t("calendar.skills")} />
      <Field label={t("calendar.notes")} hint={t("calendar.optional")}>
        {(a) => <textarea {...a} rows={2} className="k-input min-h-20 py-2" value={form.notes} maxLength={1000} onChange={(e) => set("notes", e.target.value)} />}
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">{t("common.save")}</Button>
        <Button variant="secondary" onClick={onDone}>
          {t("common.cancel")}
        </Button>
        {event &&
          (confirm ? (
            <Button variant="ghost" className="ml-auto text-bad" onClick={() => (removeEvent(event.id), onDone())}>
              {t("common.confirmDelete")}
            </Button>
          ) : (
            <Button variant="ghost" className="ml-auto" onClick={() => setConfirm(true)}>
              {t("common.delete")}
            </Button>
          ))}
      </div>
    </form>
  );
}
