"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Guard } from "@/components/gate";
import { EventMark, eventText } from "@/components/growth/events";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import { EmptyState, btn } from "@/components/ui";
import { useLocale, useT } from "@/i18n";
import { startOfWeek, summarizeWeek } from "@/lib/activity";
import { dayLabel, shortDate, timeLabel } from "@/lib/format";
import { currentLearner, learnersOf } from "@/lib/profiles";
import { useStore } from "@/lib/store";

export default function GrowthPage() {
  return (
    <Guard need="selected">
      <Growth />
    </Guard>
  );
}

const WEEK = 7 * 864e5;

function Growth() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const me = useStore(currentLearner);
  const kids = useStore(learnersOf);
  const learner = me ?? kids.find((k) => k.id === params.get("learner")) ?? kids[0];
  const events = useStore((s) => s.activity.filter((e) => e.profileId === learner?.id));
  const courses = useStore((s) => s.courses.filter((c) => c.profileId === learner?.id));
  const [thisWeek] = useState(() => startOfWeek(Date.now()));
  const [week, setWeek] = useState(thisWeek);

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

  const w = summarizeWeek(events, week);
  const figures: [string, number][] = [
    [t("growth.started"), w.started],
    [t("growth.finished"), w.finished],
    [t("growth.own"), w.own],
    [t("growth.help"), w.help],
    [t("growth.missed"), w.missed],
    [t("growth.minutes"), w.minutes],
  ];
  const days = w.days.filter((d) => d.events.length).reverse();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{me ? t("growth.title") : `${t("growth.title")} · ${learner.nickname}`}</h1>
        {!me && kids.length > 1 && (
          <div role="group" aria-label={t("growth.viewing")} className="flex flex-wrap gap-2">
            {kids.map((k) => (
              <button key={k.id} type="button" aria-pressed={k.id === learner.id} onClick={() => router.replace(`/growth?learner=${k.id}`)} className="k-chip">
                {k.nickname}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setWeek(week - WEEK)} aria-label={t("growth.prev")} className="grid size-10 place-items-center rounded-full border border-border bg-panel text-ink hover:border-ink/30">
          <IconChevronLeft size={18} />
        </button>
        <p className="min-w-44 text-center text-sm font-medium text-ink">{t("growth.weekOf", { date: shortDate(week, locale) })}</p>
        <button
          type="button"
          onClick={() => setWeek(week + WEEK)}
          disabled={week >= thisWeek}
          aria-label={t("growth.next")}
          className="grid size-10 place-items-center rounded-full border border-border bg-panel text-ink hover:border-ink/30 disabled:opacity-30"
        >
          <IconChevronRight size={18} />
        </button>
      </div>

      <dl className="grid grid-cols-2 divide-border overflow-hidden rounded-md border border-border bg-panel sm:grid-cols-3 lg:grid-cols-6 lg:divide-x">
        {figures.map(([label, n]) => (
          <div key={label} className="border-b border-border px-4 py-4 lg:border-b-0">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 font-opmono text-t1 font-semibold tabular-nums text-ink">{n}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted">{t("growth.note")}</p>

      {days.length === 0 ? (
        <EmptyState
          title={t("growth.empty")}
          action={
            me ? (
              <Link href="/home" className={btn("secondary")}>
                {t("growth.emptyCta")}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ol className="space-y-6">
          {days.map((d) => (
            <li key={d.day}>
              <h2 className="mb-2 text-sm font-semibold capitalize text-ink">{dayLabel(d.day, locale)}</h2>
              <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-panel">
                {d.events.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <EventMark e={e} />
                    <span className="min-w-0 flex-1 text-ink">{eventText(e, courses, t)}</span>
                    <span className="shrink-0 font-opmono text-xs tabular-nums text-muted">{timeLabel(e.at, locale)}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
