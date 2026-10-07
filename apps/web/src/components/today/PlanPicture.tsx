"use client";

import { CourseArt } from "@/components/courses/CourseArt";
import { IconBook, IconLayers, IconRefresh } from "@/components/icons";
import { VisualView } from "@/components/stage/visuals";
import { SUBJECT_TINT } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { Locale, Visual } from "@/lib/types";
import type { PlanItem } from "@/planner/plan";
import { getSkill, makeItem } from "@/practice/skills";

/** The picture a skill's own first problem uses (a fixed seed, so it never changes between visits). */
export function skillPicture(skillId: string | undefined, locale: Locale): { visual?: Visual; picture?: string } {
  if (!skillId || !getSkill(skillId)) return {};
  try {
    const item = makeItem(skillId, 1, 1, locale);
    return { visual: item.visual, picture: item.picture };
  } catch {
    return {};
  }
}

/**
 * Picture-first art for a plan line (K–2 tiles): the lesson's course art, else the picture the skill's
 * problems are drawn with, else a plain icon. Decorative beside the title, so hidden from screen readers.
 */
export function PlanPicture({ item, locale }: { item: PlanItem; locale: Locale }) {
  const course = useStore((s) => (item.lesson ? s.courses.find((c) => c.id === item.lesson!.courseId) : undefined));
  if (item.kind === "lesson" && course) return <CourseArt lessons={course.lessons} subject={course.subject} size="lg" />;
  const tint = SUBJECT_TINT[item.subject ?? getSkill(item.skillIds[0] ?? "")?.subject ?? "other"];
  const { visual, picture } = item.kind === "due" ? {} : skillPicture(item.skillIds[0], locale);
  const Icon = item.kind === "due" ? IconBook : item.kind === "review" ? IconRefresh : IconLayers;
  return (
    <span
      aria-hidden="true"
      className="grid aspect-[4/3] w-full shrink-0 place-items-center overflow-hidden rounded-lg p-5"
      style={{ background: `color-mix(in srgb, ${tint} 9%, var(--color-panel2))` }}
    >
      {visual ? (
        <span className="grid size-full place-items-center [&_svg]:h-auto [&_svg]:max-h-full [&_svg]:w-full">
          <VisualView visual={visual} alt="" tint={tint} />
        </span>
      ) : picture ? (
        <span className="text-d1 leading-none">{picture}</span>
      ) : (
        <span className="grid size-16 place-items-center rounded-full bg-panel text-ink">
          <Icon size={30} />
        </span>
      )}
    </span>
  );
}
