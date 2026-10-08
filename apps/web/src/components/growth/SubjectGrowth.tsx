"use client";

import type { ReactNode } from "react";
import { STATUS_DOT, statusLine } from "@/components/practice/status";
import { Hear } from "@/components/stage/hear";
import { Badge, SubjectDot } from "@/components/ui";
import { useLocale, useT } from "@/i18n";
import type { SkillStatus, Statuses } from "@/learning/engine";
import { findLesson } from "@/lib/activity";
import { shortDate } from "@/lib/format";
import { bucketOf, type LessonDone, type SchoolRow, type SubjectGrowth as Growth } from "@/lib/growth";
import { isReviewed } from "@/lib/review";
import { useStore } from "@/lib/store";
import { fromLocalDate } from "@/planner/dates";
import { getSkill, standardsOf } from "@/practice/skills";
import { SERIES, Swatch, WeekChart } from "./WeekChart";

// One subject's growth: where its skills stood week by week (a chart and the same numbers as a
// table), the last week's checks, lessons and minutes, and for a grown-up the skills, each finished
// lesson with its questions, and school results. A young learner gets the same numbers in a sentence
// they can hear, and the skills they proved by name instead of the table.

type Props = {
  growth: Growth;
  /** Where each skill stood at the end of these weeks. */
  statuses: Statuses;
  /** Skills with answers that move them (placement probes and tutor rows alone do not). */
  practiced: Set<string>;
  results: SchoolRow[];
  /** A grown-up's view: the skills, the lessons and the school results. */
  detail: boolean;
  /** A K–2 learner looking at their own path. */
  young?: boolean;
  /** These weeks end with the current one. */
  current: boolean;
  now: number;
};

export function SubjectGrowth({ growth, statuses, practiced, results, detail, young = false, current, now }: Props) {
  const t = useT();
  const locale = useLocale();
  const { subject, weeks } = growth;
  const name = t(`subject.${subject}`);
  const id = `growth-${subject}`;
  const last = weeks[weeks.length - 1];
  const touched = weeks.some((w) => w.proved + w.ready + w.practicing > 0);
  const week = current ? t("child.week") : t("growth.weekOf", { date: shortDate(last.start, locale) });
  // Skill columns and the checks figure only where skills were practiced; lessons and time always.
  const skills = subject !== "other" && touched;
  const counts = { from: weeks[0].proved, to: last.proved, ready: last.ready, practicing: last.practicing };
  const label = young
    ? t("fam.chartYoung", { subject: name, proved: last.proved, ready: last.ready, practicing: last.practicing })
    : current
      ? t("fam.chart", { subject: name, weeks: weeks.length, ...counts })
      : t("fam.chartRange", { subject: name, weeks: weeks.length, start: shortDate(weeks[0].start, locale), end: shortDate(last.start, locale), ...counts });
  const proved = Object.values(statuses)
    .filter((x) => x.state === "proved" && getSkill(x.skillId)?.subject === subject)
    .map((x) => getSkill(x.skillId)!.title[locale])
    .sort((a, b) => a.localeCompare(b));

  return (
    <section aria-labelledby={id} className="space-y-4 rounded-lg border border-border bg-panel p-5 shadow-soft sm:p-6">
      <h2 id={id} className="flex items-center gap-2 font-brand text-t2 font-semibold text-ink">
        <SubjectDot subject={subject} /> {name}
      </h2>

      {subject !== "other" &&
        (touched ? (
          <div className="space-y-3">
            <WeekChart weeks={weeks} label={label} />
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink">
              {SERIES.map((x) => (
                <li key={x.key} className="flex items-center gap-2">
                  <Swatch series={x} />
                  {t(x.label)}
                  <span className="font-opmono font-semibold tabular-nums">{last[x.key]}</span>
                </li>
              ))}
            </ul>
            {young && (
              <div className="space-y-2">
                <Said text={label} />
                {proved.length > 0 && <Said text={t("fam.youProved", { skills: proved.join(", ") })} />}
              </div>
            )}
          </div>
        ) : (
          !young && <p className="text-sm text-muted">{t("fam.noSkills")}</p>
        ))}

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted">{week}</h3>
        <dl className="grid grid-cols-3 gap-2">
          {skills && (
            <Figure label={t("fam.checksPassed")}>
              {last.checks.passed}
              {last.checks.taken > 0 && <span className="text-xs font-normal text-muted"> {t("fam.ofTaken", { taken: last.checks.taken })}</span>}
            </Figure>
          )}
          <Figure label={t("growth.finished")}>{last.lessons}</Figure>
          <Figure label={t("growth.minutes")}>{last.minutes}</Figure>
        </dl>
        {young && (
          <Said
            text={`${week}. ${skills ? t("fam.weekYoungChecks", { checks: last.checks.passed, lessons: last.lessons, minutes: last.minutes }) : t("fam.weekYoung", { lessons: last.lessons, minutes: last.minutes })}`}
          />
        )}
        {!young && (last.lessons > 0 || last.readingMinutes > 0) && (
          <p className="text-xs text-muted">
            {[last.lessons > 0 && t("fam.lessonChecks", last.lessonChecks), last.readingMinutes > 0 && t("fam.reading", { n: last.readingMinutes })].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      {!young && <WeekTable growth={growth} name={name} skills={skills} current={current} />}
      {detail && current && subject !== "other" && <SkillList statuses={statuses} practiced={practiced} subject={subject} now={now} />}
      {detail && growth.lessons.length > 0 && <LessonList lessons={growth.lessons} />}
      {detail && results.length > 0 && <SchoolResults rows={results} />}
    </section>
  );
}

/** A line a young learner can hear. */
function Said({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-3 text-base text-ink">
      <span className="min-w-0 flex-1">{text}</span>
      <Hear text={text} className="min-h-14 min-w-14" />
    </p>
  );
}

function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col-reverse justify-end rounded-sm bg-panel2 px-3 py-2">
      <dt className="text-xs leading-tight text-muted">{label}</dt>
      <dd className="font-opmono text-t2 font-semibold tabular-nums text-ink">{children}</dd>
    </div>
  );
}

/** The same panel-and-chevron disclosure the skill map and the plan use. */
export function Disclosure({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  return (
    <details className="group rounded-md border border-border bg-panel">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-medium text-ink">
        {summary}
        <span aria-hidden="true" className="ml-auto text-muted transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="border-t border-border">{children}</div>
    </details>
  );
}

function WeekTable({ growth, name, skills, current }: { growth: Growth; name: string; skills: boolean; current: boolean }) {
  const t = useT();
  const locale = useLocale();
  const reading = growth.subject === "english";
  const caption = t("fam.tableCaption", { subject: name });
  const num = "whitespace-nowrap px-3 py-2 text-right font-opmono tabular-nums";
  return (
    <Disclosure summary={t("fam.byWeek")}>
      {/* Scrolls sideways inside its own box on a phone; the page itself never does. */}
      <div role="region" aria-label={caption} tabIndex={0} className="overflow-x-auto">
        <table className="w-full min-w-2xl text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th scope="col" className="px-3 py-2 text-left font-medium">
                {t("fam.col.week")}
              </th>
              {skills && (
                <>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    {t("fam.col.proved")}
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    {t("fam.col.ready")}
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    {t("fam.col.practicing")}
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    {t("fam.col.checks")}
                  </th>
                </>
              )}
              <th scope="col" className="px-3 py-2 text-right font-medium">
                {t("fam.col.lessons")}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                {t("fam.col.lessonChecks")}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                {t("fam.col.minutes")}
              </th>
              {reading && (
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {t("fam.col.reading")}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {growth.weeks.map((w, i) => (
              <tr key={w.start}>
                <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-normal text-ink">
                  {current && i === growth.weeks.length - 1 ? t("child.week") : shortDate(w.start, locale)}
                </th>
                {skills && (
                  <>
                    <td className={num}>{w.proved}</td>
                    <td className={num}>{w.ready}</td>
                    <td className={num}>{w.practicing}</td>
                    <td className={num}>{w.checks.taken ? t("fam.passedOf", { passed: w.checks.passed, taken: w.checks.taken }) : 0}</td>
                  </>
                )}
                <td className={num}>{w.lessons}</td>
                <td className={num}>{w.lessons ? `${w.lessonChecks.own} · ${w.lessonChecks.helped} · ${w.lessonChecks.missed}` : "—"}</td>
                <td className={num}>{w.minutes}</td>
                {reading && <td className={num}>{w.readingMinutes}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Disclosure>
  );
}

// Waiting for a check first (the next thing that can prove something), then practicing, then proved.
const ORDER: Record<SkillStatus["state"], number> = { ready: 0, checked: 1, refresh: 2, practicing: 3, proved: 4, new: 5 };

function SkillList({ statuses, practiced, subject, now }: { statuses: Statuses; practiced: Set<string>; subject: Growth["subject"]; now: number }) {
  const t = useT();
  const locale = useLocale();
  const s = useStore((x) => x);
  // The same skills the chart counts: placement probes or tutor help alone do not put a skill here.
  const list = Object.values(statuses)
    .filter((x) => getSkill(x.skillId)?.subject === subject && bucketOf(x.state) && practiced.has(x.skillId))
    .sort((a, b) => ORDER[a.state] - ORDER[b.state] || getSkill(a.skillId)!.title[locale].localeCompare(getSkill(b.skillId)!.title[locale]));
  if (!list.length) return null;
  return (
    <Disclosure summary={t("fam.skills", { n: list.length })}>
      <ul className="divide-y divide-border">
        {list.map((x) => {
          const skill = getSkill(x.skillId)!;
          return (
            <li key={x.skillId} className="flex items-start gap-3 px-4 py-2.5">
              <span aria-hidden="true" className={`mt-1.5 size-2.5 shrink-0 rounded-full ${STATUS_DOT[x.state]}`} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-ink">{skill.title[locale]}</span>
                <span className="block text-xs text-muted">
                  {statusLine(x, now, locale)}
                  {standardsOf(skill).length > 0 && <span className="font-opmono"> · {standardsOf(skill).join(", ")}</span>}
                  {x.stuck && <span className="text-warn"> · {t("child.stuck")}</span>}
                </span>
              </span>
              {!isReviewed(s, skill) && <Badge>{t("practice.draft")}</Badge>}
            </li>
          );
        })}
      </ul>
    </Disclosure>
  );
}

/** Each lesson finished in these weeks, with how its questions went. */
function LessonList({ lessons }: { lessons: LessonDone[] }) {
  const t = useT();
  const locale = useLocale();
  const courses = useStore((s) => s.courses);
  return (
    <Disclosure summary={t("fam.lessonsDone", { n: lessons.length })}>
      <ul className="divide-y divide-border">
        {lessons.map((l) => {
          const { course, lesson } = findLesson(courses, l.courseId, l.lessonId);
          return (
            <li key={l.id} className="space-y-0.5 px-4 py-2.5">
              <span className="block break-words text-sm text-ink">“{lesson?.title ?? course?.title ?? "—"}”</span>
              <span className="block text-xs text-muted">
                {course && lesson ? `${course.title} · ` : ""}
                {shortDate(l.at, locale)}
              </span>
              <span className="block font-opmono text-xs tabular-nums text-muted">{t("fam.lessonChecks", l.tally)}</span>
            </li>
          );
        })}
      </ul>
    </Disclosure>
  );
}

function SchoolResults({ rows }: { rows: SchoolRow[] }) {
  const t = useT();
  const locale = useLocale();
  return (
    <div className="space-y-2 border-t border-border pt-4">
      <h3 className="text-sm font-semibold text-ink">{t("fam.fromSchool")}</h3>
      <p className="text-xs text-muted">{t("fam.fromSchoolNote")}</p>
      <ul className="divide-y divide-border rounded-md border border-border">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-ink">{r.title}</span>
              <span className="block text-xs text-muted">
                {r.className ? `${r.className} · ` : ""}
                {shortDate(fromLocalDate(r.date).getTime(), locale)}
              </span>
            </span>
            <span className="shrink-0 font-opmono text-sm tabular-nums text-ink">{t("fam.score", { score: r.score, outOf: r.outOf })}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
