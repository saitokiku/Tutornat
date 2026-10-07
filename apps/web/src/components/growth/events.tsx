"use client";

import { IconBook, IconCheck, IconCheckCircle, IconLightbulb, IconX } from "@/components/icons";
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
  if (entry.kind === "reading") return <IconBook size={16} className="shrink-0 text-muted" />;
  return <span aria-hidden="true" className={`mx-[5px] size-1.5 shrink-0 rounded-full ${entry.finished ? "bg-ink/60" : "bg-panel ring-1 ring-ink/40"}`} />;
}

/**
 * One line of the record in words, plus its details: a set's answer tally (and where it stopped, if
 * it was left early), a finished lesson's questions, the minutes of logged reading.
 */
export function logText(entry: LogEntry, ctx: { courses: Course[]; events: SchoolEvent[]; locale: Locale; t: T }): { text: string; meta?: string } {
  const { t, locale } = ctx;
  const skill = (id: string) => getSkill(id)?.title[locale] ?? id;
  switch (entry.kind) {
    case "activity":
      return { text: eventText(entry.event, ctx.courses, t), meta: entry.tally && t("fam.lessonChecks", entry.tally) };
    case "proved":
      return { text: t("fam.ev.proved", { skill: skill(entry.skillId) }) };
    case "check":
      return { text: t(entry.passed ? "fam.ev.checkPassed" : "fam.ev.checkMissed", { skill: skill(entry.skillId) }) };
    case "reading": {
      const { title, author, minutes } = entry.entry;
      return { text: author ? t("fam.ev.readingBy", { title, author }) : t("fam.ev.reading", { title }), meta: t("fam.ev.readingMeta", { n: minutes }) };
    }
    case "set": {
      const { set, tally, finished, answered, of } = entry;
      const counts = t("fam.tally", { own: tally.own, helped: tally.helped, missed: tally.missed });
      if (set.kind === "check") return { text: t("fam.ev.checkStopped", { skill: skill(set.skillId) }), meta: t("fam.ev.checkStoppedMeta", { n: answered, of: of ?? answered }) };
      const meta = finished || of === undefined ? counts : `${t("fam.ev.stopped", { n: answered, of })} · ${counts}`;
      const text = (() => {
        if (set.ai) return t("fam.ev.ai", { topic: set.topic ?? "—" });
        if (set.kind === "placement") return t(finished ? "fam.ev.placement" : "fam.ev.placementStopped", { subject: t(`subject.${set.subject}`) });
        if (set.kind === "review")
          return t(finished ? "fam.ev.review" : "fam.ev.reviewStopped", { skills: [...new Set(set.slots.map((x) => x.skillId))].map(skill).join(", ") || skill(set.skillId) });
        if (set.kind === "feedback") return t("fam.ev.feedback", { skill: skill(set.skillId) });
        if (set.kind === "prep") {
          const event = ctx.events.find((e) => e.id === set.eventId);
          if (event) return t(finished ? "fam.ev.prep" : "fam.ev.prepStopped", { title: event.title });
          return t(finished ? "fam.ev.prepSet" : "fam.ev.prepSetStopped");
        }
        return t(finished ? "fam.ev.set" : "fam.ev.setStopped", { skill: skill(set.skillId) });
      })();
      return { text, meta };
    }
  }
}
