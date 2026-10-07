"use client";

import { createContext, useContext } from "react";
import type { Item } from "@/practice/types";

// The seat of the tutor beside a practice problem. The drawer itself lives in components/tutor;
// this context lets the runner open it with the problem and know whether the tutor helped.

export type DockContext = { item: Item; setId?: string; attemptId?: string; hints?: number; tries: number; lastAnswer?: string };

export const TutorDock = createContext<{ open: (ctx: DockContext) => void; usedOn?: string }>({ open: () => {} });
export const useTutorDock = () => useContext(TutorDock);
