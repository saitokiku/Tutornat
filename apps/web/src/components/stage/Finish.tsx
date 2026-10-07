"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { IconArrowRight, IconCheck, IconHome } from "@/components/icons";
import { ResourceList } from "@/components/resources/ResourceList";
import { btn } from "@/components/ui";
import { useT } from "@/i18n";
import type { Key } from "@/i18n/en";
import type { Course, Lesson, Profile } from "@/lib/types";
import { resourcesFor } from "@/resources";
import { Hear, bigButton, sentences, useHear } from "./hear";
import type { Tally } from "./lesson";

const ROWS: [keyof Tally, Key, string][] = [
  ["own", "practice.ownLabel", "bg-good"],
  ["help", "practice.helpLabel", "bg-warn/60"],
  ["missed", "practice.missedLabel", "bg-panel ring-2 ring-bad/60"],
  ["untried", "stg.finish.untried", "bg-panel ring-1 ring-border"],
];

/** A line of text with its own read-aloud button (shown for K–2). */
function Said({ text, className, lang }: { text: string; className: string; lang?: string }) {
  return (
    <div className="flex items-start gap-3">
      <p className={`min-w-0 flex-1 ${className}`} lang={lang}>
        {text}
      </p>
      <Hear text={text} />
    </div>
  );
}

/**
 * The end of a lesson (plan §2.10): what happened, honestly counted (each check once; skipped checks
 * shown as not tried); where the facts came from; a clean stop back to Today; and the next lesson
 * offered as a link — never started for the learner.
 */
export function Finish({ course, lesson, learner, tally, seconds, next }: { course: Course; lesson: Lesson; learner: Profile; tally: Tally; seconds: number; next?: Lesson }) {
  const t = useT();
  const { young } = useHear();
  const answered = tally.own + tally.help + tally.missed;
  const checks = answered + tally.untried;
  const title = t("stage.finished");
  const citations = course.citations ?? [];
  const body = young ? "text-body" : "text-sm";
  const summary = sentences(t("stg.finish.summary", tally), tally.untried ? t("stg.finish.untriedSaid", { n: tally.untried }) : "");
  const rows = ROWS.filter(([k]) => k !== "untried" || tally.untried > 0);
  let tallyView: ReactNode;
  if (!checks) tallyView = <Said text={t("stg.finish.noChecks")} className={`text-ink ${body}`} />;
  else
    tallyView = (
      <div className="flex items-start gap-3">
        <dl className="min-w-0 flex-1 divide-y divide-border rounded-lg border border-border bg-panel">
          {rows.map(([k, label, dot]) => (
            <div key={k} className="flex items-center gap-3 px-5 py-3.5">
              <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${dot}`} />
              <dt className={`flex-1 text-ink ${body}`}>{t(label)}</dt>
              <dd className={`font-opmono tabular-nums text-ink ${body}`}>{tally[k]}</dd>
            </div>
          ))}
        </dl>
        <Hear text={summary} />
      </div>
    );

  return (
    <div className="px-5 py-10 sm:px-10">
      <div className="mx-auto max-w-xl space-y-8">
        <div className="space-y-3">
          <span aria-hidden="true" className="grid size-12 place-items-center rounded-full bg-good text-paper">
            <IconCheck size={24} />
          </span>
          <div className="flex items-center gap-3">
            <h2 id="scene-title" tabIndex={-1} className={`font-brand font-semibold text-ink focus:outline-none ${young ? "text-d3" : "text-t1"}`}>
              {title}
            </h2>
            <Hear text={title} />
          </div>
          <Said text={t("stage.finishedBody")} className={`text-muted ${body}`} />
        </div>

        {tallyView}
        <div className="space-y-2">
          <p className="font-opmono text-xs tabular-nums text-muted">{t("stage.minutesSpent", { n: Math.max(1, Math.round(seconds / 60)) })}</p>
          {answered > 0 && <Said text={t("stg.finish.honest")} className={`text-muted ${body}`} />}
        </div>

        {/* The clean stop comes first; the next lesson is only offered. */}
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/home" className={btn("primary", "md", bigButton(young))}>
            <IconHome size={16} /> {t("stg.finish.done")}
          </Link>
          <Hear text={t("stg.finish.done")} />
          <Link href={`/courses/${course.id}`} className={btn("ghost", "md", bigButton(young))}>
            {t("stage.backToCourse")}
          </Link>
        </div>

        {next ? (
          // A column on phones so the title is never squeezed by the button beside it.
          <section aria-label={t("stg.finish.next")} className="flex flex-col gap-4 rounded-md border border-border bg-panel px-5 py-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className={`font-semibold text-ink ${young ? "text-t3" : ""}`} lang={course.locale}>
                  {next.title}
                </p>
                <p className="font-opmono text-xs tabular-nums text-muted">{t("stage.time", { n: next.minutes })}</p>
              </div>
              <Hear text={`${t("stg.finish.startNext")}: ${next.title}`} />
            </div>
            <Link href={`/learn/${course.id}/${next.id}`} className={btn("secondary", "md", bigButton(young))}>
              {t("stg.finish.startNext")} <IconArrowRight size={16} />
            </Link>
          </section>
        ) : (
          <Said text={t("stg.finish.last")} className={`text-ink ${body}`} />
        )}

        {citations.length > 0 && (
          <section aria-labelledby="sources" className="space-y-2">
            <h3 id="sources" className="text-sm font-semibold text-ink">
              {t("stg.finish.sources")}
            </h3>
            <ul className="divide-y divide-border rounded-md border border-border bg-panel">
              {citations.map((c) => (
                <li key={c.url}>
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-0.5 px-4 py-3 hover:bg-panel2">
                    <span className="text-sm font-medium text-ink underline-offset-4 hover:underline">{c.title}</span>
                    <span className="text-xs text-muted">{c.source}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
        <ResourceList list={resourcesFor({ topic: `${course.title} ${course.goal} ${lesson.title}`, subject: course.subject, grade: course.grade, locale: learner.locale })} locale={learner.locale} />
      </div>
    </div>
  );
}
