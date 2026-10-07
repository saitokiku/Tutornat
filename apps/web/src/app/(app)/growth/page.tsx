"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { bandOf } from "@/catalogue";
import { Guard } from "@/components/gate";
import { useTitle } from "@/components/LangSync";
import { DayLog } from "@/components/growth/DayLog";
import { SubjectGrowth } from "@/components/growth/SubjectGrowth";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import { Hear, HearContext } from "@/components/stage/hear";
import { EmptyState, btn } from "@/components/ui";
import { useLocale, useT } from "@/i18n";
import { shortDate } from "@/lib/format";
import { practicedSkills, recordStart, schoolResults, weeklyGrowth, windowEnd } from "@/lib/growth";
import { settingsOf, statusesOf } from "@/lib/practice";
import { currentLearner, learnersOf } from "@/lib/profiles";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { localDate } from "@/planner/dates";

export default function GrowthPage() {
  return (
    <Guard need="selected">
      <Growth />
    </Guard>
  );
}

function Growth() {
  const t = useT();
  useTitle(t("growth.title"));
  const router = useRouter();
  const params = useSearchParams();
  const me = useStore(currentLearner);
  const kids = useStore(learnersOf);
  const learner = me ?? kids.find((k) => k.id === params.get("learner")) ?? kids[0];
  const [now] = useState(() => Date.now());

  if (!learner)
    return (
      <EmptyState
        title={t("family.empty")}
        action={
          <Link href="/profiles" className={btn("secondary")}>
            {t("profiles.add")}
          </Link>
        }
      />
    );

  // A K–2 learner's own path: tap-to-hear, bigger steps, the numbers in a sentence instead of a table.
  const young = !!me && bandOf(me.grade) === "k2";
  return (
    <HearContext.Provider value={{ hear: young, young, locale: learner.locale }}>
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{me ? t("growth.title") : `${t("growth.title")} · ${learner.nickname}`}</h1>
          {!me && kids.length > 1 && (
            <div role="group" aria-label={t("growth.viewing")} className="flex flex-wrap gap-2">
              {kids.map((k) => (
                <button key={k.id} type="button" aria-pressed={k.id === learner.id} onClick={() => router.replace(`/growth?learner=${k.id}`)} className="k-chip min-h-11 px-4">
                  {k.nickname}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Keyed by learner so the weeks shown and the day-by-day week reset when a grown-up switches child. */}
        <Record key={learner.id} learner={learner} self={!!me} young={young} now={now} />
      </div>
    </HearContext.Provider>
  );
}

/** The learner sees their own path; a grown-up sees the same, plus the skills and lessons behind it and results from school. */
function Record({ learner, self, young, now }: { learner: Profile; self: boolean; young: boolean; now: number }) {
  const t = useT();
  const locale = useLocale();
  const s = useStore((x) => x);
  // Which eight weeks: 0 = the ones ending this week, 1 = the eight before them, and so on.
  const [back, setBack] = useState(0);
  const until = windowEnd(now, back);
  const growth = useMemo(() => weeklyGrowth(s, learner.id, until), [s, learner.id, until]);
  const statuses = statusesOf(s, learner.id, until);
  const practiced = useMemo(() => practicedSkills(s.attempts.filter((a) => a.profileId === learner.id && a.at <= until)), [s.attempts, learner.id, until]);
  const weeks = growth[0].weeks;
  const results = useMemo(() => schoolResults(s, learner.id, localDate(weeks[0].start), localDate(until)), [s, learner.id, weeks, until]);
  const first = useMemo(() => recordStart(s, learner.id), [s, learner.id]);
  const earlier = first !== undefined && first < weeks[0].start;
  // Subjects with something in them; daily subjects with nothing yet get one line, not a card of zeros.
  const shown = growth.filter((g) => g.any || (!self && results.some((r) => r.subject === g.subject)));
  const waiting = settingsOf(learner).subjects.filter((x) => !shown.some((g) => g.subject === x));
  const intro = young ? t("fam.growthYoung") : self ? t("fam.growthSelf") : t("fam.growthFor", { name: learner.nickname });
  const honest = young ? t("fam.provedYoung") : t("child.honest");
  const step = `grid place-items-center rounded-full border border-border bg-panel text-ink hover:border-ink/30 aria-disabled:cursor-default aria-disabled:opacity-30 aria-disabled:hover:border-border ${young ? "size-14" : "size-11"}`;

  return (
    <>
      <div className="max-w-prose space-y-2">
        <p className={`flex items-center gap-3 text-ink ${young ? "text-base" : "text-sm"}`}>
          <span className="min-w-0 flex-1">{intro}</span>
          <Hear text={`${intro} ${honest}`} className="min-h-14 min-w-14" />
        </p>
        <p className={young ? "text-sm text-muted" : "text-xs text-muted"}>{honest}</p>
      </div>

      {(earlier || back > 0) && (
        <div className="flex items-center gap-2">
          {/* aria-disabled, not disabled: keyboard focus stays put at either end. */}
          <button type="button" onClick={() => earlier && setBack(back + 1)} aria-disabled={!earlier || undefined} aria-label={t("fam.earlier")} className={step}>
            <IconChevronLeft size={young ? 22 : 18} />
          </button>
          <p aria-live="polite" className="min-w-0 flex-1 text-center text-sm font-medium text-ink sm:flex-none sm:px-2">
            {t("fam.window", { from: shortDate(weeks[0].start, locale), to: shortDate(weeks[weeks.length - 1].start, locale) })}
          </p>
          <button type="button" onClick={() => back > 0 && setBack(back - 1)} aria-disabled={back === 0 || undefined} aria-label={t("fam.later")} className={step}>
            <IconChevronRight size={young ? 22 : 18} />
          </button>
        </div>
      )}

      {shown.length > 0 ? (
        <div className="space-y-6">
          {shown.map((g) => (
            <SubjectGrowth
              key={g.subject}
              growth={g}
              statuses={statuses}
              practiced={practiced}
              results={self ? [] : results.filter((r) => r.subject === g.subject)}
              detail={!self}
              young={young}
              current={back === 0}
              now={until}
            />
          ))}
          {waiting.length > 0 && <p className="text-sm text-muted">{t("fam.nothingYet", { subjects: waiting.map((x) => t(`subject.${x}`)).join(", ") })}</p>}
        </div>
      ) : back > 0 ? (
        <EmptyState title={t("fam.windowEmpty")} />
      ) : (
        <EmptyState
          title={t("fam.growthEmpty")}
          body={self ? t("fam.growthEmptySelf") : t("fam.growthEmptyFor", { name: learner.nickname })}
          action={
            self ? (
              <Link href="/home" className={btn("secondary", "md", young ? "min-h-14 px-6 text-base" : "")}>
                {t("growth.emptyCta")}
              </Link>
            ) : undefined
          }
        />
      )}

      <DayLog profileId={learner.id} now={now} young={young} />
    </>
  );
}
