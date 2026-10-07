import { z } from "zod";
import { GRADES } from "../types";

// What the browser tells the tutor about the moment. Never the learner's name. Items are sent as
// (skill, level, seed) and rebuilt on the server, so answer keys are not trusted from the client.

export const TutorContext = z.object({
  locale: z.enum(["en", "es"]),
  grade: z.enum(GRADES as [string, ...string[]]),
  surface: z.enum(["practice", "lesson", "talk", "homework"]),
  item: z.object({ skillId: z.string().max(60), level: z.number().int().min(1).max(5), seed: z.number().int() }).optional(),
  tries: z.number().int().min(0).max(50).optional(),
  lastAnswer: z.string().max(80).optional(),
  lesson: z.object({ title: z.string().max(160), scene: z.string().max(1600) }).optional(),
  homework: z.object({ title: z.string().max(160), notes: z.string().max(1000).optional() }).optional(),
  interests: z.array(z.string().max(40)).max(6).optional(),
  /** Skills the learner is practicing or found hard lately (ids), for examples and suggestions. */
  working: z.array(z.string().max(60)).max(8).optional(),
});

export type TutorContext = z.infer<typeof TutorContext>;
