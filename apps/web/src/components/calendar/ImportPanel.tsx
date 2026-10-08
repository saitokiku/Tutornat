"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { IconPaperclip, IconX } from "@/components/icons";
import { Button, Field, Notice, btn } from "@/components/ui";
import { useT } from "@/i18n";
import { useAiMode } from "@/lib/ai/client";
import { currentLearner, selectLearner } from "@/lib/profiles";
import { suggestSkills, type Draft } from "@/lib/school";
import { read, useStore } from "@/lib/store";
import { SUBJECTS, type Profile, type Subject } from "@/lib/types";
import { fetchCalendar, icsDrafts, matchDrafts, saveImport } from "@/lib/week";
import { localDate } from "@/planner/dates";
import { readSchoolText } from "@/planner/intake";
import type { SchoolClass } from "@/planner/types";
import { getSkill } from "@/practice/skills";
import { KINDS } from "./EventForm";
import { FEED_ERROR } from "./feed";

export type ImportTab = "paste" | "file" | "link" | "photo";
export const IMPORT_TABS: ImportTab[] = ["paste", "file", "link", "photo"];
/** New items a class calendar refresh found, waiting for the family's review. */
export type FeedReview = { classId: string; drafts: Draft[] };
const NEW = "new";
const MAX_FILE = 2_000_000;

/**
 * Bring school dates in — paste text, a calendar file, or a class calendar link — and review every
 * item before it is saved. Dates are never invented; lines without one are listed separately. A link
 * is kept on its class so it can be refreshed later. Photos go to the magic box on Today. With
 * `review`, it shows only the new items a refresh found on a linked class calendar.
 */
export function ImportPanel({
  profile,
  classes,
  initialTab = "paste",
  initialClassId,
  review,
  onDone,
}: {
  profile: Profile;
  classes: SchoolClass[];
  initialTab?: ImportTab;
  initialClassId?: string;
  review?: FeedReview;
  onDone: (message?: string, firstDate?: string) => void;
}) {
  const t = useT();
  const ai = useAiMode();
  const router = useRouter();
  const ids = useId();
  const learner = useStore(currentLearner);
  const known = (id?: string) => (id && classes.some((c) => c.id === id) ? id : undefined);
  const reviewClass = review ? classes.find((c) => c.id === review.classId) : undefined;
  const [tab, setTab] = useState<ImportTab>(review ? "link" : initialTab);
  const [text, setText] = useState("");
  const [url, setUrl] = useState(() => reviewClass?.feedUrl ?? "");
  const [classId, setClassId] = useState(() => known(initialClassId) ?? "");
  const [linkClass, setLinkClass] = useState(() => known(review?.classId ?? initialClassId) ?? NEW);
  const [newName, setNewName] = useState("");
  const [newSubject, setNewSubject] = useState<Subject>("math");
  const [drafts, setDrafts] = useState<Draft[] | null>(() => review?.drafts ?? null);
  // What each item was called when found, so a row keeps its name for screen readers while it is edited.
  const [names, setNames] = useState<Record<string, string>>(() => Object.fromEntries((review?.drafts ?? []).map((d) => [d.key, d.title])));
  const [source, setSource] = useState<"paste" | "ics" | "ai">(review ? "ics" : "paste");
  const [undated, setUndated] = useState<string[]>([]);
  const [aiNotes, setAiNotes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [emptyLink, setEmptyLink] = useState(false);
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState(0);
  const [today] = useState(() => localDate(Date.now()));
  const heading = useRef<HTMLHeadingElement>(null);
  const result = useRef<HTMLParagraphElement>(null);
  const refocus = useRef<string | null>(null);
  const aiOn = !!ai && ai !== "demo";
  const filedUnder = tab === "link" ? (linkClass === NEW ? undefined : linkClass) : classId || undefined;
  const linkName = linkClass === NEW ? newName.trim() || t("cal.feedClass") : (classes.find((c) => c.id === linkClass)?.name ?? "");

  useEffect(() => heading.current?.focus(), []);
  // Focus moves to what was found once per search, never while the grown-up edits the list.
  useEffect(() => {
    if (found) result.current?.focus();
  }, [found]);
  useEffect(() => {
    if (!refocus.current) return;
    document.getElementById(refocus.current)?.focus();
    refocus.current = null;
  }, [drafts]);

  const show = (list: Draft[], from: "paste" | "ics" | "ai", undatedLines: string[] = [], notes: string[] = []) => {
    setDrafts(list);
    setNames(Object.fromEntries(list.map((d) => [d.key, d.title])));
    setSource(from);
    setUndated(undatedLines);
    setAiNotes(notes);
    setFound((n) => n + 1);
  };
  const choose = (x: ImportTab) => {
    setTab(x);
    setDrafts(null);
    setError(null);
    setEmptyLink(false);
  };

  // Pasted and AI-read items get the same ids as calendar items, so pasting this week's email again
  // finds last week's items instead of adding them twice.
  const fromPaste = () => {
    const { found: dated, undated: rest } = readSchoolText(text, today);
    const cls = classId || undefined;
    const list = dated.map((f, i) => ({ key: `p${i}`, title: f.title, date: f.date, kind: f.kind, classId: cls, skillIds: suggestSkills(read(), f.title, { profileId: profile.id, classId: cls }), include: true }));
    show(matchDrafts(read(), profile.id, list), "paste", rest);
  };
  const fromIcs = (ics: string) => {
    const list = icsDrafts(read(), profile.id, ics, today, filedUnder);
    if (list.length) return show(list, "ics");
    if (tab === "link") setEmptyLink(true);
    else setError(t("import.noEvents"));
  };
  const fromFile = async (file: File) => {
    setError(null);
    if (file.size > MAX_FILE) return setError(t("import.tooBig"));
    try {
      fromIcs(await file.text());
    } catch {
      setError(t("cal.fileUnreadable"));
    }
  };
  const fromLink = async () => {
    setError(null);
    setEmptyLink(false);
    setBusy(true);
    const got = await fetchCalendar(url);
    setBusy(false);
    if (!got.ok) return setError(t(FEED_ERROR[got.error]));
    fromIcs(got.text);
  };
  // AI reading of pasted text: the same review step; every guess the model made is listed. Text the
  // safety screen stops (422) never reaches the model, and retrying can't change that, so it says so.
  const readWithAi = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/ai/extract", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "syllabus", today, locale: profile.locale, grade: profile.grade, text }) });
      if (!res.ok) return setError(t(res.status === 422 ? "import.aiStopped" : "import.aiFailed"));
      const out = (await res.json()) as { events: { title: string; date: string; kind: Draft["kind"] }[]; skillIds: string[]; notes: string[] };
      const cls = classId || undefined;
      const list = out.events.map((e, i) => ({
        key: `ai${i}`,
        title: e.title,
        date: e.date,
        kind: e.kind,
        classId: cls,
        skillIds: suggestSkills(read(), e.title, { profileId: profile.id, classId: cls }).concat(out.skillIds).filter((x, j, a) => getSkill(x) && a.indexOf(x) === j).slice(0, 3),
        include: true,
      }));
      show(matchDrafts(read(), profile.id, list), "ai", [], out.notes);
    } catch {
      setError(t("import.aiFailed"));
    } finally {
      setBusy(false);
    }
  };

  const link = () => (tab === "link" && url.trim() ? { url, classId: filedUnder, newClass: linkClass === NEW ? { name: linkName, subject: newSubject } : undefined } : undefined);
  const save = () => {
    if (!drafts) return;
    const l = link();
    const r = saveImport(profile.id, drafts, source, l);
    if (review && !chosen) return onDone(t("cal.leftOut", { n: drafts.length }));
    const saved = r.unchanged ? t("cal.savedSame", { added: r.added, updated: r.updated, same: r.unchanged }) : t("import.saved", { added: r.added, updated: r.updated });
    const name = l && !review && read().classes.find((c) => c.id === r.classId)?.name;
    // The first coming item, so the calendar can show its week.
    const first = drafts.filter((d) => d.include && d.date >= today).map((d) => d.date).sort()[0];
    onDone(name ? `${saved} ${t("cal.linkKept", { name })}` : saved, first);
  };
  // A class calendar with nothing coming up yet (start of term, a holiday) can still be linked for later.
  const keepLink = () => {
    const l = link();
    if (!l) return;
    saveImport(profile.id, [], "ics", l);
    onDone(t("cal.linkKeptEmpty", { name: linkName }));
  };
  const edit = (key: string, patch: Partial<Draft>) => setDrafts((d) => d?.map((x) => (x.key === key ? { ...x, ...patch } : x)) ?? null);
  const chosen = drafts?.filter((d) => d.include).length ?? 0;

  const classPicker = classes.length > 0 && (
    <Field label={t("import.forClass")}>
      {(a) => (
        <select {...a} className="k-input sm:max-w-xs" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">{t("import.matchByName")}</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
    </Field>
  );

  return (
    <section aria-labelledby="import-title" className="space-y-5 rounded-lg border border-border bg-panel p-4 shadow-soft sm:p-6">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 id="import-title" ref={heading} tabIndex={-1} className="font-brand text-t2 font-semibold text-ink">
            {review ? t("cal.reviewNewTitle", { name: reviewClass?.name ?? "" }) : t("import.title")}
          </h2>
          <p className="mt-1 text-sm text-muted">{review ? t("cal.reviewNewBody") : t("import.body")}</p>
        </div>
        <button type="button" onClick={() => onDone()} aria-label={t("common.close")} className="-mr-2 -mt-2 grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-panel2 hover:text-ink">
          <IconX size={18} />
        </button>
      </div>

      {!review && (
        <div role="group" aria-label={t("import.how")} className="flex flex-wrap gap-1 rounded-lg border border-border bg-panel2 p-1 sm:inline-flex sm:rounded-full">
          {IMPORT_TABS.map((x) => (
            <button key={x} type="button" aria-pressed={tab === x} onClick={() => choose(x)} className="min-h-11 flex-1 rounded-full px-4 text-sm font-medium text-muted hover:text-ink aria-pressed:bg-panel aria-pressed:text-ink aria-pressed:shadow-soft sm:flex-none">
              {t(`import.tab.${x}`)}
            </button>
          ))}
        </div>
      )}

      {!drafts && tab === "paste" && (
        <div className="space-y-4">
          {classPicker}
          <div className="space-y-1.5">
            <label htmlFor="paste" className="block text-sm font-medium text-ink">
              {t("import.pasteLabel")}
            </label>
            <textarea id="paste" rows={7} value={text} onChange={(e) => setText(e.target.value.slice(0, 20000))} placeholder={t("import.pastePlaceholder")} className="k-input min-h-40 py-3 font-opmono text-sm" />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={fromPaste} disabled={!text.trim()}>
              {t("import.findDates")}
            </Button>
            {aiOn && (
              <Button variant="secondary" loading={busy} onClick={readWithAi} disabled={!text.trim()}>
                {t("import.readAi")}
              </Button>
            )}
          </div>
          {aiOn && <p className="text-xs text-muted">{t("cal.aiNote")}</p>}
        </div>
      )}

      {!drafts && tab === "file" && (
        <div className="space-y-4">
          {classPicker}
          <label className="flex min-h-24 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-panel2/60 px-4 text-center text-sm text-ink focus-within:ring-2 focus-within:ring-accent hover:border-ink/30">
            <IconPaperclip size={18} /> {t("import.chooseFile")}
            <input type="file" accept=".ics,text/calendar" className="sr-only" onChange={(e) => (e.target.files?.[0] && fromFile(e.target.files[0]), (e.target.value = ""))} />
          </label>
          <p className="text-xs text-muted">{t("cal.fileWhere")}</p>
        </div>
      )}

      {!drafts && tab === "link" && (
        <div className="space-y-4">
          <Field label={t("import.linkLabel")}>
            {(a) => <input {...a} type="url" inputMode="url" autoComplete="off" value={url} onChange={(e) => (setUrl(e.target.value), setEmptyLink(false))} placeholder="https://…/basic.ics" className="k-input" />}
          </Field>
          <Field label={t("cal.linkFor")}>
            {(a) => (
              <select {...a} className="k-input sm:max-w-xs" value={linkClass} onChange={(e) => setLinkClass(e.target.value)}>
                <option value={NEW}>{t("cal.newClass")}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.feedUrl ? ` (${t("school.feedLinked")})` : ""}
                  </option>
                ))}
              </select>
            )}
          </Field>
          {linkClass === NEW && (
            <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
              <Field label={t("school.className")} hint={t("cal.newClassHint")}>
                {(a) => <input {...a} className="k-input" value={newName} maxLength={60} onChange={(e) => setNewName(e.target.value)} placeholder={t("school.classPlaceholder")} />}
              </Field>
              <Field label={t("school.subject")}>
                {(a) => (
                  <select {...a} className="k-input" value={newSubject} onChange={(e) => setNewSubject(e.target.value as Subject)}>
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {t(`subject.${s}`)}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
          )}
          <details className="text-sm text-muted">
            <summary className="flex min-h-11 cursor-pointer items-center text-ink">{t("import.whereLink")}</summary>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>{t("import.where.google")}</li>
              <li>{t("import.where.canvas")}</li>
              <li>{t("import.where.schoology")}</li>
            </ul>
            <p className="mt-2">{t("import.linkPrivacy")}</p>
          </details>
          <Button onClick={fromLink} loading={busy} disabled={!url.trim()}>
            {t("import.getEvents")}
          </Button>
          {emptyLink && (
            <Notice
              action={
                <Button variant="secondary" onClick={keepLink}>
                  {t("cal.keepLink", { name: linkName })}
                </Button>
              }
            >
              {t("cal.feedEmpty")}
            </Notice>
          )}
        </div>
      )}

      {!drafts && tab === "photo" && (
        <div className="space-y-3 rounded-md border border-border bg-panel2/60 p-4">
          <p className="text-sm text-ink">{t("cal.photoBody")}</p>
          {learner ? (
            <Link href="/home" className={btn("secondary")}>
              {t("cal.photoOpen")}
            </Link>
          ) : (
            <>
              <p className="text-sm text-muted">{t("cal.photoSwitch", { name: profile.nickname })}</p>
              <Button variant="secondary" onClick={() => (selectLearner(profile.id), router.push("/home"))}>
                {t("cal.photoAs", { name: profile.nickname })}
              </Button>
            </>
          )}
        </div>
      )}

      {error && <Notice tone="warn">{error}</Notice>}

      {drafts && (
        <div className="space-y-4">
          {drafts.length > 0 ? (
            <>
              <p ref={result} tabIndex={-1} className="text-sm text-ink outline-none">
                {t("import.review", { n: drafts.length })}
              </p>
              <ul aria-label={t("cal.toReview")} className="divide-y divide-border rounded-md border border-border">
                {drafts.map((d, i) => {
                  const name = names[d.key] ?? d.title;
                  const titleId = `${ids}-title-${i}`;
                  return (
                    <li key={d.key} className="grid grid-cols-[2.75rem_1fr] gap-x-2 gap-y-2 py-2 pl-1 pr-3 sm:grid-cols-[2.75rem_1fr_9.5rem_8.5rem] sm:items-start">
                      <label className="row-span-3 grid size-11 cursor-pointer place-items-center self-start sm:row-span-1">
                        <input type="checkbox" checked={d.include} onChange={(e) => edit(d.key, { include: e.target.checked })} className="size-5 accent-[var(--color-accent)]" />
                        <span className="sr-only">
                          {t("import.include")}: {name}
                        </span>
                      </label>
                      <div className="min-w-0">
                        <input id={titleId} value={d.title} onChange={(e) => edit(d.key, { title: e.target.value })} aria-label={`${t("calendar.what")}: ${name}`} className="k-input h-11 text-sm" />
                        {d.skillIds.some(getSkill) && (
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            <span className="text-xs text-muted">{t("cal.practiceFor")}</span>
                            {d.skillIds.filter(getSkill).map((id) => {
                              const skill = getSkill(id)!.title[profile.locale];
                              return (
                                <span key={id} className="inline-flex min-h-11 items-center rounded-full border border-border bg-panel2 pl-3 text-xs text-ink">
                                  {skill}
                                  <button
                                    type="button"
                                    aria-label={t("cal.unlinkFrom", { skill, title: name })}
                                    onClick={() => ((refocus.current = titleId), edit(d.key, { skillIds: d.skillIds.filter((x) => x !== id) }))}
                                    className="grid size-11 place-items-center rounded-full text-muted hover:bg-panel hover:text-ink"
                                  >
                                    <IconX size={14} />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <input type="date" value={d.date} onChange={(e) => edit(d.key, { date: e.target.value })} aria-label={`${t("calendar.date")}: ${name}`} className="k-input h-11 text-sm" />
                      <select value={d.kind} onChange={(e) => edit(d.key, { kind: e.target.value as Draft["kind"] })} aria-label={`${t("calendar.kind")}: ${name}`} className="k-input h-11 text-sm">
                        {KINDS.map((k) => (
                          <option key={k} value={k}>
                            {t(`event.${k}`)}
                          </option>
                        ))}
                      </select>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p ref={result} tabIndex={-1} className="text-sm text-muted outline-none">
              {t("import.nothingFound")}
            </p>
          )}
          {aiNotes.length > 0 && (
            <div className="rounded-md border border-border bg-panel2/60 px-4 py-3">
              <p className="text-sm font-medium text-ink">{t("import.aiGuesses")}</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-muted">
                {aiNotes.map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
            </div>
          )}
          {undated.length > 0 && (
            <div className="rounded-md border border-border bg-panel2/60 px-4 py-3">
              <p className="text-sm font-medium text-ink">{t("import.undated")}</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-muted">
                {undated.map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
            </div>
          )}
          {review && <p className="text-xs text-muted">{t("cal.reviewLeaveOut")}</p>}
          <div className="flex flex-wrap gap-3">
            <Button onClick={save} disabled={!chosen && !review}>
              {review && !chosen ? t("cal.saveNone") : t("import.save", { n: chosen })}
            </Button>
            <Button variant="secondary" onClick={() => (review ? onDone() : (setDrafts(null), heading.current?.focus()))}>
              {review ? t("common.cancel") : t("common.back")}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
