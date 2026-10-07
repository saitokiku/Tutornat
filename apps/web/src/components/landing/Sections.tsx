"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconCheck, IconInfo, IconNotYet } from "@/components/icons";
import { Badge, SubjectDot } from "@/components/ui";
import { gradeLabel, useT } from "@/i18n";
import type { Locale } from "@/lib/types";
import type { CourseLine, LandingData } from "./data";

// The quieter half of the page: what is covered (counted from the skill map, draft banks shown as
// draft), the real catalogue as a contents page, what a parent sees and gives, and where things stand.

const SUBJECTS = ["math", "english", "science"] as const;
const TINT = { math: "bg-math", english: "bg-english", science: "bg-science" } as const;
const RING = { math: "border-math", english: "border-english", science: "border-science" } as const;

export function SkillMap({ data, locale, onLocale }: { data: LandingData; locale: Locale; onLocale: (l: Locale) => void }) {
  const t = useT();
  return (
    <section aria-labelledby="subjects" className="border-t border-border">
      <div className="mx-auto grid max-w-wide gap-12 px-gutter py-20 sm:px-8 sm:py-28 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <h2 id="subjects" className="font-brand text-t1 font-semibold text-ink sm:text-d3">
            {t("land.subjects.title")}
          </h2>
          <p className="mt-4 max-w-[34rem] text-body text-muted">{t("land.subjects.body", { skills: data.totals.skills })}</p>
          <dl className="mt-8 space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <dt className="mt-1 flex shrink-0 gap-1" aria-hidden="true">
                <span className="size-2.5 rounded-full bg-ink" />
              </dt>
              <dd className="text-ink">{t("land.subjects.computed")}</dd>
            </div>
            <div className="flex items-start gap-3">
              <dt className="mt-1 flex shrink-0 gap-1" aria-hidden="true">
                <span className="size-2.5 rounded-full border-[1.5px] border-ink" />
              </dt>
              <dd className="text-ink">{t("land.subjects.draft")}</dd>
            </div>
          </dl>
          <p className="mt-8 max-w-[34rem] text-sm text-muted">
            {t("land.subjects.lang")}{" "}
            <button type="button" lang={locale === "en" ? "es" : "en"} onClick={() => onLocale(locale === "en" ? "es" : "en")} className="k-link inline cursor-pointer text-left">
              {t("land.subjects.switch")}
            </button>
          </p>
        </div>

        <div className="min-w-0 lg:col-span-7">
          <table className="w-full table-fixed border-collapse text-left">
            <caption className="sr-only">{t("land.subjects.caption")}</caption>
            <thead>
              <tr className="border-b border-ink">
                <th scope="col" className="w-11 pb-3 text-xs font-medium text-muted sm:w-20">
                  {t("land.subjects.grade")}
                </th>
                {SUBJECTS.map((s) => (
                  <th key={s} scope="col" className="pb-3 text-sm font-semibold text-ink">
                    <span className="inline-flex items-center gap-2">
                      <SubjectDot subject={s} />
                      {t(`subject.${s}`)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map.map((row) => (
                <tr key={row.grade} className="border-b border-border">
                  <th scope="row" className="py-2.5 font-opmono text-sm font-medium text-ink">
                    <span aria-hidden="true">{row.grade}</span>
                    <span className="sr-only">{gradeLabel(locale, row.grade)}</span>
                  </th>
                  {SUBJECTS.map((s) => {
                    const c = row.cells[s];
                    const total = c.computed + c.draft;
                    return (
                      <td key={s} className="py-2.5 pr-2 align-middle">
                        {total === 0 ? (
                          <span className="font-opmono text-xs text-muted">
                            <span aria-hidden="true">—</span>
                            <span className="sr-only">{t("land.subjects.none")}</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <span className="w-4 shrink-0 text-right font-opmono text-xs text-muted sm:w-5">
                              <span aria-hidden="true">{total}</span>
                              <span className="sr-only">{t("land.subjects.cell", { computed: c.computed, draft: c.draft })}</span>
                            </span>
                            <span aria-hidden="true" className="flex flex-wrap gap-0.5 sm:gap-1">
                              {Array.from({ length: c.computed }, (_, i) => (
                                <span key={`c${i}`} className={`k-dot size-1.5 rounded-full sm:size-2 ${TINT[s]}`} />
                              ))}
                              {Array.from({ length: c.draft }, (_, i) => (
                                <span key={`d${i}`} className={`k-dot size-1.5 rounded-full border sm:size-2 sm:border-[1.5px] ${RING[s]}`} />
                              ))}
                            </span>
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

const sameTopic = (a: CourseLine, b: CourseLine) => a.id.replace(/-es$/, "") === b.id.replace(/-es$/, "");

export function Courses({ courses, locale }: { courses: CourseLine[]; locale: Locale }) {
  const t = useT();
  // The visitor's language first; a course that exists only in the other language is listed and marked.
  const mine = courses.filter((c) => c.locale === locale);
  const shown = [...mine, ...courses.filter((c) => c.locale !== locale && !mine.some((m) => sameTopic(m, c)))];
  return (
    <section aria-labelledby="courses" className="border-t border-border">
      <div className="mx-auto max-w-wide px-gutter py-20 sm:px-8 sm:py-28">
        <div className="max-w-[40rem]">
          <h2 id="courses" className="font-brand text-t1 font-semibold text-ink sm:text-d3">
            {t("landing.inside.title")}
          </h2>
          <p className="mt-4 text-body text-muted">{t("land.courses.body")}</p>
        </div>
        <div className="mt-12 grid gap-x-12 gap-y-12 md:grid-cols-3">
          {SUBJECTS.map((s) => {
            const list = shown.filter((c) => c.subject === s);
            if (!list.length) return null;
            return (
              <div key={s}>
                <h3 className="flex items-center gap-2 border-b border-ink pb-3 font-brand text-t3 font-semibold text-ink">
                  <SubjectDot subject={s} />
                  {t(`subject.${s}`)}
                </h3>
                <ul className="divide-y divide-border">
                  {list.map((c) => (
                    <li key={c.id} className="flex items-baseline gap-3 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-ink" lang={c.locale}>
                          {c.title}
                        </span>
                        {c.locale !== locale && (
                          <span className="ml-2 align-middle">
                            <Badge>{t("land.courses.other")}</Badge>
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-right font-opmono text-xs whitespace-nowrap text-muted">
                        {gradeLabel(locale, c.grade, true)} · {t("course.lessons", { n: c.lessons })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const SEE = ["land.parents.see.1", "land.parents.see.2", "land.parents.see.3", "land.parents.see.4", "land.parents.see.5", "land.parents.see.6"] as const;

export function Parents() {
  const t = useT();
  return (
    <section aria-labelledby="parents" className="border-t border-border">
      <div className="mx-auto grid max-w-wide gap-12 px-gutter py-20 sm:px-8 sm:py-28 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-6">
          <h2 id="parents" className="font-brand text-t1 font-semibold text-ink sm:text-d3">
            {t("landing.parents.title")}
          </h2>
          <h3 className="mt-10 font-brand text-t3 font-semibold text-ink">{t("land.parents.ask.title")}</h3>
          <p className="mt-2 max-w-[34rem] text-body text-muted">{t("land.parents.ask.body")}</p>
          <h3 className="mt-10 font-brand text-t3 font-semibold text-ink">{t("land.parents.privacy.title")}</h3>
          <p className="mt-2 max-w-[34rem] text-body text-muted">{t("land.parents.privacy.body")}</p>
          <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/privacy" className="k-link">
              {t("land.parents.privacy.link")}
            </Link>
            <Link href="/terms" className="k-link">
              {t("land.parents.terms.link")}
            </Link>
          </p>
        </div>
        <div className="lg:col-span-5 lg:col-start-8 lg:pt-3">
          <h3 className="border-b border-ink pb-3 font-brand text-t3 font-semibold text-ink">{t("land.parents.see.title")}</h3>
          <ul className="divide-y divide-border">
            {SEE.map((k) => (
              <li key={k} className="flex items-start gap-3 py-3.5 text-body text-ink">
                <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" />
                {t(k)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

type Ai = "checking" | "on" | "off" | "unknown";

export function Status({ data }: { data: LandingData }) {
  const t = useT();
  const [ai, setAi] = useState<Ai>("checking");
  useEffect(() => {
    let live = true;
    fetch("/api/ai/status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { mode?: string }) => live && setAi(j.mode === "demo" ? "off" : "on"))
      .catch(() => live && setAi("unknown"));
    return () => {
      live = false;
    };
  }, []);

  const groups = [
    {
      title: t("land.status.today"),
      icon: <IconCheck size={18} className="text-good" />,
      items: [
        t("land.status.today.1", { skills: data.totals.skills }),
        t("land.status.today.2"),
        t("land.status.today.3"),
        t("land.status.today.4"),
        t("land.status.today.5", { n: data.totals.courses }),
        t("land.status.today.6"),
      ],
    },
    { title: t("land.status.ai"), icon: <IconInfo size={18} className="text-muted" />, items: [t("land.status.ai.1"), t("land.status.ai.2"), t("land.status.ai.3")] },
    {
      title: t("land.status.next"),
      icon: <IconNotYet size={18} className="text-muted" />,
      items: [t("land.status.next.1"), t("land.status.next.2"), t("land.status.next.3"), t("land.status.next.4"), t("land.status.next.5")],
    },
  ];

  return (
    <section aria-labelledby="status" className="border-t border-border">
      <div className="mx-auto max-w-wide px-gutter py-20 sm:px-8 sm:py-28">
        <div className="max-w-[40rem]">
          <h2 id="status" className="font-brand text-t1 font-semibold text-ink sm:text-d3">
            {t("landing.honest.title")}
          </h2>
          <p className="mt-4 text-body text-muted">{t("land.status.body")}</p>
        </div>
        <div className="mt-12 grid overflow-hidden rounded-lg border border-border bg-panel shadow-soft md:grid-cols-3">
          {groups.map((g, i) => (
            <div key={g.title} className={`px-5 py-6 sm:px-7 sm:py-7 ${i ? "border-t border-border md:border-t-0 md:border-l" : ""}`}>
              <h3 className="flex items-center gap-2 font-brand text-t3 font-semibold text-ink">
                {g.icon}
                {g.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {g.items.map((it) => (
                  <li key={it} className="text-sm text-ink">
                    {it}
                  </li>
                ))}
              </ul>
              {i === 1 && ai !== "unknown" && (
                <p aria-live="polite" className="mt-5 flex min-h-10 items-start gap-2 rounded-sm bg-panel2 px-3 py-2.5 text-xs text-ink">
                  <span aria-hidden="true" className={`mt-1 size-2 shrink-0 rounded-full ${ai === "on" ? "bg-good" : ai === "off" ? "bg-muted" : "k-skeleton"}`} />
                  <span>{ai === "checking" ? t("land.status.ai.checking") : ai === "on" ? t("land.status.ai.on") : t("land.status.ai.off")}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
