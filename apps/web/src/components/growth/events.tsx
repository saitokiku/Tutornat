"use client";

import { IconCheck, IconCheckCircle, IconLightbulb, IconX } from "@/components/icons";
import type { useT } from "@/i18n";
import { findLesson } from "@/lib/activity";
import type { LogEntry } from "@/lib/growth";
import type { SchoolEvent } from "@/planner/types";
import type { ActivityEvent, Course, Locale } from "@/lib/types";
import { getSkill } from "@/practice/skills";

type T = ReturnType<typeof useT>;

export function EventMark({ e }: { e: ActivityEvent }) {
  if (e.type === "quiz_answered") {
    if (!e.correct) return <IconX size={16} className="shrink-0 text-bad" />;
    return e.assisted ? <IconLightbulb size={16} className="shrink-0 text-warn" /> : <IconCheck size={16} className="shrink-0 text-good" />;
  }
  return <span aria-hidden="true" className={`mx-[5px] size-1.5 shrink-0 rounded-full ${e.type === "lesson_completed" ? "bg-good" : "bg-muted"}`} />;
}

export function eventText(e: ActivityEvent, courses: Course[], t: T) {
  const { course, lesson } = findLesson(courses, e.courseId, e.lessonId);
  const vars = { course: course?.title ?? "—", lesson: lesson?.title ?? course?.title ?? "—" };
  if (e.type === "quiz_answered") return t(!e.correct ? "growth.ev.quiz_missed" : e.assisted ? "growth.ev.quiz_help" : "growth.ev.quiz_own", vars);
  return t(`growth.ev.${e.type}`, vars);
}

/** The mark beside a line of the record: a check or a proof gets its result; everything else a dot. */
export function LogMark({ entry }: { entry: LogEntry }) {
  if (entry.kind === "activity") return <EventMark e={entry.event} />;
  if (entry.kind === "proved") return <IconCheckCircle size={16} className="shrink-0 text-good" />;
  if (entry.kind === "check") return entry.passed ? <IconCheck size={16} className="shrink-0 text-good" /> : <IconX size={16} className="shrink-0 text-bad" />;
  return <span aria-hidden="true" className="mx-[5px] size-1.5 shrink-0 rounded-full bg-ink/60" />;
}

/** One line of the record in words, plus the answer tally for a set. */
export function logText(entry: LogEntry, ctx: { courses: Course[]; events: SchoolEvent[]; locale: Locale; t: T }): { text: string; meta?: string } {
  const { t, locale } = ctx;
  const skill = (id: string) => getSkill(id)?.title[locale] ?? id;
  switch (entry.kind) {
    case "activity":
      return { text: eventText(entry.event, ctx.courses, t) };
    case "proved":
      return { text: t("fam.ev.proved", { skill: skill(entry.skillId) }) };
    case "check":
      return { text: t(entry.passed ? "fam.ev.checkPassed" : "fam.ev.checkMissed", { skill: skill(entry.skillId) }) };
    case "set": {
      const { set, tally } = entry;
      const meta = t("fam.tally", { own: tally.own, helped: tally.helped, missed: tally.missed });
      if (set.ai) return { text: t("fam.ev.ai", { topic: set.topic ?? "—" }), meta };
      if (set.kind === "placement") return { text: t("fam.ev.placement", { subject: t(`subject.${set.subject}`) }), meta };
      if (set.kind === "review") return { text: t("fam.ev.review", { skills: [...new Set(set.slots.map((x) => x.skillId))].map(skill).join(", ") || skill(set.skillId) }), meta };
      if (set.kind === "feedback") return { text: t("fam.ev.feedback", { skill: skill(set.skillId) }), meta };
      if (set.kind === "prep") {
        const event = ctx.events.find((e) => e.id === set.eventId);
        return { text: event ? t("fam.ev.prep", { title: event.title }) : t("fam.ev.prepSet"), meta };
      }
      return { text: t("fam.ev.set", { skill: skill(set.skillId) }), meta };
    }
  }
}
