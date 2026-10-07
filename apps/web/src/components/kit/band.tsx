"use client";

// The grade band on <html data-band>. Contract (DESIGN.md → K–2 band): the root layout mounts <BandSync>;
// it sets data-band from the current learner's grade and removes it for the grown-up view and signed-out
// pages. Screens never set it themselves; they read it through CSS ([data-band="k2"]) or useBand().
import { useEffect } from "react";
import type { Band } from "@/catalogue";
import { currentLearner } from "@/lib/profiles";
import { useStore } from "@/lib/store";
import type { Grade } from "@/lib/types";

/** Same bands as the catalogue's bandOf, without importing the catalogue into every page. */
export function bandFor(grade: Grade): Band {
  if (grade === "adult") return "adult";
  const n = grade === "K" ? 0 : Number(grade);
  return n <= 2 ? "k2" : n <= 5 ? "35" : n <= 8 ? "68" : "9";
}

/** The current learner's band, or null for the grown-up view and signed-out pages. */
export function useBand(): Band | null {
  return useStore((s) => {
    const learner = currentLearner(s);
    return learner ? bandFor(learner.grade) : null;
  });
}

export function BandSync() {
  const band = useBand();
  useEffect(() => {
    const root = document.documentElement;
    if (band) root.dataset.band = band;
    else delete root.dataset.band;
  }, [band]);
  return null;
}
