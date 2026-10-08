"use client";

import Link from "next/link";
import { subjectKey } from "@/components/courses/LangTag";
import { IconCheck, IconNotYet } from "@/components/icons";
import { Badge, SubjectDot } from "@/components/ui";
import { gradeLabel, useT } from "@/i18n";
import type { Locale } from "@/lib/types";
import type { CourseLine, LandingData } from "./data";
import { Ledger } from "./Faces";
import type { Outcome } from "./Sheet";

// The quieter half of the page: what a parent sees (right under the problem it reacts to), what is
// covered (counted from the skill map, draft banks shown as draft), the real catalogue as a contents page,
// and where things stand, with what it asks of a family and the privacy terms beside it.

const SUBJECTS = ["math", "english", "science"] as const;
const TINT = { math: "bg-math", english: "bg-english", science: "bg-science" } as const;
const RING = { math: "border-math", english: "border-english", science: "border-science" } as const;

const SEE = ["land.parents.see.1", "land.parents.see.2", "land.parents.see.3", "land.parents.see.4", "land.parents.see.5", "land.parents.see.6"] as const;

/** Directly under the hero: the parent's view of what the visitor just did, beside what a parent sees for each child. */
export function Parents({ data, outcomes }: { data: LandingData; outcomes: Outcome[] }) {
  const t = useT();
  const { rules } = data;
  return (
    <section aria-labelledby="parents" className="border-t border-border">
      {/* Phones: the record comes straight after the first paragraph, so it's the next thing under the
          problem. Wide screens: it sits in the right column, under the problem it reacts to. */}
      <div className="mx-auto grid max-w-wide gap-10 px-gutter py-14 sm:px-8 sm:py-24 lg:grid-cols-12 lg:gap-x-14 lg:gap-y-10">
        <div className="lg:col-span-5 lg:row-start-1">
          <h2 id="parents" className="font-brand text-t1 font-semibold text-ink sm:text-d3">
            {t("landing.parents.title")}
          </h2>
          <p className="mt-4 max-w-[34rem] text-body text-muted">{t("land.f.parent.body", { days: rules.secondCheckDays, pass: rules.checkPass, size: rules.checkSize })}</p>
        </div>
        <div className="min-w-0 lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1 lg:pt-2">
          <Ledger outcomes={outcomes} />
        </div>
        <div className="lg:col-span-5 lg:row-start-2">
          <h3 className="border-b border-ink pb-3 font-brand text-t3 font-semibold text-ink">{t("land.parents.see.title")}</h3>
          <ul className="divide-y divide-border">
            {SEE.map((k) => (
              <li key={k} className="flex items-start gap-3 py-2.5 text-body text-ink">
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

export function SkillMap({ data, locale, onLocale }: { data: LandingData; locale: Locale; onLocale: (l: Locale) => void }) {
  const t = useT();
  return (
    <section aria-labelledby="subjects" className="border-t border-border">
      <div className="mx-auto grid max-w-wide gap-12 px-gutter py-14 sm:px-8 sm:py-24 lg:grid-cols-12 lg:gap-16">
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
            <button
              type="button"
              lang={locale === "en" ? "es" : "en"}
              onClick={() => onLocale(locale === "en" ? "es" : "en")}
              className="k-link k-tap cursor-pointer rounded-sm text-left"
            >
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
                  <th scope="row" className="py-2.5 text-sm font-semibold text-ink tabular-nums">
                    <span aria-hidden="true">{row.grade}</span>
                    <span className="sr-only">{gradeLabel(locale, row.grade)}</span>
                  </th>
                  {SUBJECTS.map((s) => {
                    const c = row.cells[s];
                    const total = c.computed + c.draft;
                    return (
                      <td key={s} className="py-2.5 pr-2 align-middle">
                        {total === 0 ? (
                          <span className="text-xs text-muted">
                            <span aria-hidden="true">—</span>
                            <span className="sr-only">{t("land.subjects.none")}</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <span className="w-4 shrink-0 text-right text-xs text-muted tabular-nums sm:w-5">
                              <span aria-hidden="true">{total}</span>
                              <span className="sr-only">{t("land.subjects.cell", { computed: c.computed, draft: c.draft })}</span>
                            </span>
                            {/* Phones: one solid and/or one open mark says which kinds are here; the full count of dots
                                only where a row of ten fits on one line. */}
                            <span aria-hidden="true" className="flex gap-0.5 sm:hidden">
                              {c.computed > 0 && <span className={`k-dot size-2 rounded-full ${TINT[s]}`} />}
                              {c.draft > 0 && <span className={`k-dot size-2 rounded-full border-[1.5px] ${RING[s]}`} />}
                            </span>
                            <span aria-hidden="true" className="hidden flex-nowrap gap-1 sm:flex">
                              {Array.from({ length: c.computed }, (_, i) => (
                                <span key={`c${i}`} className={`k-dot size-2 shrink-0 rounded-full ${TINT[s]}`} />
                              ))}
                              {Array.from({ length: c.draft }, (_, i) => (
                                <span key={`d${i}`} className={`k-dot size-2 shrink-0 rounded-full border-[1.5px] ${RING[s]}`} />
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
      <div className="mx-auto max-w-wide px-gutter py-14 sm:px-8 sm:py-24">
        <div className="max-w-[40rem]">
          <h2 id="courses" className="font-brand text-t1 font-semibold text-ink sm:text-d3">
            {t("landing.inside.title")}
          </h2>
          <p className="mt-4 text-body text-muted">{t("land.courses.lede")}</p>
        </div>
        <div className="mt-12 grid gap-x-12 gap-y-12 md:grid-cols-3">
          {SUBJECTS.map((s) => {
            const list = shown.filter((c) => c.subject === s);
            if (!list.length) return null;
            return (
              <div key={s}>
                <h3 className="flex items-center gap-2 border-b border-ink pb-3 font-brand text-t3 font-semibold text-ink">
                  <SubjectDot subject={s} />
                  {/* Named by the visitor's language, as its courses come first: Spanish reading courses are "Lengua". */}
                  {t(subjectKey(s, locale))}
                </h3>
                <ul className="divide-y divide-border">
                  {list.map((c) => (
                    <li key={c.id} className="flex items-baseline gap-3 py-2.5">
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
                      <span className="k-meta shrink-0 text-right whitespace-nowrap">
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

/** Where things stand: what works today and what doesn't yet, said about the product (never the server),
 *  with what it asks of a family and how their information is handled beside it. */
export function Status({ data, aiOn }: { data: LandingData; aiOn: boolean }) {
  const t = useT();
  const ai = [t("land.status.talk"), t("land.status.ai.2"), t("land.status.ai.3")];
  const today = [
    t("land.status.today.1", { skills: data.totals.skills }),
    t("land.status.tutor"),
    t("land.status.today.2"),
    t("land.status.today.3"),
    t("land.status.today.4"),
    t("land.status.today.5", { n: data.totals.courses }),
    t("land.status.today.6"),
    ...(aiOn ? ai : []),
  ];
  const next = [...(aiOn ? [] : ai), t("land.status.next.1"), t("land.status.next.2"), t("land.status.next.3"), t("land.status.next.4"), t("land.status.next.5")];
  const groups = [
    { title: t("land.status.today"), icon: <IconCheck size={18} className="text-good" />, items: today },
    { title: t("land.status.next"), icon: <IconNotYet size={18} className="text-muted" />, items: next },
  ];

  return (
    <section aria-labelledby="status" className="border-t border-border">
      <div className="mx-auto grid max-w-wide gap-12 px-gutter py-14 sm:px-8 sm:py-24 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-5">
          <h2 id="status" className="font-brand text-t1 font-semibold text-ink sm:text-d3">
            {t("landing.honest.title")}
          </h2>
          <p className="mt-4 max-w-[34rem] text-body text-muted">{t("land.status.lede")}</p>
          <h3 className="mt-10 font-brand text-t3 font-semibold text-ink">{t("land.parents.ask.title")}</h3>
          <p className="mt-2 max-w-[34rem] text-sm text-muted">{t("land.parents.ask.body")}</p>
          <h3 className="mt-8 font-brand text-t3 font-semibold text-ink">{t("land.parents.privacy.title")}</h3>
          <p className="mt-2 max-w-[34rem] text-sm text-muted">{t("land.status.privacy")}</p>
          <p className="mt-3 flex flex-wrap gap-x-6 text-sm">
            <Link href="/privacy" className="k-link k-tap rounded-sm">
              {t("land.parents.privacy.link")}
            </Link>
            <Link href="/terms" className="k-link k-tap rounded-sm">
              {t("land.parents.terms.link")}
            </Link>
          </p>
        </div>
        <div className="min-w-0 lg:col-span-7 lg:pt-2">
          <div className="grid overflow-hidden rounded-lg border border-border bg-panel shadow-soft sm:grid-cols-2">
            {groups.map((g, i) => (
              <div key={g.title} className={`px-5 py-6 sm:px-7 sm:py-7 ${i ? "border-t border-border sm:border-t-0 sm:border-l" : ""}`}>
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
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
