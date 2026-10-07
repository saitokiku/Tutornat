"use client";

import { useState } from "react";
import { IconTrash } from "@/components/icons";
import { Button, Field, SubjectDot } from "@/components/ui";
import { useT } from "@/i18n";
import { shortDate } from "@/lib/format";
import { addClass, addFeedback, addResult, feedbackOf, removeClass, removeFeedback, removeResult, resultsOf, suggestSkills } from "@/lib/school";
import { read, useStore } from "@/lib/store";
import type { Profile, Subject } from "@/lib/types";
import { fromLocalDate, localDate } from "@/planner/dates";
import type { SchoolClass } from "@/planner/types";
import { getSkill } from "@/practice/skills";
import { SkillPicker } from "./SkillPicker";

const SUBJECTS: Subject[] = ["math", "english", "science", "other"];

/** Classes, what teachers said, and scores from school — the school side of one learner. */
export function SchoolSection({ profile, classes, now }: { profile: Profile; classes: SchoolClass[]; now: number }) {
  const t = useT();
  return (
    <section aria-labelledby="school" className="space-y-8 border-t border-border pt-8">
      <h2 id="school" className="font-brand text-t1 font-semibold text-ink">
        {t("school.title")}
      </h2>
      <Classes profile={profile} classes={classes} />
      <Notes profile={profile} classes={classes} />
      <Scores profile={profile} classes={classes} now={now} />
    </section>
  );
}

function Classes({ profile, classes }: { profile: Profile; classes: SchoolClass[] }) {
  const t = useT();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState<Subject>("math");
  const [teacher, setTeacher] = useState("");
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addClass(profile.id, { name, subject, teacher })) return;
    setName("");
    setTeacher("");
  };
  return (
    <div className="space-y-3">
      <h3 className="font-brand text-t2 font-semibold text-ink">{t("school.classes")}</h3>
      {classes.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border bg-panel">
          {classes.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
              <span aria-hidden="true" className="size-3 rounded-full" style={{ background: c.color }} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">{c.name}</span>
                <span className="block text-xs text-muted">
                  {t(`subject.${c.subject}`)}
                  {c.teacher ? ` · ${c.teacher}` : ""}
                  {c.feedUrl ? ` · ${t("school.feedLinked")}` : ""}
                </span>
              </span>
              <button type="button" onClick={() => removeClass(c.id)} aria-label={`${t("common.delete")}: ${c.name}`} className="grid size-10 place-items-center rounded-full text-muted hover:bg-panel2 hover:text-bad">
                <IconTrash size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="grid gap-3 rounded-lg border border-dashed border-border p-4 sm:grid-cols-[1fr_9rem_1fr_auto] sm:items-end">
        <Field label={t("school.className")}>{(a) => <input {...a} className="k-input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder={t("school.classPlaceholder")} />}</Field>
        <Field label={t("school.subject")}>
          {(a) => (
            <select {...a} className="k-input" value={subject} onChange={(e) => setSubject(e.target.value as Subject)}>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {t(`subject.${s}`)}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={t("school.teacher")} hint={t("calendar.optional")}>{(a) => <input {...a} className="k-input" value={teacher} maxLength={60} onChange={(e) => setTeacher(e.target.value)} />}</Field>
        <Button type="submit" variant="secondary" disabled={!name.trim()}>
          {t("school.addClass")}
        </Button>
      </form>
    </div>
  );
}

function Notes({ profile, classes }: { profile: Profile; classes: SchoolClass[] }) {
  const t = useT();
  const notes = useStore((s) => feedbackOf(s, profile.id));
  const [text, setText] = useState("");
  const [classId, setClassId] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const suggestions = text.trim().length > 3 ? suggestSkills(read(), text, classId || undefined) : [];
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (addFeedback(profile.id, { text, classId: classId || undefined, skillIds: skills.length ? skills : suggestions.slice(0, 1) })) {
      setText("");
      setSkills([]);
    }
  };
  return (
    <div className="space-y-3">
      <h3 className="font-brand text-t2 font-semibold text-ink">{t("school.notes")}</h3>
      <p className="text-sm text-muted">{t("school.notesWhy")}</p>
      <form onSubmit={save} className="space-y-4 rounded-lg border border-dashed border-border p-4">
        <Field label={t("school.noteLabel")}>
          {(a) => <textarea {...a} rows={3} className="k-input min-h-24 py-2" value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} placeholder={t("school.notePlaceholder")} />}
        </Field>
        {classes.length > 0 && (
          <Field label={t("calendar.class")}>
            {(a) => (
              <select {...a} className="k-input max-w-xs" value={classId} onChange={(e) => setClassId(e.target.value)}>
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
        <SkillPicker value={skills} onChange={setSkills} suggestions={suggestions} locale={profile.locale} label={t("school.noteSkills")} />
        <Button type="submit" variant="secondary" disabled={!text.trim()}>
          {t("school.saveNote")}
        </Button>
      </form>
      {notes.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border bg-panel">
          {notes.map((n) => (
            <li key={n.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-ink">{n.text}</span>
                <span className="block text-xs text-muted">
                  {shortDate(n.at, profile.locale)}
                  {n.skillIds.length ? ` · ${t("school.practiceFor", { skills: n.skillIds.map((id) => getSkill(id)?.title[profile.locale]).filter(Boolean).join(", ") })}` : ` · ${t("school.noSkill")}`}
                </span>
              </span>
              <button type="button" onClick={() => removeFeedback(n.id)} aria-label={t("common.delete")} className="grid size-10 place-items-center rounded-full text-muted hover:bg-panel2 hover:text-bad">
                <IconTrash size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Scores({ profile, classes, now }: { profile: Profile; classes: SchoolClass[]; now: number }) {
  const t = useT();
  const results = useStore((s) => resultsOf(s, profile.id));
  const [form, setForm] = useState({ title: "", date: localDate(now), score: "", outOf: "", classId: "" });
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (addResult(profile.id, { title: form.title, date: form.date, score: Number(form.score), outOf: Number(form.outOf), classId: form.classId || undefined })) setForm({ ...form, title: "", score: "", outOf: "" });
  };
  return (
    <div className="space-y-3">
      <h3 className="font-brand text-t2 font-semibold text-ink">{t("school.scores")}</h3>
      <p className="text-sm text-muted">{t("school.scoresWhy")}</p>
      {results.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border bg-panel">
          {results.map((r) => {
            const cls = classes.find((c) => c.id === r.classId);
            return (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                {cls ? <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: cls.color }} /> : <SubjectDot subject="other" />}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">{r.title}</span>
                  <span className="block text-xs text-muted">
                    {shortDate(fromLocalDate(r.date).getTime(), profile.locale)}
                    {cls ? ` · ${cls.name}` : ""} · {t("school.fromSchool")}
                  </span>
                </span>
                <span className="font-opmono text-sm tabular-nums text-ink">
                  {r.score} / {r.outOf}
                </span>
                <button type="button" onClick={() => removeResult(r.id)} aria-label={t("common.delete")} className="grid size-10 place-items-center rounded-full text-muted hover:bg-panel2 hover:text-bad">
                  <IconTrash size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={save} className="grid gap-3 rounded-lg border border-dashed border-border p-4 sm:grid-cols-[1fr_9rem_5rem_5rem_auto] sm:items-end">
        <Field label={t("school.scoreTitle")}>{(a) => <input {...a} className="k-input" value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("school.scorePlaceholder")} />}</Field>
        <Field label={t("calendar.date")}>{(a) => <input {...a} type="date" className="k-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />}</Field>
        <Field label={t("school.score")}>{(a) => <input {...a} inputMode="decimal" className="k-input" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value.replace(/[^0-9.]/g, "") })} />}</Field>
        <Field label={t("school.outOf")}>{(a) => <input {...a} inputMode="decimal" className="k-input" value={form.outOf} onChange={(e) => setForm({ ...form, outOf: e.target.value.replace(/[^0-9.]/g, "") })} />}</Field>
        <Button type="submit" variant="secondary" disabled={!form.title.trim() || !form.score || !form.outOf}>
          {t("school.addScore")}
        </Button>
      </form>
    </div>
  );
}
