"use client";

import { IconCheck, IconLightbulb, IconX } from "@/components/icons";
import type { useT } from "@/i18n";
import { findLesson } from "@/lib/activity";
import type { ActivityEvent, Course } from "@/lib/types";

export function EventMark({ e }: { e: ActivityEvent }) {
  if (e.type === "quiz_answered") {
    if (!e.correct) return <IconX size={16} className="shrink-0 text-bad" />;
    return e.assisted ? <IconLightbulb size={16} className="shrink-0 text-warn" /> : <IconCheck size={16} className="shrink-0 text-good" />;
  }
  return <span aria-hidden="true" className={`mx-[5px] size-1.5 shrink-0 rounded-full ${e.type === "lesson_completed" ? "bg-good" : "bg-muted"}`} />;
}

export function eventText(e: ActivityEvent, courses: Course[], t: ReturnType<typeof useT>) {
  const { course, lesson } = findLesson(courses, e.courseId, e.lessonId);
  const vars = { course: course?.title ?? "—", lesson: lesson?.title ?? course?.title ?? "—" };
  if (e.type === "quiz_answered") return t(!e.correct ? "growth.ev.quiz_missed" : e.assisted ? "growth.ev.quiz_help" : "growth.ev.quiz_own", vars);
  return t(`growth.ev.${e.type}`, vars);
}
