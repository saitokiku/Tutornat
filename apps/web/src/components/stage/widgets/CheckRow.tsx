"use client";

import { IconCheck } from "@/components/icons";
import { Button } from "@/components/ui";
import { useT } from "@/i18n";

/** Shared "Check my answer" control + result line for widgets that have a target. */
export function CheckRow({ result, onCheck }: { result: boolean | null; onCheck: () => void }) {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary" onClick={onCheck}>
        {t("w.check")}
      </Button>
      <p role="status" className={`text-sm font-medium ${result === null ? "sr-only" : result ? "text-good" : "text-bad"}`}>
        {result === null ? "" : result ? (
          <span className="inline-flex items-center gap-1.5">
            <IconCheck size={16} /> {t("stage.correct")}
          </span>
        ) : (
          t("stage.incorrect")
        )}
      </p>
    </div>
  );
}
