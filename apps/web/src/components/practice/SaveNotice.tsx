"use client";

import { useEffect, type ReactNode } from "react";
import { Hear, speakText } from "@/components/stage/hear";
import { Notice } from "@/components/ui";
import { useT } from "@/i18n";
import type { Locale } from "@/lib/types";

/**
 * Why work wasn't taken, said plainly: this device can't keep it (what a grown-up can do about it), or
 * another tab changed it and it was loaded again. A K–2 learner can't free up storage, so they hear,
 * read aloud, that a grown-up is needed, and the grown-up reads the line under it.
 */
export function SaveNotice({ problem, young, locale, action }: { problem: "storage" | "stale"; young: boolean; locale: Locale; action?: ReactNode }) {
  const t = useT();
  const child = young && problem === "storage" ? t("practice.evidenceSaveFailedYoung") : "";
  useEffect(() => {
    if (child) speakText(child, locale);
  }, [child, locale]);
  return (
    <Notice tone="warn" action={action}>
      {child && (
        <span className="mb-1 flex items-center gap-2 text-body font-medium">
          <span className="flex-1">{child}</span>
          <Hear text={child} />
        </span>
      )}
      <span className="block">{t(problem === "storage" ? "practice.evidenceSaveFailed" : "practice.evidenceStale")}</span>
    </Notice>
  );
}
