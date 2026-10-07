import type { Grade, Locale, Subject } from "@/lib/types";
import { getSkill } from "@/practice/skills";
import { RESOURCES } from "./list";

// Real, free places to read, watch and try more — named sources, checked links, never copied content.

export type ResourceKind = "video" | "simulation" | "book" | "text" | "practice" | "library" | "tool";

export type Resource = {
  id: string;
  title: string;
  source: string;
  url: string;
  kind: ResourceKind;
  subject: Subject;
  /** Inclusive grade band, e.g. ["K", "2"]. */
  grades: [Grade, Grade];
  /** Languages the resource itself is available in. */
  languages: Locale[];
  /** Skill ids (or id prefixes ending in "."), and plain topic words, it fits. */
  fits: string[];
  /** One plain line on what it is. */
  about: Record<Locale, string>;
  /** Free to use as linked; note anything a family should know (account, ads). */
  note?: Record<Locale, string>;
};

const ORDER: Grade[] = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "adult"];
const gi = (g: Grade) => ORDER.indexOf(g);

export function resourcesFor(q: { skillId?: string; topic?: string; subject?: Subject; grade?: string; locale?: Locale }): Resource[] {
  const skill = q.skillId ? getSkill(q.skillId) : undefined;
  const subject = q.subject ?? skill?.subject;
  const grade = (q.grade ?? skill?.grade) as Grade | undefined;
  const words = (q.topic ?? "").toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const scored = RESOURCES.map((r) => {
    let score = 0;
    if (subject && r.subject !== subject) return [r, -1] as const;
    if (grade && (gi(grade) < gi(r.grades[0]) - 1 || gi(grade) > gi(r.grades[1]) + 1)) return [r, -1] as const;
    if (skill) for (const f of r.fits) if (f === skill.id || (f.endsWith(".") && skill.id.startsWith(f))) score += 5;
    for (const w of words) if (r.fits.some((f) => f.includes(w)) || r.title.toLowerCase().includes(w)) score += 2;
    if (q.locale && r.languages.includes(q.locale)) score += 1;
    if (!skill && !words.length) score += 1;
    return [r, score] as const;
  });
  return scored.filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).map(([r]) => r);
}
