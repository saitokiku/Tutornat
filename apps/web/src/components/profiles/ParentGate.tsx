"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui";
import { useT } from "@/i18n";
import { unlockParent } from "@/lib/profiles";

const pair = () => [6 + Math.floor(Math.random() * 4), 6 + Math.floor(Math.random() * 4)] as const;

/**
 * A grown-up check before parent-only places (the usual kids'-app parental gate). It keeps small
 * children out; it is not security — the account password is.
 */
export function ParentGate({ onPass, onCancel }: { onPass: () => void; onCancel: () => void }) {
  const t = useT();
  const id = useId();
  const [[a, b], setPair] = useState(pair);
  const [answer, setAnswer] = useState("");
  const [wrong, setWrong] = useState(false);
  return (
    <form
      className="mx-auto max-w-sm space-y-4 rounded-lg border border-border bg-panel p-6 text-left shadow-lift animate-fade-up"
      onSubmit={(e) => {
        e.preventDefault();
        if (Number(answer) === a * b) {
          unlockParent();
          onPass();
        } else {
          setWrong(true);
          setAnswer("");
          setPair(pair());
        }
      }}
    >
      <div>
        <p className="font-brand text-t2 font-semibold text-ink">{t("gate.title")}</p>
        <p className="mt-1 text-sm text-muted">{t("gate.why")}</p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor={id} className="block text-body font-medium text-ink">
          {t("gate.question", { a, b })}
        </label>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          aria-describedby={wrong ? `${id}-wrong` : undefined}
          className="k-input font-opmono"
          value={answer}
          onChange={(e) => setAnswer(e.target.value.replace(/\D/g, "").slice(0, 3))}
        />
        {wrong && (
          <p id={`${id}-wrong`} role="alert" className="text-xs font-medium text-bad">
            {t("gate.wrong")}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={!answer}>
          {t("gate.continue")}
        </Button>
      </div>
    </form>
  );
}
