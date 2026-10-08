"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { IconPen, IconRefresh, IconTrash } from "@/components/icons";
import { Button, Field, SubjectDot } from "@/components/ui";
import { useT } from "@/i18n";
import { shortDate } from "@/lib/format";
import { addClass, addFeedback, addResult, feedbackOf, removeClass, removeFeedback, removeResult, resultsOf, suggestSkills, updateClass, type Draft } from "@/lib/school";
import { read, useStore } from "@/lib/store";
import { SUBJECTS, type Locale, type Profile, type Subject } from "@/lib/types";
import { refreshClass, unlinkCalendar, type RefreshResult } from "@/lib/week";
import { fromLocalDate, localDate } from "@/planner/dates";
import type { SchoolClass } from "@/planner/types";
import { getSkill } from "@/practice/skills";
import { refreshText } from "./feed";
import { SkillPicker } from "./SkillPicker";

type Props = { profile: Profile; classes: SchoolClass[]; now: number; onLinkCalendar: (classId: string) => void; onReview: (classId: string, drafts: Draft[]) => void };

/** Classes, what teachers said, and scores from school — the school side of one learner. */
export function SchoolSection(props: Props) {
  const t = useT();
  return (
    <section aria-labelledby="school" className="space-y-10 border-t border-border pt-8">
      <h2 id="school" className="font-brand text-t1 font-semibold text-ink">
        {t("school.title")}
      </h2>
      <Classes {...props} />
      <Notes profile={props.profile} classes={props.classes} />
      <Scores profile={props.profile} classes={props.classes} now={props.now} />
    </section>
  );
}

/** A section heading that can take focus, so focus has somewhere to go when a row is deleted. */
function Heading({ at, children }: { at: RefObject<HTMLHeadingElement | null>; children: React.ReactNode }) {
  return (
    <h3 ref={at} tabIndex={-1} className="font-brand text-t2 font-semibold text-ink outline-none">
      {children}
    </h3>
  );
}

/**
 * "Delete X?" with a confirm step, the way every destructive action here works. The question takes
 * focus on "Yes, delete"; Cancel gives it back to the trash button; after a delete it goes to `after`.
 */
function ConfirmDelete({ label, what, onDelete, after }: { label: string; what: string; onDelete: () => void; after: RefObject<HTMLElement | null> }) {
  const t = useT();
  const [asking, setAsking] = useState(false);
  const trash = useRef<HTMLButtonElement>(null);
  const back = useRef(false);
  useEffect(() => {
    if (asking || !back.current) return;
    back.current = false;
    trash.current?.focus();
  }, [asking]);
  if (!asking)
    return (
      <button ref={trash} type="button" onClick={() => setAsking(true)} aria-label={`${t("common.delete")}: ${label}`} className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-panel2 hover:text-bad">
        <IconTrash size={16} />
      </button>
    );
  return (
    <span role="group" aria-label={what} className="flex basis-full flex-wrap items-center justify-end gap-2 sm:basis-auto">
      <span className="text-sm text-ink">{what}</span>
      <Button variant="secondary" className="text-bad" autoFocus onClick={() => (onDelete(), after.current?.focus())}>
        {t("common.confirmDelete")}
      </Button>
      <Button variant="ghost" onClick={() => ((back.current = true), setAsking(false))}>
        {t("common.cancel")}
      </Button>
    </span>
  );
}

function ClassRow({ c, profile, now, onLinkCalendar, onReview, after }: { c: SchoolClass; profile: Profile; now: number; onLinkCalendar: (classId: string) => void; onReview: Props["onReview"]; after: RefObject<HTMLElement | null> }) {
  const t = useT();
  const initial = () => ({ name: c.name, subject: c.subject, teacher: c.teacher ?? "", unlink: false });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RefreshResult | null>(null);
  const pen = useRef<HTMLButtonElement>(null);
  const back = useRef(false);
  useEffect(() => {
    if (editing || !back.current) return;
    back.current = false;
    pen.current?.focus();
  }, [editing]);
  const close = () => {
    back.current = true;
    setEditing(false);
  };
  const refresh = async () => {
    setBusy(true);
    setResult(await refreshClass(profile.id, c.id, localDate(now)));
    setBusy(false);
  };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    updateClass(c.id, { name: form.name, subject: form.subject, teacher: form.teacher.trim() || undefined });
    if (form.unlink) {
      unlinkCalendar(c.id);
      setResult(null);
    }
    close();
  };

  if (editing)
    return (
      <li className="px-4 py-4 sm:px-5">
        <form onSubmit={save} aria-label={t("cal.editClass", { name: c.name })} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_9rem_1fr]">
            <Field label={t("school.className")}>{(a) => <input {...a} autoFocus className="k-input" value={form.name} maxLength={60} onChange={(e) => setForm({ ...form, name: e.target.value })} />}</Field>
            <Field label={t("school.subject")}>
              {(a) => (
                <select {...a} className="k-input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value as Subject })}>
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {t(`subject.${s}`)}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label={t("school.teacher")}>{(a) => <input {...a} className="k-input" value={form.teacher} maxLength={60} placeholder={t("calendar.optional")} onChange={(e) => setForm({ ...form, teacher: e.target.value })} />}</Field>
          </div>
          {c.feedUrl && (
            <div className="flex flex-wrap items-center gap-3 rounded-sm border border-border bg-panel2/60 px-3 py-2">
              <p role="status" className="min-w-0 flex-1 text-sm text-muted">
                {t(form.unlink ? "cal.unlinkOnSave" : "cal.linkedNote")}
              </p>
              <Button variant="secondary" onClick={() => setForm({ ...form, unlink: !form.unlink })}>
                {t(form.unlink ? "cal.keepLinkHere" : "cal.unlinkCalendar")}
              </Button>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={!form.name.trim()}>
              {t("common.save")}
            </Button>
            <Button variant="secondary" onClick={() => (setForm(initial()), close())}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </li>
    );

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
      <span aria-hidden="true" className="size-3 shrink-0 rounded-full" style={{ background: c.color }} />
      <span className="min-w-0 flex-1 basis-40">
        <span className="block break-words text-sm font-medium text-ink">{c.name}</span>
        <span className="block text-xs text-muted">
          {t(`subject.${c.subject}`)}
          {c.teacher ? ` · ${c.teacher}` : ""}
          {c.feedUrl ? ` · ${t("school.feedLinked")}` : ""}
        </span>
        {result && (
          <span role="status" className={`block text-xs ${result.ok ? "text-good" : "text-warn"}`}>
            {refreshText(result, t)}
          </span>
        )}
      </span>
      <span className="ml-auto flex flex-wrap items-center justify-end gap-1">
        {result?.ok && result.fresh.length > 0 && (
          <Button variant="secondary" onClick={() => (onReview(c.id, result.fresh), setResult(null))}>{t("cal.reviewNew", { n: result.fresh.length })}</Button>
        )}
        {c.feedUrl ? (
          <Button variant="secondary" loading={busy} onClick={refresh} aria-label={`${t("cal.refresh")}: ${c.name}`}>
            <IconRefresh size={14} /> {t("cal.refresh")}
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => onLinkCalendar(c.id)} aria-label={`${t("cal.linkCalendar")}: ${c.name}`}>
            {t("cal.linkCalendar")}
          </Button>
        )}
        <button ref={pen} type="button" onClick={() => (setForm(initial()), setEditing(true))} aria-label={`${t("common.edit")}: ${c.name}`} className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-panel2 hover:text-ink">
          <IconPen size={16} />
        </button>
        <ConfirmDelete label={c.name} what={t("cal.deleteClass", { name: c.name })} onDelete={() => removeClass(c.id)} after={after} />
      </span>
    </li>
  );
}

function Classes({ profile, classes, now, onLinkCalendar, onReview }: Props) {
  const t = useT();
  const heading = useRef<HTMLHeadingElement>(null);
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
      <Heading at={heading}>{t("school.classes")}</Heading>
      <p className="text-sm text-muted">{t("cal.classesWhy")}</p>
      {classes.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border bg-panel">
          {classes.map((c) => (
            <ClassRow key={c.id} c={c} profile={profile} now={now} onLinkCalendar={onLinkCalendar} onReview={onReview} after={heading} />
          ))}
        </ul>
      )}
      <form onSubmit={add} aria-label={t("school.addClass")} className="grid gap-3 rounded-lg border border-dashed border-border p-4 sm:grid-cols-[1fr_9rem_1fr_auto] sm:items-end">
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
        <Field label={t("school.teacher")}>{(a) => <input {...a} className="k-input" value={teacher} maxLength={60} placeholder={t("calendar.optional")} onChange={(e) => setTeacher(e.target.value)} />}</Field>
        <Button type="submit" variant="secondary" disabled={!name.trim()}>
          {t("school.addClass")}
        </Button>
      </form>
    </div>
  );
}

function Notes({ profile, classes }: { profile: Profile; classes: SchoolClass[] }) {
  const t = useT();
  const heading = useRef<HTMLHeadingElement>(null);
  const notes = useStore((s) => feedbackOf(s, profile.id));
  const [text, setText] = useState("");
  const [classId, setClassId] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  // Until the grown-up picks or removes a skill, the one the note's words point to stands in, shown as linked.
  const [picked, setPicked] = useState(false);
  const suggestions = text.trim().length > 3 ? suggestSkills(read(), text, { profileId: profile.id, classId: classId || undefined }) : [];
  const auto = !picked && suggestions.length > 0;
  const linked = auto ? suggestions.slice(0, 1) : skills;
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (addFeedback(profile.id, { text, classId: classId || undefined, skillIds: linked })) {
      setText("");
      setSkills([]);
      setPicked(false);
    }
  };
  return (
    <div className="space-y-3">
      <Heading at={heading}>{t("school.notes")}</Heading>
      <p className="text-sm text-muted">{t("school.notesWhy")}</p>
      {notes.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border bg-panel">
          {notes.map((n) => {
            const cls = classes.find((c) => c.id === n.classId);
            const skillNames = n.skillIds.map((id) => getSkill(id)?.title[profile.locale]).filter(Boolean).join(", ");
            return (
              <li key={n.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
                <span className="min-w-0 flex-1 basis-40">
                  <span className="block break-words text-sm text-ink">{n.text}</span>
                  <span className="block text-xs text-muted">
                    {shortDate(n.at, profile.locale)}
                    {cls ? ` · ${cls.name}` : ""}
                    {n.source === "ai" ? ` · ${t("cal.readByAi")}` : ""}
                    {skillNames ? ` · ${t("school.practiceFor", { skills: skillNames })}` : ` · ${t("school.noSkill")}`}
                  </span>
                </span>
                <ConfirmDelete label={n.text.slice(0, 40)} what={t("cal.deleteNote")} onDelete={() => removeFeedback(n.id)} after={heading} />
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={save} aria-label={t("school.saveNote")} className="space-y-4 rounded-lg border border-dashed border-border p-4">
        <Field label={t("school.noteLabel")}>
          {(a) => <textarea {...a} rows={3} className="k-input min-h-24 py-2" value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} placeholder={t("school.notePlaceholder")} />}
        </Field>
        {classes.length > 0 && (
          <Field label={t("calendar.class")}>
            {(a) => (
              <select {...a} className="k-input sm:max-w-xs" value={classId} onChange={(e) => setClassId(e.target.value)}>
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
          <SkillPicker value={linked} onChange={(ids) => (setPicked(true), setSkills(ids))} suggestions={suggestions} locale={profile.locale} label={t("school.noteSkills")} />
          {auto && <p className="text-xs text-muted">{t("cal.autoLinked")}</p>}
        </div>
        <Button type="submit" variant="secondary" disabled={!text.trim()}>
          {t("school.saveNote")}
        </Button>
      </form>
    </div>
  );
}

/** What a grown-up typed as a number. A decimal comma (8,5 on a Spanish keyboard) is a decimal point. */
export const decimal = (v: string) =>
  v
    .replace(/,/g, ".")
    .replace(/[^0-9.]/g, "")
    .replace(/(\..*)\./g, "$1");
const shown = (n: number, l: Locale) => new Intl.NumberFormat(l === "es" ? "es-US" : "en-US", { maximumFractionDigits: 2 }).format(n);

function Scores({ profile, classes, now }: { profile: Profile; classes: SchoolClass[]; now: number }) {
  const t = useT();
  const heading = useRef<HTMLHeadingElement>(null);
  const results = useStore((s) => resultsOf(s, profile.id));
  const [form, setForm] = useState({ title: "", date: localDate(now), score: "", outOf: "", classId: "" });
  const [error, setError] = useState(false);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = addResult(profile.id, { title: form.title, date: form.date, score: Number(form.score), outOf: Number(form.outOf), classId: form.classId || undefined });
    setError(!ok);
    if (ok) setForm({ ...form, title: "", score: "", outOf: "" });
  };
  return (
    <div className="space-y-3">
      <Heading at={heading}>{t("school.scores")}</Heading>
      <p className="text-sm text-muted">{t("school.scoresWhy")}</p>
      {results.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border bg-panel">
          {results.map((r) => {
            const cls = classes.find((c) => c.id === r.classId);
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
                {cls ? <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: cls.color }} /> : <SubjectDot subject="other" />}
                <span className="min-w-0 flex-1 basis-40">
                  <span className="block break-words text-sm font-medium text-ink">{r.title}</span>
                  <span className="block text-xs text-muted">
                    {shortDate(fromLocalDate(r.date).getTime(), profile.locale)}
                    {cls ? ` · ${cls.name}` : ""} · {t("school.fromSchool")}
                  </span>
                </span>
                <span className="font-opmono text-sm tabular-nums text-ink">
                  {shown(r.score, profile.locale)} / {shown(r.outOf, profile.locale)}
                </span>
                <ConfirmDelete label={r.title} what={t("cal.deleteScore", { title: r.title })} onDelete={() => removeResult(r.id)} after={heading} />
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={save} aria-label={t("school.addScore")} className="grid gap-3 rounded-lg border border-dashed border-border p-4 sm:grid-cols-[1fr_9.5rem_5.5rem_5.5rem] sm:items-end">
        <Field label={t("school.scoreTitle")}>{(a) => <input {...a} className="k-input" value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("school.scorePlaceholder")} />}</Field>
        <Field label={t("calendar.date")}>{(a) => <input {...a} type="date" className="k-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />}</Field>
        <Field label={t("school.score")}>{(a) => <input {...a} inputMode="decimal" className="k-input" value={form.score} onChange={(e) => setForm({ ...form, score: decimal(e.target.value) })} />}</Field>
        <Field label={t("school.outOf")}>{(a) => <input {...a} inputMode="decimal" className="k-input" value={form.outOf} onChange={(e) => setForm({ ...form, outOf: decimal(e.target.value) })} />}</Field>
        {classes.length > 0 && (
          <Field label={t("calendar.class")}>
            {(a) => (
              <select {...a} className="k-input" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
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
        <div className="flex flex-wrap items-center gap-3 sm:col-span-full">
          <Button type="submit" variant="secondary" disabled={!form.title.trim() || !form.score || !form.outOf}>
            {t("school.addScore")}
          </Button>
          {error && (
            <p role="alert" className="text-sm text-bad">
              {t("cal.scoreError")}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
