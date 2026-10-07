"use client";

import { useState } from "react";
import { IconEye } from "@/components/icons";
import { useT } from "@/i18n";
import { PointAtInput, runSpotFromToolPart } from "@/lib/ai/spot-tool";

type ToolPart = { type: string; state?: string; toolCallId?: string; input?: unknown };

/**
 * What a tool-point_at part leaves in the tutor's transcript: one small "Show me again" control, so a
 * learner who closed the caption (or looked away) can get the pointing back. Says so if it is gone.
 */
export function SpotAgain({ part }: { part: ToolPart }) {
  const t = useT();
  const [gone, setGone] = useState(false);
  const input = part.type === "tool-point_at" ? PointAtInput.safeParse(part.input) : null;
  if (!input?.success) return null;
  return (
    <p className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => setGone(!runSpotFromToolPart(part, { force: true }))} className="k-chip min-h-11 px-3.5">
        <IconEye size={15} className="text-accent" />
        {t("spot.again")}
        <span className="sr-only">: {input.data.say}</span>
      </button>
      <span role="status" className="text-xs text-muted">
        {gone ? t("spot.gone") : ""}
      </span>
    </p>
  );
}
