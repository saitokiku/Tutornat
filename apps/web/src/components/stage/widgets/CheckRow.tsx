"use client";

import { IconCheck } from "@/components/icons";
import { Button } from "@/components/ui";
import { useT } from "@/i18n";
import { Hear, useHear } from "../hear";

/** Shared "Check my answer" control + result line for widgets that have a target. Bigger for K–2. */
export function CheckRow({ result, onCheck, disabled }: { result: boolean | null; onCheck: () => void; disabled?: boolean }) {
  const t = useT();
  const { young } = useHear();
  const said = result === null ? "" : result ? t("stage.correct") : t("stage.incorrect");
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary" onClick={onCheck} disabled={disabled || result !== null} className={young ? "min-h-14 px-7 text-body" : ""}>
        {t("w.check")}
      </Button>
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
