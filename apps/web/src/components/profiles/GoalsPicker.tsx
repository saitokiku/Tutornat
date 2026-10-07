"use client";

import { useState } from "react";
import { IconCheck } from "@/components/icons";
import { Button } from "@/components/ui";
import { useT } from "@/i18n";
import { setGoals } from "@/lib/family";
import { GOALS, type Goal } from "@/lib/types";

/** Asked once: what the family wants. It changes what leads on each screen, never what is available. */
export function GoalsPicker({ initial, onDone, compact }: { initial?: Goal[]; onDone?: () => void; compact?: boolean }) {
  const t = useT();
  const [picked, setPicked] = useState<Goal[]>(initial ?? []);
  const toggle = (g: Goal) => setPicked((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]));
  return (
    <section aria-labelledby="goals-title" className={compact ? "space-y-3" : "space-y-4 rounded-lg border border-border bg-panel p-5 shadow-soft sm:p-6"}>
      <div>
        <h2 id="goals-title" className="font-brand text-t2 font-semibold text-ink">
          {t("goals.title")}
        </h2>
        <p className="mt-1 text-sm text-muted">{t("goals.body")}</p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {GOALS.map((g) => {
          const on = picked.includes(g);
          return (
            <li key={g}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(g)}
                className="flex h-full w-full items-start gap-3 rounded-md border border-border bg-panel px-4 py-3 text-left hover:border-ink/30 aria-pressed:border-ink"
              >
                <span aria-hidden="true" className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${on ? "border-ink bg-ink text-paper" : "border-border"}`}>
                  {on && <IconCheck size={12} strokeWidth={3} />}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{t(`goals.${g}`)}</span>
                  <span className="block text-xs text-muted">{t(`goals.${g}.body`)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => {
            setGoals(picked);
            onDone?.();
          }}
        >
          {t("common.save")}
        </Button>
        {!initial && (
          <Button variant="ghost" onClick={() => (setGoals([]), onDone?.())}>
            {t("goals.skip")}
          </Button>
        )}
      </div>
    </section>
  );
}
