"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Guard } from "@/components/gate";
import { useTitle } from "@/components/LangSync";
import { DayLog } from "@/components/growth/DayLog";
import { SubjectGrowth } from "@/components/growth/SubjectGrowth";
import { EmptyState, btn } from "@/components/ui";
import { useT } from "@/i18n";
import { schoolResults, weeklyGrowth } from "@/lib/growth";
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

  return (
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
      {/* Keyed by learner so the day-by-day week resets when a grown-up switches child. */}
      <Record key={learner.id} learner={learner} self={!!me} now={now} />
    </div>
  );
}

/** The learner sees their own path; a grown-up sees the same, plus the skills behind it and results from school. */
function Record({ learner, self, now }: { learner: Profile; self: boolean; now: number }) {
  const t = useT();
  const s = useStore((x) => x);
  const growth = useMemo(() => weeklyGrowth(s, learner.id, now), [s, learner.id, now]);
  const statuses = statusesOf(s, learner.id, now);
  const results = useMemo(() => schoolResults(s, learner.id, localDate(growth[0].weeks[0].start)), [s, learner.id, growth]);
  // Subjects with something in them; daily subjects with nothing yet get one line, not a card of zeros.
  const shown = growth.filter((g) => g.any || (!self && results.some((r) => r.subject === g.subject)));
  const waiting = settingsOf(learner).subjects.filter((x) => !shown.some((g) => g.subject === x));
  const anything = shown.length > 0;

  return (
    <>
      <div className="max-w-prose space-y-2">
        <p className="text-sm text-ink">{self ? t("fam.growthSelf") : t("fam.growthFor", { name: learner.nickname })}</p>
        <p className="text-xs text-muted">{t("child.honest")}</p>
      </div>

      {anything ? (
        <div className="space-y-6">
          {shown.map((g) => (
            <SubjectGrowth key={g.subject} growth={g} statuses={statuses} results={self ? [] : results.filter((r) => r.subject === g.subject)} detail={!self} now={now} />
          ))}
          {waiting.length > 0 && <p className="text-sm text-muted">{t("fam.nothingYet", { subjects: waiting.map((x) => t(`subject.${x}`)).join(", ") })}</p>}
        </div>
      ) : (
        <EmptyState
          title={t("fam.growthEmpty")}
          body={self ? t("fam.growthEmptySelf") : t("fam.growthEmptyFor", { name: learner.nickname })}
          action={
            self ? (
              <Link href="/home" className={btn("secondary")}>
                {t("growth.emptyCta")}
              </Link>
            ) : undefined
          }
        />
      )}

      <DayLog profileId={learner.id} now={now} />
    </>
  );
}
