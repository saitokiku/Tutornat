"use client";

import { createContext, useContext } from "react";
import type { AttemptSource } from "@/learning/types";
import type { Item } from "@/practice/types";

// The seat of the tutor beside a practice problem. The drawer itself lives in components/tutor;
// this context lets the runner open it with the problem and know whether the tutor helped.

/** `source`: the set question the problem is, so the tutor's help is saved on it (lib/practice.ts recordTutorHelp). */
export type DockContext = { item: Item; setId?: string; source?: AttemptSource; hints?: number; tries: number; lastAnswer?: string };

export const TutorDock = createContext<{ open: (ctx: DockContext) => void; usedOn?: string }>({ open: () => {} });
export const useTutorDock = () => useContext(TutorDock);
