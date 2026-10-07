"use client";

import { useState } from "react";
import { IconPaperclip } from "@/components/icons";
import { Button, Notice } from "@/components/ui";
import { useT } from "@/i18n";
import { draftsFromIcs, importDrafts, suggestSkills, updateClass, type Draft } from "@/lib/school";
import { read } from "@/lib/store";
import type { Locale } from "@/lib/types";
import { addDays, localDate } from "@/planner/dates";
import { readSchoolText } from "@/planner/intake";
import type { SchoolClass } from "@/planner/types";
import { getSkill } from "@/practice/skills";
import { KINDS } from "./EventForm";

type Tab = "paste" | "file" | "link";

/**
 * Bring school dates in three ways — paste text, a calendar file, or a calendar link — and review
 * every item before it is saved. Dates are never invented; lines without one are listed separately.
 */
export function ImportPanel({ profileId, classes, locale, onDone }: { profileId: string; classes: SchoolClass[]; locale: Locale; onDone: (msg: string) => void }) {
  const t = useT();
  const [tab, setTab] = useState<Tab>("paste");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [classId, setClassId] = useState("");
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [undated, setUndated] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [today] = useState(() => localDate(Date.now()));
  const source = tab === "paste" ? "paste" : "ics";

  const fromPaste = () => {
    const { found, undated } = readSchoolText(text, today);
    setUndated(undated);
    setDrafts(
      found.map((f, i) => ({
        key: `p${i}`,
        title: f.title,
        date: f.date,
        kind: f.kind,
        classId: classId || undefined,
        skillIds: suggestSkills(read(), f.title, classId || undefined),
        include: true,
      })),
    );
  };
  const fromIcs = (ics: string) => {
    const list = draftsFromIcs(read(), profileId, ics, addDays(today, -7), classId || undefined);
    if (!list.length) setError(t("import.noEvents"));
    setDrafts(list);
    setUndated([]);
  };
  const fromFile = async (file: File) => {
    setError(null);
    if (file.size > 2_000_000) return setError(t("import.tooBig"));
    fromIcs(await file.text());
  };
  const fromLink = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/ics", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
      if (!res.ok) {
        const { error: code } = (await res.json().catch(() => ({ error: "status" }))) as { error: string };
        setError(t(code === "url" ? "import.badUrl" : code === "blocked" ? "import.blocked" : code === "format" ? "import.notCalendar" : "import.fetchFailed"));
        return;
      }
      fromIcs(await res.text());
      if (classId) updateClass(classId, { feedUrl: url.trim() });
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!drafts) return;
    const { added, updated } = importDrafts(profileId, drafts, source);
    onDone(t("import.saved", { added, updated }));
  };
  const edit = (key: string, patch: Partial<Draft>) => setDrafts((d) => d?.map((x) => (x.key === key ? { ...x, ...patch } : x)) ?? null);
  const chosen = drafts?.filter((d) => d.include).length ?? 0;

  return (
    <section aria-labelledby="import-title" className="space-y-5 rounded-lg border border-border bg-panel p-5 shadow-soft sm:p-6">
      <div>
        <h2 id="import-title" className="font-brand text-t2 font-semibold text-ink">
          {t("import.title")}
        </h2>
        <p className="mt-1 text-sm text-muted">{t("import.body")}</p>
      </div>
      <div role="tablist" aria-label={t("import.how")} className="inline-flex rounded-full border border-border bg-panel2 p-1">
        {(["paste", "file", "link"] as Tab[]).map((x) => (
          <button key={x} role="tab" aria-selected={tab === x} onClick={() => (setTab(x), setDrafts(null), setError(null))} className="min-h-10 rounded-full px-4 text-sm font-medium text-muted aria-selected:bg-panel aria-selected:text-ink aria-selected:shadow-soft">
            {t(`import.tab.${x}`)}
          </button>
        ))}
      </div>

      {classes.length > 0 && (
        <label className="block max-w-xs space-y-1.5">
          <span className="text-sm font-medium text-ink">{t("import.forClass")}</span>
          <select className="k-input" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">{t("import.matchByName")}</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {!drafts && tab === "paste" && (
        <div className="space-y-3">
          <label htmlFor="paste" className="sr-only">
            {t("import.pasteLabel")}
          </label>
          <textarea id="paste" rows={7} value={text} onChange={(e) => setText(e.target.value.slice(0, 20000))} placeholder={t("import.pastePlaceholder")} className="k-input min-h-40 py-3 font-opmono text-sm" />
          <Button onClick={fromPaste} disabled={!text.trim()}>
            {t("import.findDates")}
          </Button>
        </div>
      )}
      {!drafts && tab === "file" && (
        <label className="flex min-h-24 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-panel2/60 px-4 text-sm text-ink hover:border-ink/30">
          <IconPaperclip size={18} /> {t("import.chooseFile")}
          <input type="file" accept=".ics,text/calendar" className="sr-only" onChange={(e) => e.target.files?.[0] && fromFile(e.target.files[0])} />
        </label>
      )}
      {!drafts && tab === "link" && (
        <div className="space-y-3">
          <label htmlFor="feed" className="block text-sm font-medium text-ink">
            {t("import.linkLabel")}
          </label>
          <input id="feed" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…/basic.ics" className="k-input" />
          <details className="text-sm text-muted">
            <summary className="cursor-pointer text-ink">{t("import.whereLink")}</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>{t("import.where.google")}</li>
              <li>{t("import.where.canvas")}</li>
              <li>{t("import.where.schoology")}</li>
            </ul>
            <p className="mt-2">{t("import.linkPrivacy")}</p>
          </details>
          <Button onClick={fromLink} loading={busy} disabled={!url.trim()}>
            {t("import.getEvents")}
          </Button>
        </div>
      )}
      {error && <Notice tone="warn">{error}</Notice>}

      {drafts && (
        <div className="space-y-4">
          {drafts.length > 0 ? (
            <>
              <p className="text-sm text-ink">{t("import.review", { n: drafts.length })}</p>
              <ul className="divide-y divide-border rounded-md border border-border">
                {drafts.map((d) => (
                  <li key={d.key} className="grid gap-2 px-3 py-3 sm:grid-cols-[auto_1fr_9rem_8rem] sm:items-center">
                    <input type="checkbox" checked={d.include} onChange={(e) => edit(d.key, { include: e.target.checked })} aria-label={`${t("import.include")}: ${d.title}`} className="size-5 accent-[var(--color-accent)]" />
                    <div className="min-w-0">
                      <input value={d.title} onChange={(e) => edit(d.key, { title: e.target.value })} aria-label={t("calendar.what")} className="k-input h-10 text-sm" />
                      {d.skillIds.length > 0 && <p className="mt-1 truncate text-xs text-muted">{t("import.skillsGuess", { skills: d.skillIds.map((id) => getSkill(id)?.title[locale]).join(", ") })}</p>}
                    </div>
                    <input type="date" value={d.date} onChange={(e) => edit(d.key, { date: e.target.value })} aria-label={t("calendar.date")} className="k-input h-10 text-sm" />
                    <select value={d.kind} onChange={(e) => edit(d.key, { kind: e.target.value as Draft["kind"] })} aria-label={t("calendar.kind")} className="k-input h-10 text-sm">
                      {KINDS.map((k) => (
                        <option key={k} value={k}>
                          {t(`event.${k}`)}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted">{t("import.nothingFound")}</p>
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
          <div className="flex flex-wrap gap-3">
            <Button onClick={save} disabled={!chosen}>
              {t("import.save", { n: chosen })}
            </Button>
            <Button variant="secondary" onClick={() => setDrafts(null)}>
              {t("common.back")}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
