"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconArrowLeft } from "@/components/icons";
import { useTitle } from "@/components/LangSync";
import { Badge, Button, Field, Notice, SubjectDot } from "@/components/ui";
import { gradeLabel, useLocale, useT } from "@/i18n";
import type { Key } from "@/i18n/en";
import { shortDate } from "@/lib/format";
import { gradeSpan, NOTE_MAX, previewSkill, reviewHistory, reviewSkill, reviewState, reviewedLines, strands, type ReviewState } from "@/lib/review";
import { useStore } from "@/lib/store";
import type { Subject } from "@/lib/types";
import { getSkill, SKILLS } from "@/practice/skills";
import type { Skill } from "@/practice/types";
import { ItemPair } from "./ItemPair";

type Filter = "draft" | "flagged" | "approved" | "computed" | "all";
const FILTERS: Filter[] = ["draft", "flagged", "approved", "computed", "all"];
const SUBJECTS: Subject[] = ["math", "english", "science"];

const STATE_LABEL: Record<ReviewState, Key> = {
  draft: "trust.review.state.draft",
  approved: "trust.review.state.approved",
  flagged: "trust.review.state.flagged",
  computed: "trust.review.state.computed",
  "in-code": "trust.review.state.inCode",
};
const STATE_TONE: Record<ReviewState, "muted" | "accent" | "good" | "warn"> = { draft: "accent", approved: "good", "in-code": "good", flagged: "warn", computed: "muted" };

const matches = (f: Filter, st: ReviewState) => f === "all" || (f === "approved" ? st === "approved" || st === "in-code" : st === f);
const STRANDS = strands();

export function ReviewTool() {
  const t = useT();
  useTitle(t("trust.review.title"));
  const skillId = useSearchParams().get("skill");
  const skill = skillId ? getSkill(skillId) : undefined;
  return skill ? <SkillView key={skill.id} skill={skill} /> : <SkillList />;
}

function SkillList() {
  const t = useT();
  const locale = useLocale();
  const states = useStore((s) => new Map(SKILLS.map((k) => [k.id, reviewState(s, k)])));
  const lines = useStore(reviewedLines);
  const [subject, setSubject] = useState<Subject | "all">("all");
  const [strand, setStrand] = useState("all");
  const [filter, setFilter] = useState<Filter>("draft");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const q = query.trim().toLowerCase();
  const strandOptions = STRANDS.filter((st) => subject === "all" || st.subject === subject);
  const inStrand = new Set(strandOptions.find((st) => st.key === strand)?.ids ?? []);
  const shown = SKILLS.filter(
    (k) =>
      (subject === "all" || k.subject === subject) &&
      (!inStrand.size || inStrand.has(k.id)) &&
      matches(filter, states.get(k.id)!) &&
      (!q || k.title.en.toLowerCase().includes(q) || k.title.es.toLowerCase().includes(q) || k.id.includes(q)),
  );
  const count = (f: Filter) => SKILLS.filter((k) => matches(f, states.get(k.id)!)).length;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{t("trust.review.title")}</h1>
        <p className="mt-2 max-w-prose text-sm text-muted">{t("trust.review.body")}</p>
        <p className="mt-3 font-opmono text-xs tabular-nums text-muted">
          {t("trust.review.count", { draft: count("draft"), approved: count("approved"), flagged: count("flagged"), computed: count("computed") })}
        </p>
      </div>

      <div className="space-y-4">
        <fieldset>
          <legend className="mb-2 text-xs font-semibold text-muted">{t("trust.review.subject")}</legend>
          <div className="flex flex-wrap gap-2">
            {(["all", ...SUBJECTS] as const).map((x) => (
              <button key={x} type="button" aria-pressed={subject === x} onClick={() => (setSubject(x), setStrand("all"))} className="k-chip min-h-11 px-4 text-sm">
                {x !== "all" && <SubjectDot subject={x} />}
                {x === "all" ? t("trust.review.all") : t(`subject.${x}`)}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t("trust.review.strand")}>
            {(a) => (
              <select {...a} className="k-input" value={strand} onChange={(e) => setStrand(e.target.value)}>
                <option value="all">{t("trust.review.allStrands")}</option>
                {strandOptions.map((st) => (
                  <option key={st.key} value={st.key}>
                    {t(st.from === st.to ? "trust.review.strandGrade" : "trust.review.strandName", { subject: t(`subject.${st.subject}`), grades: gradeSpan(st), n: st.ids.length })}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label={t("trust.review.status")}>
            {(a) => (
              <select {...a} className="k-input" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
                {FILTERS.map((f) => (
                  <option key={f} value={f}>
                    {t(`trust.review.filter.${f}`)} ({count(f)})
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label={t("trust.review.search")}>{(a) => <input {...a} type="search" className="k-input" value={query} onChange={(e) => setQuery(e.target.value)} />}</Field>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-muted">{t("trust.review.none")}</p>
      ) : (
        <ul aria-label={t("trust.review.listLabel", { n: shown.length })} className="divide-y divide-border rounded-lg border border-border bg-panel">
          {shown.map((k) => {
            const st = states.get(k.id)!;
            return (
              <li key={k.id}>
                <Link href={`/review?skill=${encodeURIComponent(k.id)}`} className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-panel2/60 sm:px-5">
                  <SubjectDot subject={k.subject} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">{k.title[locale]}</span>
                    <span className="block font-opmono text-xs text-muted">
                      {k.id} · {gradeLabel(locale, k.grade, true)} · {t("trust.review.levels", { n: k.levels })}
                    </span>
                  </span>
                  <Badge tone={STATE_TONE[st]}>{t(STATE_LABEL[st])}</Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <section aria-labelledby="review-export" className="space-y-3 border-t border-border pt-7">
        <h2 id="review-export" className="font-brand text-t2 font-semibold text-ink">
          {t("trust.review.exportTitle")}
        </h2>
        <p className="max-w-prose text-sm text-muted">{t("trust.review.exportBody")}</p>
        {lines.length === 0 ? (
          <p className="text-sm text-muted">{t("trust.review.exportNone")}</p>
        ) : (
          <>
            <pre aria-label={t("trust.review.exportTitle")} tabIndex={0} className="k-well overflow-x-auto px-4 py-3 font-opmono text-xs text-ink">
              {lines.join("\n")}
            </pre>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={copy}>
                {t("trust.review.copy")}
              </Button>
              <span role="status" className="text-xs text-good">
                {copied ? t("trust.review.copied") : ""}
              </span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function SkillView({ skill }: { skill: Skill }) {
  const t = useT();
  const locale = useLocale();
  const heading = useRef<HTMLHeadingElement>(null);
  const state = useStore((s) => reviewState(s, skill));
  const history = useStore((s) => reviewHistory(s, skill.id));
  const names = useStore((s) => new Map(s.accounts.map((a) => [a.id, a.displayName])));
  const levels = useMemo(() => previewSkill(skill), [skill]);
  const [note, setNote] = useState("");
  const [done, setDone] = useState<"approved" | "flagged" | null>(null);
  const [needNote, setNeedNote] = useState(false);
  useEffect(() => heading.current?.focus(), []);

  const decide = (status: "approved" | "flagged") => {
    if (status === "flagged" && !note.trim()) return setNeedNote(true);
    if (!reviewSkill(skill.id, status, note)) return;
    setNote("");
    setNeedNote(false);
    setDone(status);
  };
  const who = (id: string) => names.get(id) ?? t("trust.review.someone");
  const latest = history[0];

  return (
    <div className="space-y-8">
      <Link href="/review" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-ink">
        <IconArrowLeft size={16} /> {t("trust.review.back")}
      </Link>

      <header className="space-y-2">
        <h1 ref={heading} tabIndex={-1} className="font-brand text-t1 font-semibold text-ink sm:text-d3">
          <span lang="en">{skill.title.en}</span>
        </h1>
        <p lang="es" className="text-t3 text-muted">
          {skill.title.es}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-opmono text-xs text-muted">
          <SubjectDot subject={skill.subject} />
          <span>{skill.id}</span>
          <span>· {gradeLabel(locale, skill.grade)}</span>
          {skill.standard && <span>· {skill.standard}</span>}
          <span>· {t("trust.review.levels", { n: skill.levels })}</span>
          <Badge tone={STATE_TONE[state]}>{t(STATE_LABEL[state])}</Badge>
        </p>
      </header>

      <section aria-labelledby="decision" className="space-y-4 rounded-lg border border-border bg-panel p-5 shadow-soft sm:p-6">
        <h2 id="decision" className="font-brand text-t2 font-semibold text-ink">
          {t("trust.review.decision")}
        </h2>
        {skill.content === "computed" ? (
          <p className="max-w-prose text-sm text-ink">{t("trust.review.computedBody")}</p>
        ) : (
          <>
            <p className="text-sm text-ink">
              {state === "in-code"
                ? t("trust.review.inCode")
                : latest
                  ? t(latest.status === "approved" ? "trust.review.approvedBy" : "trust.review.flaggedBy", { date: shortDate(latest.at, locale), who: who(latest.by) })
                  : t("trust.review.never")}
            </p>
            {latest?.note && <p className="whitespace-pre-line rounded-sm bg-panel2 px-4 py-3 text-sm text-ink">{latest.note}</p>}
            <Field label={t("trust.review.note")} hint={t("trust.review.noteHint")} error={needNote ? t("trust.review.noteNeeded") : undefined}>
              {(a) => (
                <textarea
                  {...a}
                  rows={3}
                  maxLength={NOTE_MAX}
                  value={note}
                  onChange={(e) => (setNote(e.target.value), setNeedNote(false), setDone(null))}
                  className="k-input resize-y text-sm"
                />
              )}
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => decide("approved")}>{t("trust.review.approve")}</Button>
              <Button variant="secondary" onClick={() => decide("flagged")}>
                {t("trust.review.flag")}
              </Button>
            </div>
            <div role="status" className="min-h-5 text-sm">
              {done && <Notice tone={done === "approved" ? "good" : "warn"}>{t(done === "approved" ? "trust.review.approved" : "trust.review.flagged")}</Notice>}
            </div>
            {history.length > 1 && (
              <details className="text-sm">
                <summary className="inline-flex min-h-11 cursor-pointer items-center font-medium text-muted hover:text-ink">{t("trust.review.history", { n: history.length })}</summary>
                <ul className="mt-2 space-y-2">
                  {history.map((r) => (
                    <li key={r.id} className="rounded-sm bg-panel2 px-4 py-2">
                      <span className="font-medium text-ink">{t(r.status === "approved" ? "trust.review.approvedBy" : "trust.review.flaggedBy", { date: shortDate(r.at, locale), who: who(r.by) })}</span>
                      {r.note && <span className="block whitespace-pre-line text-muted">{r.note}</span>}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </section>

      <div className="space-y-4">
        {levels.map((lv, i) => (
          <details key={lv.level} open={i === 0} className="group rounded-lg border border-border bg-panel2/50">
            <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 sm:px-5">
              <h3 className="font-brand text-t3 font-semibold text-ink">{t("trust.review.level", { n: lv.level })}</h3>
              <span className="font-opmono text-xs text-muted">
                {skill.content === "computed"
                  ? t("trust.review.samples", { n: lv.pairs.length })
                  : lv.complete
                    ? t("trust.review.complete", { n: lv.pairs.length })
                    : t("trust.review.partial", { n: lv.pairs.length })}
              </span>
              <span aria-hidden="true" className="ml-auto text-muted transition-transform group-open:rotate-90">
                ›
              </span>
            </summary>
            <ol className="space-y-3 px-3 pb-4 sm:px-4">
              {lv.pairs.map((p, n) => (
                <ItemPair key={p.seed} pair={p} subject={skill.subject} n={n + 1} />
              ))}
            </ol>
          </details>
        ))}
      </div>
    </div>
  );
}
