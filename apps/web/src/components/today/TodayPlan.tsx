"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconArrowRight, IconBook, IconCheck, IconCheckCircle, IconChat, IconClock, IconLayers, IconRefresh } from "@/components/icons";
import { whenLabel } from "@/components/practice/status";
import { Hear } from "@/components/stage/hear";
import { Button, SubjectDot, btn } from "@/components/ui";
import { t as tr, useT } from "@/i18n";
import { markDone, startPlanItem } from "@/lib/plan";
import { read } from "@/lib/store";
import type { Locale, Profile } from "@/lib/types";
import { fromLocalDate } from "@/planner/dates";
import type { Plan, PlanItem } from "@/planner/plan";
import { getSkill } from "@/practice/skills";

const ICON = { check: IconCheckCircle, prep: IconClock, due: IconBook, feedback: IconChat, daily: IconLayers, review: IconRefresh, lesson: IconBook };

/** What a plan line is called, in the learner's words. */
export function itemTitle(item: PlanItem, locale: Locale): string {
  const skill = (id?: string) => (id ? getSkill(id)?.title[locale] ?? "" : "");
  switch (item.kind) {
    case "check":
      return tr(locale, "plan.check", { skill: skill(item.skillIds[0]) });
    case "prep":
      return tr(locale, "plan.prep", { title: item.event!.title });
    case "due":
      return item.event!.title;
    case "feedback":
      return tr(locale, "plan.feedback", { skill: skill(item.skillIds[0]) });
    case "daily":
      return `${tr(locale, `subject.${item.subject!}`)}: ${skill(item.skillIds[0])}`;
    case "review":
      return tr(locale, "plan.review", { n: item.skillIds.length });
    case "lesson":
      return item.lesson!.title;
  }
}

export function itemMeta(item: PlanItem, locale: Locale, now: number): string {
  const min = tr(locale, "common.minutes", { n: item.minutes });
  switch (item.kind) {
    case "check":
      return `${tr(locale, "plan.checkMeta")} · ${min}`;
    case "prep":
      return `${tr(locale, "plan.inDays", { n: item.inDays! })} · ${tr(locale, "plan.skills", { n: item.skillIds.length })}`;
    case "due":
      return item.inDays === 0
        ? tr(locale, item.event!.kind === "test" || item.event!.kind === "quiz" ? "plan.today" : "plan.dueToday")
        : tr(locale, "plan.dueOn", { when: whenLabel(fromLocalDate(item.event!.date).getTime(), now, locale) });
    case "feedback":
      return `${tr(locale, "plan.feedbackMeta")} · ${min}`;
    case "daily":
    case "review":
      return `${tr(locale, "plan.setMeta")} · ${min}`;
    case "lesson":
      return `${item.lesson!.courseTitle} · ${min}`;
  }
}

export function TodayPlan({ plan, learner, now, young }: { plan: Plan; learner: Profile; now: number; young: boolean }) {
  const t = useT();
  const router = useRouter();
  const locale = learner.locale;
  const all = [...plan.lead, ...plan.more];
  const next = plan.lead.find((i) => !i.done) ?? plan.more.find((i) => !i.done);

  const start = (item: PlanItem) => {
    if (item.kind === "lesson") return router.push(`/learn/${item.lesson!.courseId}/${item.lesson!.lessonId}`);
    const id = startPlanItem(read(), learner, item, plan.date, now);
    if (id) router.push(`/practice/${id}?from=today`);
  };

  if (!all.length)
    return (
      <section aria-labelledby="today" className="rounded-lg border border-border bg-panel p-5">
        <h2 id="today" className="font-brand text-t2 font-semibold text-ink">
          {t("plan.title")}
        </h2>
        <p className="mt-2 text-sm text-muted">{t("plan.empty")}</p>
      </section>
    );

  const allDone = !next;
  return (
    <section aria-labelledby="today" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="today" className="font-brand text-t2 font-semibold text-ink">
          {t("plan.title")}
        </h2>
        <p className="font-opmono text-xs tabular-nums text-muted">
          {t("plan.progress", { done: plan.doneCount, total: all.length })} · {t("plan.budget", { n: plan.budget })}
        </p>
      </div>

      {next && <NextCard item={next} locale={locale} now={now} young={young} onStart={() => start(next)} learner={learner} date={plan.date} />}
      {allDone && (
        <p className="rounded-lg border border-border bg-panel px-5 py-4 text-ink">
          <IconCheck size={18} className="mr-2 inline text-good" />
          {t("plan.allDone")}
        </p>
      )}

      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-panel">
        {plan.lead
          .filter((i) => i !== next)
          .map((item) => (
            <PlanRow key={item.key} item={item} locale={locale} now={now} young={young} onStart={() => start(item)} learner={learner} date={plan.date} />
          ))}
      </ul>

      {plan.more.filter((i) => i !== next).length > 0 && (
        <details className="group rounded-lg border border-border bg-panel">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-sm font-medium text-ink sm:px-5">
            {t("plan.more", { n: plan.more.filter((i) => i !== next).length })}
            <span aria-hidden="true" className="ml-auto text-muted transition-transform group-open:rotate-90">
              ›
            </span>
          </summary>
          <ul className="divide-y divide-border border-t border-border">
            {plan.more
              .filter((i) => i !== next)
              .map((item) => (
                <PlanRow key={item.key} item={item} locale={locale} now={now} young={young} onStart={() => start(item)} learner={learner} date={plan.date} />
              ))}
          </ul>
        </details>
      )}
    </section>
  );
}

type RowProps = { item: PlanItem; locale: Locale; now: number; young: boolean; onStart: () => void; learner: Profile; date: string };

function NextCard({ item, locale, now, young, onStart, learner, date }: RowProps) {
  const t = useT();
  const Icon = ICON[item.kind];
  const title = itemTitle(item, locale);
  return (
    <div className="rounded-lg border border-border bg-panel p-5 shadow-lift sm:p-6">
      <p className="flex items-center gap-2 text-sm font-medium text-muted">
        <Icon size={16} /> {item.setId ? t("plan.pickUp") : t("plan.next")}
      </p>
      <div className="mt-1.5 flex items-start gap-3">
        <p className={`min-w-0 flex-1 font-brand font-semibold text-ink ${young ? "text-t1" : "text-t2 sm:text-t1"}`}>
          {item.subject && <span className="mr-2 inline-block align-middle"><SubjectDot subject={item.subject} /></span>}
          {title}
        </p>
        {young && <Hear text={title} />}
      </div>
      <p className="mt-1 text-sm text-muted">{itemMeta(item, locale, now)}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Actions item={item} onStart={onStart} learner={learner} date={date} primary />
      </div>
    </div>
  );
}

function PlanRow({ item, locale, now, young, onStart, learner, date }: RowProps) {
  const Icon = ICON[item.kind];
  const title = itemTitle(item, locale);
  return (
    <li className={`flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5 ${item.done ? "bg-panel2/50" : ""}`}>
      <span aria-hidden="true" className={`grid size-7 shrink-0 place-items-center rounded-full ${item.done ? "bg-good text-paper" : "border border-border text-muted"}`}>
        {item.done ? <IconCheck size={14} strokeWidth={2.5} /> : <Icon size={14} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block font-medium ${item.done ? "text-muted line-through decoration-border" : "text-ink"} ${young ? "text-base" : "text-sm"}`}>{title}</span>
        <span className="block text-xs text-muted">{itemMeta(item, locale, now)}</span>
      </span>
      {young && !item.done && <Hear text={title} />}
      {!item.done && <Actions item={item} onStart={onStart} learner={learner} date={date} />}
    </li>
  );
}

function Actions({ item, onStart, learner, date, primary }: { item: PlanItem; onStart: () => void; learner: Profile; date: string; primary?: boolean }) {
  const t = useT();
  if (item.done) return null;
  if (item.kind === "due")
    return (
      <>
        <Link href={`/talk?event=${item.event!.id}`} className={btn(primary ? "primary" : "secondary", primary ? "md" : "sm")}>
          <IconChat size={15} /> {t("plan.getHelp")}
        </Link>
        <Button variant={primary ? "secondary" : "ghost"} size={primary ? "md" : "sm"} onClick={() => markDone(learner.id, date, item.key)}>
          <IconCheck size={15} /> {t("plan.markDone")}
        </Button>
      </>
    );
  const label = item.setId ? t("plan.continue") : item.kind === "check" ? t("practice.startCheck") : t("practice.start");
  return primary ? (
    <Button onClick={onStart}>
      {label} <IconArrowRight size={16} />
    </Button>
  ) : (
    <Button size="sm" variant="secondary" onClick={onStart}>
      {label}
    </Button>
  );
}
