"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { IconEye } from "@/components/icons";
import { useT } from "@/i18n";
import { PointAtInput, pointResult, pointStatus, runSpotFromToolPart, subscribePoints } from "@/lib/ai/spot-tool";

type ToolPart = { type: string; state?: string; toolCallId?: string; input?: unknown };

/**
 * What a tool-point_at part leaves in the tutor's transcript: one small "Show me again" control, so a
 * learner who closed the caption (or looked away) can get the pointing back. Only for a pointing that
 * lit in the first place: one that never showed (not on screen, or guarded as part of the answer) leaves
 * nothing behind. Says so if the target has since gone; a target guarded since then just stays dark.
 */
export function SpotAgain({ part }: { part: ToolPart }) {
  const t = useT();
  const id = useId();
  const first = useSyncExternalStore(subscribePoints, () => pointResult(part.toolCallId), () => undefined);
  const [gone, setGone] = useState(false);
  const input = part.type === "tool-point_at" ? PointAtInput.safeParse(part.input) : null;
  if (!input?.success || first !== "ok") return null;
  const again = () => setGone(!runSpotFromToolPart(part, { force: true }) && pointStatus(input.data) === "missing");
  return (
    <p className="flex flex-wrap items-center gap-2">
      {/* The caption is a description, not content: the chat log is a live region and has already said
          it. A hidden node is not announced as an addition, but still describes the chip when it is focused. */}
      <button type="button" onClick={again} aria-describedby={id} className="k-chip min-h-11 px-3.5">
        <IconEye size={15} className="text-accent" />
        {t("spot.again")}
      </button>
      <span id={id} hidden>
        {input.data.say}
      </span>
      <span role="status" className="text-xs text-muted">
        {gone ? t("spot.gone") : ""}
      </span>
    </p>
  );
}
