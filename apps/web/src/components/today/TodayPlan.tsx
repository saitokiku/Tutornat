"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { IconArrowRight, IconBook, IconCheck, IconCheckCircle, IconChat, IconClock, IconLayers, IconRefresh } from "@/components/icons";
import { whenLabel } from "@/components/practice/status";
import { sentences } from "@/components/stage/hear";
import { Badge, Button, SubjectDot, btn } from "@/components/ui";
import { t as tr, useLocale, useT } from "@/i18n";
import { lessonState } from "@/lib/activity";
import { markDone, startPlanItem } from "@/lib/plan";
import { isReviewed } from "@/lib/review";
import { read, useStore } from "@/lib/store";
import type { Locale, Profile } from "@/lib/types";
import { fromLocalDate, localDate } from "@/planner/dates";
import type { Plan, PlanItem } from "@/planner/plan";
import { getSkill } from "@/practice/skills";
import { BigHear } from "./BigHear";
import { CourseTags } from "./CoursesInProgress";
import { PlanPicture } from "./PlanPicture";

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

/** The line under a plan title. `minutes: false` for pre-readers, who see no minute numbers. */
export function itemMeta(item: PlanItem, locale: Locale, now: number, minutes = true): string {
  const min = minutes ? ` · ${tr(locale, "common.minutes", { n: item.minutes })}` : "";
  switch (item.kind) {
    case "check":
      return `${tr(locale, "plan.checkMeta")}${min}`;
    case "prep":
      return `${tr(locale, "plan.inDays", { n: item.inDays! })} · ${tr(locale, "plan.skills", { n: item.skillIds.length })}`;
    case "due":
      return item.inDays === 0
        ? tr(locale, item.event!.kind === "test" || item.event!.kind === "quiz" ? "plan.today" : "plan.dueToday")
        : tr(locale, "plan.dueOn", { when: whenLabel(fromLocalDate(item.event!.date).getTime(), now, locale) });
    case "feedback":
      return `${tr(locale, "plan.feedbackMeta")}${min}`;
    case "daily":
    case "review":
      return `${tr(locale, "plan.setMeta")}${min}`;
    case "lesson":
      return `${item.lesson!.courseTitle}${min}`;
  }
}

/**
 * Opens the work behind a plan line: the lesson, or the line's set (made now, or the one already
 * started today). Only ever called from a tap — nothing on Today starts by itself. The set is filed
 * under the day of the tap, so a screen left open past midnight still files today's work as today's.
 */
export function usePlanStart(learner: Profile) {
  const router = useRouter();
  return (item: PlanItem) => {
    if (item.kind === "lesson") return router.push(`/learn/${item.lesson!.courseId}/${item.lesson!.lessonId}`);
    const now = Date.now();
    const id = startPlanItem(read(), learner, item, localDate(now), now);
    if (id) router.push(`/practice/${id}?from=today`);
  };
}

type Props = {
  plan: Plan;
  learner: Profile;
  now: number;
  /** K–2: picture tiles, read-aloud, bigger targets, no minute numbers. */
  young: boolean;
  /** A grown-up looking at the child's plan: the same lines, nothing to start (answers stay the child's). */
  grownUp?: boolean;
  /** Today's minutes are used (measured), so the plan says it's fine to stop. */
  timeUp?: boolean;
};

type Ctx = {
  locale: Locale;
  now: number;
  learner: Profile;
  date: string;
  tiles: boolean;
  grownUp: boolean;
  minutes: boolean;
  start: (item: PlanItem) => void;
};

/**
 * Today's plan. The structure decides what is on it; the learner decides which first: the Next card is
 * only the suggested start, and every line can be started from its own row, in any order.
 */
export function TodayPlan({ plan, learner, now, young, grownUp = false, timeUp = false }: Props) {
  const t = useT();
  const locale = useLocale();
  const start = usePlanStart(learner);
  const tiles = young && !grownUp;
  const ctx: Ctx = { locale, now, learner, date: plan.date, tiles, grownUp, minutes: !young || grownUp, start };
  const next = plan.lead.find((i) => !i.done);
  const rest = plan.lead.filter((i) => i !== next);
  // The count is of today's plan (the lead), the same lines "done for today" is decided by; the extra
  // lines below carry their own count.
  const progress = t("plan.progress", { done: plan.lead.filter((i) => i.done).length, total: plan.lead.length });
  const more = t("plan.more", { n: plan.more.length });
  const stop = !!next && timeUp && !grownUp;
  // K–2 hear the plan's heading, its count and the time-up line with the card they belong to: one
  // speaker for each thing to do, none on a heading or a counter.
  const intro = sentences(`${t("plan.title")}: ${progress}`, stop ? t("today.timeUp") : "");

  const heading = (
    <h2 id="today" className="font-brand text-t2 font-semibold text-ink">
      {t("plan.title")}
    </h2>
  );

  if (!plan.lead.length && !plan.more.length)
    return (
      <section aria-labelledby="today" className="space-y-2 rounded-lg border border-border bg-panel p-5">
        {heading}
        <p className="flex items-center gap-2 text-sm text-muted">
          <span className="flex-1">{t("plan.empty")}</span>
          <BigHear text={sentences(t("plan.title"), t("plan.empty"))} />
        </p>
      </section>
    );

  return (
    <section aria-labelledby="today" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        {heading}
        <p className="k-meta">
          {progress}
          {ctx.minutes && ` · ${t("plan.budget", { n: plan.budget })}`}
        </p>
      </div>

      {next ? <NextCard item={next} ctx={ctx} intro={intro} /> : <DoneForToday tiles={tiles} more={plan.more.some((i) => !i.done)} intro={intro} />}
      {stop && <p className="rounded-lg border border-border bg-panel2 px-5 py-3.5 text-sm text-ink">{t("today.timeUp")}</p>}

      {rest.length > 0 && <Lines items={rest} ctx={ctx} />}

      {plan.more.length > 0 && (
        // The speaker sits beside the summary, not in it: a button inside <summary> is invalid and would toggle it.
        <div className="relative rounded-lg border border-border bg-panel">
          <details className="group">
            <summary className={`flex cursor-pointer list-none items-center gap-2 rounded-lg px-4 font-medium text-ink sm:px-5 ${tiles ? "min-h-16 pr-20 text-base sm:pr-20" : "min-h-12 text-sm"}`}>
              {more}
              <span aria-hidden="true" className="ml-auto text-muted transition-transform group-open:rotate-90">
                ›
              </span>
            </summary>
            <div className={tiles ? "border-t border-border p-3 sm:p-4" : "border-t border-border"}>
              <Lines items={plan.more} ctx={ctx} flush />
            </div>
          </details>
          {tiles && (
            <span className="absolute right-1 top-1">
              <BigHear text={more} />
            </span>
          )}
        </div>
      )}

      {grownUp && <p className="text-sm text-muted">{t("today.readOnly", { name: learner.nickname })}</p>}
    </section>
  );
}

function Lines({ items, ctx, flush }: { items: PlanItem[]; ctx: Ctx; flush?: boolean }) {
  if (ctx.tiles)
    return (
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {items.map((item) => (
          <PlanTile key={item.key} item={item} ctx={ctx} />
        ))}
      </ul>
    );
  return (
    <ul className={`divide-y divide-border ${flush ? "" : "overflow-hidden rounded-lg border border-border bg-panel"}`}>
      {items.map((item) => (
        <PlanRow key={item.key} item={item} ctx={ctx} />
      ))}
    </ul>
  );
}

/**
 * What a line needs said about it besides its title: hand-written questions not yet reviewed by a
 * teacher, and for a lesson, what made its course (AI, a template) and its language. Plus whether a
 * lesson is already under way, so it reads "Continue" here just as it does under the courses.
 */
function useLineFacts(item: PlanItem, ctx: Ctx) {
  const t = useT();
  // "Draft questions" is for readers and grown-ups. A pre-reader's tile never shouts it; the family page,
  // review and the runner's footer keep it honest for the grown-up.
  const draft = useStore((s) =>
    !ctx.tiles &&
    item.skillIds.some((id) => {
      const skill = getSkill(id);
      return skill ? !isReviewed(s, skill) : false;
    }),
  );
  const course = useStore((s) => (item.lesson ? s.courses.find((c) => c.id === item.lesson!.courseId) : undefined));
  const lessonStarted = useStore(
    (s) => !!item.lesson && !item.done && lessonState(s.activity.filter((e) => e.profileId === ctx.learner.id), item.lesson.courseId, item.lesson.lessonId) === "started",
  );
  const tags = (
    <>
      {draft && <Badge tone="warn">{t("practice.draft")}</Badge>}
      {course && <CourseTags course={course} locale={ctx.locale} assigned={false} />}
    </>
  );
  return { tags, hasTags: draft || !!course, resumes: !!item.setId || lessonStarted, lang: course?.locale };
}

/** School lines open their item page from the title. */
function TitleText({ item, title }: { item: PlanItem; title: string }) {
  if (!item.event) return <>{title}</>;
  return (
    <Link href={`/calendar/${item.event.id}`} className="underline decoration-border underline-offset-4 hover:decoration-ink">
      {title}
    </Link>
  );
}

/** The suggested start: its lift shadow marks it, so no label sits above its title. */
function NextCard({ item, ctx, intro }: { item: PlanItem; ctx: Ctx; intro: string }) {
  const facts = useLineFacts(item, ctx);
  const title = itemTitle(item, ctx.locale);
  const text = (
    <div className="min-w-0 flex-1">
      <p className="font-brand text-t2 font-semibold text-ink sm:text-t1" lang={facts.lang}>
        {item.subject && (
          <span className="mr-2 inline-block align-middle">
            <SubjectDot subject={item.subject} />
          </span>
        )}
        <TitleText item={item} title={title} />
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
        {itemMeta(item, ctx.locale, ctx.now, ctx.minutes)}
        {facts.tags}
      </p>
    </div>
  );
  return (
    <div id="next" className="rounded-lg border border-border bg-panel p-5 shadow-lift sm:p-6">
      {ctx.tiles ? (
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="w-24 shrink-0 sm:w-44">
            <PlanPicture item={item} locale={ctx.locale} />
          </div>
          {text}
        </div>
      ) : (
        text
      )}
      {!ctx.grownUp && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Actions item={item} ctx={ctx} title={title} resumes={facts.resumes} primary />
          <span className="ml-auto">
            <BigHear text={sentences(title, intro)} />
          </span>
        </div>
      )}
    </div>
  );
}

function PlanRow({ item, ctx }: { item: PlanItem; ctx: Ctx }) {
  const t = useT();
  const facts = useLineFacts(item, ctx);
  const Icon = ICON[item.kind];
  const title = itemTitle(item, ctx.locale);
  return (
    <li className={`flex items-center gap-3 px-4 py-3.5 sm:px-5 ${item.done ? "bg-panel2/50" : ""}`}>
      <span aria-hidden="true" className={`grid size-7 shrink-0 place-items-center rounded-full ${item.done ? "bg-good text-paper" : "border border-border text-muted"}`}>
        {item.done ? <IconCheck size={14} strokeWidth={2.5} /> : <Icon size={14} />}
      </span>
      {/* On a narrow screen the actions drop below the title, never squeezing it. */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
        <span className="min-w-0 flex-1 basis-40">
          <span className={`block text-sm font-medium ${item.done ? "text-muted line-through decoration-border" : "text-ink"}`} lang={facts.lang}>
            <TitleText item={item} title={title} />
          </span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            {itemMeta(item, ctx.locale, ctx.now, ctx.minutes)}
            {facts.tags}
          </span>
        </span>
        {item.done && <span className="text-xs font-medium text-muted">{t("today.done")}</span>}
        {!ctx.grownUp && (
          <span className="flex flex-wrap items-center gap-2 empty:hidden">
            <Actions item={item} ctx={ctx} title={title} resumes={facts.resumes} />
          </span>
        )}
      </div>
    </li>
  );
}

/**
 * K–2: a picture tile. The whole tile starts the line; the speaker beside it reads its name. On a phone
 * the speaker gets its own row under the Start mark; from `sm` up it sits beside it. Either way the two
 * never overlap, whatever the length of the word.
 */
function PlanTile({ item, ctx }: { item: PlanItem; ctx: Ctx }) {
  const t = useT();
  const facts = useLineFacts(item, ctx);
  const title = itemTitle(item, ctx.locale);
  const name = (
    <span className="flex items-start gap-2 px-1 font-brand text-t3 font-semibold text-ink" lang={facts.lang}>
      {item.subject && (
        <span className="mt-2">
          <SubjectDot subject={item.subject} />
        </span>
      )}
      <span className={`min-w-0 break-words ${item.done ? "text-muted line-through decoration-border" : ""}`}>{title}</span>
    </span>
  );
  const tags = facts.hasTags && <span className="flex flex-wrap items-center gap-1.5 px-1">{facts.tags}</span>;
  // Room for the 56px speaker in the tile's bottom-right corner.
  const clear = "pb-16 sm:pb-0 sm:pr-16";
  const shell = "flex h-full min-h-14 w-full flex-col gap-3 rounded-lg border border-border p-2.5 text-left sm:p-3";
  let tile: ReactNode;
  if (item.done)
    tile = (
      <div className={`${shell} bg-panel2/50`}>
        <span className="opacity-60">
          <PlanPicture item={item} locale={ctx.locale} />
        </span>
        {name}
        <span className={`mt-auto flex min-h-10 items-center gap-2 px-1 text-sm font-medium text-muted sm:min-h-14 ${item.kind === "due" ? "" : clear}`}>
          <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-good text-paper">
            <IconCheck size={13} strokeWidth={2.5} />
          </span>
          {t("today.done")}
        </span>
        {item.kind === "due" && (
          <span className="flex flex-col gap-2 pb-16">
            <Actions item={item} ctx={ctx} title={title} resumes={false} />
          </span>
        )}
      </div>
    );
  else if (item.kind === "due")
    tile = (
      <div className={`${shell} bg-panel shadow-soft`}>
        <PlanPicture item={item} locale={ctx.locale} />
        {name}
        {tags}
        <span className="mt-auto flex flex-col gap-2 pb-16">
          <Actions item={item} ctx={ctx} title={title} resumes={false} />
        </span>
      </div>
    );
  else
    tile = (
      <button type="button" onClick={() => ctx.start(item)} className={`${shell} bg-panel shadow-soft transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-lift`}>
        <PlanPicture item={item} locale={ctx.locale} />
        {name}
        {tags}
        <span className={`mt-auto flex min-h-10 min-w-0 items-center sm:min-h-14 ${clear}`}>
          <span className="inline-flex min-h-10 max-w-full items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm font-semibold text-ink sm:px-4">
            {startLabel(item, facts.resumes, t)} <IconArrowRight size={15} className="shrink-0" />
          </span>
        </span>
      </button>
    );
  return (
    <li className="relative">
      {tile}
      <span className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3">
        <BigHear text={title} />
      </span>
    </li>
  );
}

function DoneForToday({ tiles, more, intro }: { tiles: boolean; more: boolean; intro: string }) {
  const t = useT();
  const title = tiles ? t("today.allDoneYoung") : t("today.allDone");
  const body = tiles ? "" : more ? t("today.allDoneBody") : t("today.allDoneBodyNoMore");
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-panel px-5 py-5 sm:px-6">
      <IconCheckCircle size={22} className="mt-0.5 shrink-0 text-good" />
      <div className="min-w-0 flex-1">
        <p className="font-brand text-t2 font-semibold text-ink">{title}</p>
        {body && <p className="mt-1 text-sm text-muted">{body}</p>}
      </div>
      <BigHear text={sentences(title, intro)} />
    </div>
  );
}

/** "Continue" for a line under way (its set, or its lesson), else the start word for its kind. */
const startLabel = (item: PlanItem, resumes: boolean, t: ReturnType<typeof useT>) =>
  resumes ? t("plan.continue") : item.kind === "check" ? t("practice.startCheck") : t("practice.start");

function Actions({ item, ctx, title, resumes, primary }: { item: PlanItem; ctx: Ctx; title: string; resumes: boolean; primary?: boolean }) {
  const t = useT();
  // K–2: 56px targets; tiles are narrow on a phone, so their buttons keep a smaller side padding.
  const big = ctx.tiles ? `min-h-14 text-base ${primary ? "px-7" : "px-4"}` : "";
  // The visible word leads the accessible name and the line's title follows, so "Start" is never ambiguous.
  const named = (label: string) => ({ "aria-label": `${label}, ${title}` });
  if (item.kind === "due" && item.done)
    return (
      <Button variant="ghost" className={big} onClick={() => markDone(ctx.learner.id, ctx.date, item.key, false)} {...named(t("today.undo"))}>
        {t("today.undo")}
      </Button>
    );
  if (item.done) return null;
  if (item.kind === "due")
    return (
      <>
        <Link href={`/talk?event=${item.event!.id}`} className={btn(primary ? "primary" : "secondary", "md", big)} {...named(t("plan.getHelp"))}>
          <IconChat size={16} className="shrink-0" /> {t("plan.getHelp")}
        </Link>
        {/* Ticked off on the day of the tap, like a set started from here. */}
        <Button variant={primary ? "secondary" : "ghost"} className={big} onClick={() => markDone(ctx.learner.id, localDate(Date.now()), item.key)} {...named(t("plan.markDone"))}>
          <IconCheck size={16} className="shrink-0" /> {t("plan.markDone")}
        </Button>
      </>
    );
  const label = startLabel(item, resumes, t);
  return (
    <Button variant={primary ? "primary" : "secondary"} className={big} onClick={() => ctx.start(item)} {...named(label)}>
      {label}
      {primary && <IconArrowRight size={16} />}
    </Button>
  );
}
