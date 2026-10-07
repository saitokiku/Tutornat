import { REVIEWED } from "@/practice/reviewed";
import type { Skill } from "@/practice/types";
import type { StoreState } from "./store";

/** The newest review decision on a skill made on this device (the /review tool). */
export const reviewOf = (s: StoreState, skillId: string) =>
  s.reviews.filter((r) => r.skillId === skillId).sort((a, b) => b.at - a.at)[0];

/** Computed skills are checked by code; draft banks count as reviewed once a teacher approved them. */
export const isReviewed = (s: StoreState, skill: Pick<Skill, "id" | "content">) =>
  skill.content === "computed" || REVIEWED.includes(skill.id) || reviewOf(s, skill.id)?.status === "approved";
