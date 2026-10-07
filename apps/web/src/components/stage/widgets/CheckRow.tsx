"use client";

import { IconCheck } from "@/components/icons";
import { useT } from "@/i18n";
import { Hear, useHear } from "../hear";
import { Act } from "./Stepper";

/**
 * Shared "Check my answer" control + result line for widgets that have a target. Bigger for K–2.
 * `disabled` until the learner has changed something (a check of the untouched start is never right);
 * after a check it stays dimmed until the next change. It is aria-disabled, so the learner who just
 * pressed it keeps focus there while the result is announced.
 */
export function CheckRow({ result, onCheck, disabled }: { result: boolean | null; onCheck: () => void; disabled?: boolean }) {
  const t = useT();
  const { young } = useHear();
  const said = result === null ? "" : result ? t("stage.correct") : t("stage.incorrect");
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Act variant="primary" onClick={onCheck} off={disabled || result !== null}>
        {t("w.check")}
      </Act>
      <p role="status" className={`font-medium ${young ? "text-body" : "text-sm"} ${result === null ? "sr-only" : result ? "text-good" : "text-bad"}`}>
        {result === null ? "" : result ? (
          <span className="inline-flex items-center gap-1.5">
            <IconCheck size={16} /> {said}
          </span>
        ) : (
          said
        )}
      </p>
      {said && <Hear text={said} />}
    </div>
  );
}
