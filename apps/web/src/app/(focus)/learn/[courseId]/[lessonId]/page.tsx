"use client";

import { useParams, useRouter } from "next/navigation";
import { NotFound } from "@/components/courses/NotFound";
import { Stage } from "@/components/stage/Stage";
import { getCourse } from "@/lib/courses";
import { currentLearner } from "@/lib/profiles";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";

export default function LearnPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  // New visit (link or push) = a fresh lesson; back/forward restores where the learner was.
  const { bfcacheId } = useRouter();
  const learner = useStore(currentLearner) as Profile;
  const course = useStore((s) => getCourse(s, courseId, learner.id));
  const lesson = course?.status === "ready" ? course.lessons.find((l) => l.id === lessonId) : undefined;
  if (!course || !lesson)
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <NotFound />
      </main>
    );
  return <Stage key={`${course.id}:${lesson.id}:${bfcacheId}`} course={course} lesson={lesson} learner={learner} />;
}
