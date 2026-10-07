"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { EventForm } from "@/components/calendar/EventForm";
import { SkillPicker } from "@/components/calendar/SkillPicker";
import { useTitle } from "@/components/LangSync";
import { IconArrowLeft, IconArrowRight, IconChat, IconCheck, IconPen, IconTrash } from "@/components/icons";
import { STATUS_DOT, statusLine } from "@/components/practice/status";
import { ParentGate } from "@/components/profiles/ParentGate";
import { ResourceList } from "@/components/resources/ResourceList";
import { Badge, Button, EmptyState, btn } from "@/components/ui";
import { useT } from "@/i18n";
import { dayLabel, relativeDay } from "@/lib/format";
import { startSet, statusesOf } from "@/lib/practice";
import { currentLearner, learnersOf } from "@/lib/profiles";
import { isReviewed } from "@/lib/review";
import { classesOf, getEvent, removeEvent, suggestSkills, updateEvent } from "@/lib/school";
import { read, useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { fromLocalDate, localDate } from "@/planner/dates";
import { PLAN_RULES } from "@/planner/plan";
import type { SchoolEvent } from "@/planner/types";
import { getSkill } from "@/practice/skills";
import type { Skill } from "@/practice/types";
import { resourcesFor, type Resource } from "@/resources";
import { AttachedFile } from "./AttachedFile";

/**
 * One school item: what it is and when, what came with it, the skills it covers and where each
 * stands, and the next step — prep for a test, practice or help for homework. A learner sees only
 * their own items; a grown-up sees any of the family's.
 */
export function SchoolItem({ eventId }: { eventId: string }) {
  const t = useT();
  const learner = useStore(currentLearner);
  const event = useStore((s) =>
    learner
      ? getEvent(s, eventId, learner.id)
      : learnersOf(s)
          .map((p) => getEvent(s, eventId, p.id))
          .find(Boolean),
  );
  const profile = useStore((s) => learner ?? learnersOf(s).find((p) => p.id === event?.profileId));
  useTitle(event?.title ?? t("common.notFound.title"));
  if (!event || !profile)
    return (
      <EmptyState
        title={t("common.notFound.title")}
        body={t("common.notFound.body")}
        action={
          <Link href="/calendar" className={btn("secondary")}>
            {t("intake.item.backToCalendar")}
          </Link>
        }
      />
    );
  return <Item key={event.id} event={event} profile={profile} asLearner={!!learner} />;
}

const EXAM = new Set(["test", "quiz"]);

function Item({ event, profile, asLearner }: { event: SchoolEvent; profile: Profile; asLearner: boolean }) {
  const t = useT();
  const router = useRouter();
  const locale = profile.locale;
  const [now] = useState(() => Date.now());
  const today = localDate(now);
  const statuses = useStore((s) => statusesOf(s, profile.id, now));
  const classes = useStore((s) => classesOf(s, profile.id));
  const draft = useStore((s) => event.skillIds.filter((id) => getSkill(id) && !isReviewed(s, getSkill(id)!)));
  const suggestions = useStore((s) => suggestSkills(s, `${event.title} ${event.notes ?? ""} ${event.attachment?.text ?? ""}`, event.classId));
  const unlocked = useStore((s) => Boolean(s.session.unlocked));
  const [editing, setEditing] = useState(false);
  const [changingSkills, setChangingSkills] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [gate, setGate] = useState(false);
  const editRef = useRef<HTMLDivElement>(null);

  const cls = classes.find((c) => c.id === event.classId);
  const at = fromLocalDate(event.date).getTime();
  const skills = event.skillIds.map((id) => getSkill(id)).filter((k): k is Skill => !!k);
  const exam = EXAM.has(event.kind);
  const due = event.kind === "homework" || event.kind === "project";
  // A day off or a school event is shown, not worked on: no help, prep or done mark.
  const work = exam || due;
  const canPrep = asLearner && exam && !event.done && event.date >= today && skills.length > 0;
  const practiceSkill = skills[0];
  const when = dayLabel(at, locale);
  // Little ones get the bigger target on the one thing to do next.
  const big = ["K", "1", "2"].includes(profile.grade) ? "min-h-14 px-6 text-base" : "";

  const tally = { proved: 0, working: 0, fresh: 0 };
  for (const k of skills) {
    const state = statuses[k.id]?.state ?? "new";
    if (state === "proved") tally.proved++;
    else if (state === "new") tally.fresh++;
    else tally.working++;
  }

  const prep = () => {
    // Same plan key as Today's prep line, so a set started here counts there (and isn't made twice).
    const id = startSet(read(), { profile, kind: "prep", skillIds: skills.map((k) => k.id), eventId: event.id, planKey: `${today}:prep:${event.id}`, now });
    if (id) router.push(`/practice/${id}?from=event:${event.id}`);
  };
  const practice = (skillId: string) => {
    const id = startSet(read(), { profile, kind: "pick", skillIds: [skillId], now });
    if (id) router.push(`/practice/${id}?from=event:${event.id}`);
  };
  const remove = () => {
    router.push("/calendar");
    removeEvent(event.id);
  };

  const resources: Resource[] = [];
  for (const k of skills) for (const r of resourcesFor({ skillId: k.id, grade: profile.grade, locale })) if (!resources.some((x) => x.id === r.id)) resources.push(r);

  const help = (
    <Link href={`/talk?event=${event.id}`} className={btn(canPrep ? "secondary" : "primary", "md", canPrep ? "" : big)}>
      <IconChat size={16} /> {t("plan.getHelp")}
    </Link>
  );

  return (
    <div className="space-y-10">
      <Link href="/calendar" className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-sm px-2 text-sm font-medium text-muted hover:bg-panel2 hover:text-ink">
        <IconArrowLeft size={16} /> {t("calendar.title")}
      </Link>

      <header className="space-y-3">
        <h1 className="font-brand text-t1 font-semibold text-balance text-ink sm:text-d3">{event.title}</h1>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body text-ink">
          <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: cls?.color ?? "var(--color-muted)" }} />
          <span>
            {t(`event.${event.kind}`)}
            {cls ? ` · ${cls.name}` : ""}
          </span>
          <span aria-hidden="true" className="text-muted">
            ·
          </span>
          <span>
            {due ? t("intake.item.due", { when }) : when}
            {event.time ? ` · ${event.time}` : ""}
          </span>
          <span className="font-opmono text-xs tabular-nums text-muted">{relativeDay(at, now, locale)}</span>
          {event.done && <Badge tone="good">{t("intake.item.done")}</Badge>}
        </p>
        {event.source === "ai" && <p className="text-xs text-muted">{t("intake.item.readByAi")}</p>}

        {work && (
          <div className="flex flex-wrap items-center gap-3 pt-3">
            {asLearner && canPrep && (
              <Button onClick={prep} className={big}>
                {t(event.kind === "quiz" ? "intake.item.prep.quiz" : "intake.item.prep.test")} <IconArrowRight size={16} />
              </Button>
            )}
            {asLearner && help}
            {asLearner && !exam && practiceSkill && (
              <Button variant="secondary" onClick={() => practice(practiceSkill.id)}>
                {t("intake.item.practice", { skill: practiceSkill.title[locale] })}
              </Button>
            )}
            <Button variant={asLearner ? "ghost" : "secondary"} onClick={() => updateEvent(event.id, { done: !event.done })}>
              <IconCheck size={16} /> {event.done ? t("intake.item.notDone") : t("plan.markDone")}
            </Button>
          </div>
        )}
        {canPrep && <p className="text-sm text-muted">{t("intake.item.prepWhy", { n: PLAN_RULES.prepDays })}</p>}
        {!asLearner && work && (
          <p className="text-sm text-muted">
            {t("intake.item.parentNote", { name: profile.nickname })}{" "}
            <Link href="/profiles" className="font-medium text-ink underline underline-offset-4 hover:text-accent">
              {t("intake.item.switch")}
            </Link>
          </p>
        )}
      </header>

      {event.kind !== "no-school" && (
        <section aria-labelledby="item-skills" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="item-skills" className="font-brand text-t2 font-semibold text-ink">
              {t("calendar.skills")}
            </h2>
            <Button variant="ghost" size="sm" className="min-h-11" aria-expanded={changingSkills} onClick={() => setChangingSkills(!changingSkills)}>
              <IconPen size={14} /> {changingSkills ? t("intake.item.doneEditing") : t("intake.item.editSkills")}
            </Button>
          </div>
          {skills.length > 0 ? (
            <>
              <p className="font-opmono text-xs tabular-nums text-muted">{tally.proved === skills.length ? t("intake.item.allProved") : t("intake.item.summary", tally)}</p>
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-panel">
                {skills.map((k) => {
                  const status = statuses[k.id];
                  return (
                    <li key={k.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                      <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${STATUS_DOT[status?.state ?? "new"]}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-ink">{k.title[locale]}</span>
                        <span className="block text-xs text-muted">{statusLine(status, now, locale)}</span>
                      </span>
                      {draft.includes(k.id) && <Badge>{t("practice.draft")}</Badge>}
                      {asLearner && (
                        <Button size="sm" variant="secondary" className="min-h-11" aria-label={`${t("practice.practiceThis")}: ${k.title[locale]}`} onClick={() => practice(k.id)}>
                          {t("practice.practiceThis")}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            !changingSkills && <p className="rounded-lg border border-dashed border-border px-5 py-4 text-sm text-muted">{t("calendar.skillsWhy")}</p>
          )}
          {changingSkills && (
            <div className="rounded-lg border border-border bg-panel p-4 sm:p-5">
              <SkillPicker value={event.skillIds} onChange={(ids) => updateEvent(event.id, { skillIds: ids })} suggestions={suggestions} locale={locale} label={t("intake.item.skillsLabel")} />
            </div>
          )}
        </section>
      )}

      {(event.attachment || event.notes) && (
        <section aria-labelledby="item-attached" className="space-y-4">
          <h2 id="item-attached" className="font-brand text-t2 font-semibold text-ink">
            {t("intake.item.attached")}
          </h2>
          {event.attachment?.blobId && <AttachedFile blobId={event.attachment.blobId} name={event.attachment.name} title={event.title} />}
          {event.attachment?.text && (
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-ink">{t("intake.item.text")}</h3>
              <p className="max-h-80 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-border bg-panel2/60 px-4 py-3 text-sm text-ink">{event.attachment.text}</p>
            </div>
          )}
          {event.notes && (
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-ink">{t("calendar.notes")}</h3>
              <p className="whitespace-pre-wrap break-words text-sm text-ink">{event.notes}</p>
            </div>
          )}
        </section>
      )}

      {resources.length > 0 && <ResourceList list={resources} locale={locale} max={4} />}

      <div ref={editRef} className="scroll-mt-6 space-y-4 border-t border-border pt-6">
        {editing ? (
          <EventForm
            profileId={profile.id}
            event={event}
            classes={classes}
            locale={locale}
            onDone={() => {
              setEditing(false);
              // The form can also delete the item; then there is nothing left to show here.
              if (!read().events.some((e) => e.id === event.id)) router.push("/calendar");
            }}
          />
        ) : confirm ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-ink">{t("intake.item.deleteConfirm", { title: event.title })}</p>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              {t("common.cancel")}
            </Button>
            <button type="button" autoFocus onClick={remove} className="k-btn bg-bad px-4 text-sm text-paper hover:bg-bad/90">
              {t("common.confirmDelete")}
            </button>
          </div>
        ) : gate ? (
          <ParentGate onPass={() => (setGate(false), setConfirm(true))} onCancel={() => setGate(false)} />
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setEditing(true);
                requestAnimationFrame(() => editRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
              }}
            >
              <IconPen size={14} /> {t("common.edit")}
            </Button>
            <Button variant="ghost" onClick={() => (unlocked ? setConfirm(true) : setGate(true))}>
              <IconTrash size={14} /> {t("common.delete")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
