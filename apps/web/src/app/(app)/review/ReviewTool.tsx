"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconArrowLeft } from "@/components/icons";
import { useTitle } from "@/components/LangSync";
import { Badge, Button, Field, SubjectDot } from "@/components/ui";
import { gradeLabel, useLocale, useT } from "@/i18n";
import type { Key } from "@/i18n/en";
import { shortDate } from "@/lib/format";
import {
  countShown,
  filterQuery,
  gradeSpan,
  matchingSkills,
  nextSkill,
  NOTE_MAX,
  previewSkill,
  readFilters,
  reviewHistory,
  reviewSkill,
  reviewState,
  reviewedLines,
  SHOWS,
  strands,
  type ReviewFilters,
  type ReviewState,
} from "@/lib/review";
import { useStore, type StoreState } from "@/lib/store";
import type { Subject } from "@/lib/types";
import { getSkill, SKILLS, standardsOf } from "@/practice/skills";
import type { Skill } from "@/practice/types";
import { ItemPair } from "./ItemPair";

const SUBJECTS: Subject[] = ["math", "english", "science"];

const STATE_LABEL: Record<ReviewState, Key> = {
  draft: "trust.review.state.draft",
  approved: "trust.review.state.approved",
  flagged: "trust.review.state.flagged",
  computed: "trust.review.state.computed",
  "in-code": "trust.review.state.inCode",
};
const STATE_TONE: Record<ReviewState, "muted" | "accent" | "good" | "warn"> = { draft: "accent", approved: "good", "in-code": "good", flagged: "warn", computed: "muted" };

const STRANDS = strands();
const statesOf = (s: StoreState) => new Map(SKILLS.map((k) => [k.id, reviewState(s, k)]));
/** The list's address for these filters; a skill's address keeps them, so its back link returns to the same list. */
const listHref = (f: ReviewFilters) => (filterQuery(f) ? `/review?${filterQuery(f)}` : "/review");
const skillHref = (id: string, f: ReviewFilters) => `/review?skill=${encodeURIComponent(id)}${filterQuery(f) ? `&${filterQuery(f)}` : ""}`;

export function ReviewTool() {
  const t = useT();
  useTitle(t("trust.review.title"));
  const params = useSearchParams();
  const skillId = params.get("skill");
  const skill = skillId ? getSkill(skillId) : undefined;
  const filters = readFilters(params);
  return skill ? <SkillView key={skill.id} skill={skill} filters={filters} /> : <SkillList initial={filters} />;
}

function SkillList({ initial }: { initial: ReviewFilters }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const states = useStore(statesOf);
  const lines = useStore(reviewedLines);
  const [f, setF] = useState(initial);
  const [copied, setCopied] = useState<"yes" | "no" | null>(null);
  const set = (change: Partial<ReviewFilters>) => {
    const next = { ...f, ...change };
    setF(next);
    router.replace(listHref(next), { scroll: false });
  };
  const strandOptions = STRANDS.filter((st) => f.subject === "all" || st.subject === f.subject);
  const shown = matchingSkills(states, f);
  const count = (show: ReviewFilters["show"]) => countShown(states, show);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied("yes");
    } catch {
      setCopied("no");
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
              <button key={x} type="button" aria-pressed={f.subject === x} onClick={() => set({ subject: x, strand: "all" })} className="k-chip min-h-11 px-4 text-sm">
                {x !== "all" && <SubjectDot subject={x} />}
                {x === "all" ? t("trust.review.all") : t(`subject.${x}`)}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t("trust.review.strand")}>
            {(a) => (
              <select {...a} className="k-input" value={f.strand} onChange={(e) => set({ strand: e.target.value })}>
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
              <select {...a} className="k-input" value={f.show} onChange={(e) => set({ show: e.target.value as ReviewFilters["show"] })}>
                {SHOWS.map((show) => (
                  <option key={show} value={show}>
                    {t(`trust.review.filter.${show}`)} ({count(show)})
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label={t("trust.review.search")}>{(a) => <input {...a} type="search" className="k-input" maxLength={80} value={f.q} onChange={(e) => set({ q: e.target.value })} />}</Field>
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
                <Link href={skillHref(k.id, f)} className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-panel2/60 sm:px-5">
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
              <span role="status" className={`text-xs ${copied === "no" ? "text-warn" : "text-good"}`}>
                {copied === "yes" ? t("trust.review.copied") : copied === "no" ? t("trust.review.copyFailed") : ""}
              </span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function SkillView({ skill, filters }: { skill: Skill; filters: ReviewFilters }) {
  const t = useT();
  const locale = useLocale();
  const heading = useRef<HTMLHeadingElement>(null);
  const noteBox = useRef<HTMLTextAreaElement>(null);
  const teacherBox = useRef<HTMLInputElement>(null);
  const state = useStore((s) => reviewState(s, skill));
  const history = useStore((s) => reviewHistory(s, skill.id));
  const me = useStore((s) => s.accounts.find((a) => a.id === s.session.accountId)?.displayName ?? "");
  const next = useStore((s) => nextSkill(statesOf(s), filters, skill.id));
  const levels = useMemo(() => previewSkill(skill), [skill]);
  const [note, setNote] = useState("");
  const [teacher, setTeacher] = useState(false);
  const [done, setDone] = useState<"approved" | "flagged" | null>(null);
  const [need, setNeed] = useState<"note" | "teacher" | null>(null);
  useEffect(() => heading.current?.focus(), []);

  const decide = (status: "approved" | "flagged") => {
    // A refusal moves focus to what needs fixing, so its error is read out.
    if (status === "flagged" && !note.trim()) {
      setNeed("note");
      return noteBox.current?.focus();
    }
    if (status === "approved" && !teacher) {
      setNeed("teacher");
      return teacherBox.current?.focus();
    }
    if (!reviewSkill(skill.id, status, note, { teacher })) return;
    setNote("");
    setNeed(null);
    setDone(status);
  };
  const latest = history[0];
  const decidedLine = (r: (typeof history)[number]) => t(r.status === "approved" ? "trust.review.approvedBy" : "trust.review.flaggedBy", { date: shortDate(r.at, locale), who: me });

  return (
    <div className="space-y-8">
      <Link href={listHref(filters)} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-ink">
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
          {standardsOf(skill).map((code) => (
            <span key={code}>· {code}</span>
          ))}
          <span>· {t("trust.review.levels", { n: skill.levels })}</span>
          <Badge tone={STATE_TONE[state]}>{t(STATE_LABEL[state])}</Badge>
        </p>
      </header>

      <section id="decision" aria-labelledby="decision-h" className="scroll-mt-6 space-y-4 rounded-lg border border-border bg-panel p-5 shadow-soft sm:p-6">
        <h2 id="decision-h" className="font-brand text-t2 font-semibold text-ink">
          {t("trust.review.decision")}
        </h2>
        {skill.content === "computed" ? (
          <p className="max-w-prose text-sm text-ink">{t("trust.review.computedBody")}</p>
        ) : (
          <>
            <p className="text-sm text-ink">{state === "in-code" ? t("trust.review.inCode") : latest ? decidedLine(latest) : t("trust.review.never")}</p>
            {latest?.note && <p className="whitespace-pre-line rounded-sm bg-panel2 px-4 py-3 text-sm text-ink">{latest.note}</p>}
            <Field label={t("trust.review.note")} hint={t("trust.review.noteHint")} error={need === "note" ? t("trust.review.noteNeeded") : undefined}>
              {(a) => (
                <textarea
                  {...a}
                  ref={noteBox}
                  rows={3}
                  maxLength={NOTE_MAX}
                  value={note}
                  onChange={(e) => (setNote(e.target.value), setNeed(null), setDone(null))}
                  className="k-input resize-y text-sm"
                />
              )}
            </Field>
            <div className="space-y-1.5">
              <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-ink">
                <input
                  ref={teacherBox}
                  type="checkbox"
                  checked={teacher}
                  onChange={(e) => (setTeacher(e.target.checked), setNeed(null))}
                  aria-invalid={need === "teacher" || undefined}
                  aria-describedby={need === "teacher" ? "teacher-error" : "teacher-hint"}
                  className="mt-0.5 size-5 shrink-0 accent-ink"
                />
                <span>{t("trust.review.teacher")}</span>
              </label>
              {need === "teacher" ? (
                <p id="teacher-error" className="text-xs font-medium text-bad">
                  {t("trust.review.teacherNeeded")}
                </p>
              ) : (
                <p id="teacher-hint" className="text-xs text-muted">
                  {t("trust.review.teacherHint")}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => decide("approved")}>{t("trust.review.approve")}</Button>
              <Button variant="secondary" onClick={() => decide("flagged")}>
                {t("trust.review.flag")}
              </Button>
            </div>
            <div role="status" className="text-sm empty:m-0">
              {done && (
                <p className={`rounded-sm border px-4 py-3 text-ink ${done === "approved" ? "border-good/25 bg-good/10" : "border-warn/25 bg-warn/10"}`}>
                  {t(done === "approved" ? "trust.review.approved" : "trust.review.flagged")}
                </p>
              )}
            </div>
            {done && next && <NextLink skill={next} filters={filters} />}
            {history.length > 1 && (
              <details className="text-sm">
                <summary className="inline-flex min-h-11 cursor-pointer items-center font-medium text-muted hover:text-ink">{t("trust.review.history", { n: history.length })}</summary>
                <ul className="mt-2 space-y-2">
                  {history.map((r) => (
                    <li key={r.id} className="rounded-sm bg-panel2 px-4 py-2">
                      <span className="font-medium text-ink">{decidedLine(r)}</span>
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

      {/* After the last level: back up to the decision without scrolling past every question, or on. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-6">
        {skill.content !== "computed" && (
          <a href="#decision" className="inline-flex min-h-11 items-center text-sm font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-accent">
            {t("trust.review.toDecision")}
          </a>
        )}
        {next && <NextLink skill={next} filters={filters} />}
      </div>
    </div>
  );
}

function NextLink({ skill, filters }: { skill: Skill; filters: ReviewFilters }) {
  const t = useT();
  const locale = useLocale();
  return (
    <Link href={skillHref(skill.id, filters)} className="inline-flex min-h-11 items-center text-sm font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-accent">
      {t("trust.review.next", { skill: skill.title[locale] })}
    </Link>
  );
}
