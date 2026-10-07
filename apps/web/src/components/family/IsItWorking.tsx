"use client";

import { useT } from "@/i18n";
import { isItWorking } from "@/learning/outcomes";
import { resolvedActsOf } from "@/lib/acts";
import { useAiMode } from "@/lib/ai/client";
import { teachingOf } from "@/lib/profiles";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { useSay } from "./say";

/** "Is it working?": what each kind of help meant to do, and whether it happened — counts from the record, in words. */
export function IsItWorking({ child, now }: { child: Profile; now: number }) {
  const t = useT();
  const say = useSay();
  // Until the mode is known, say what is true either way: the AI tutor uses this once connected.
  const mode = useAiMode();
  const ai = mode !== null && mode !== "demo";
  const sentences = useStore((s) => isItWorking(resolvedActsOf(s, child.id, now), teachingOf(s, child, now), now, { ai }));
  const id = `working-${child.id}`;
  return (
    <section aria-labelledby={id} className="space-y-3">
      <div>
        <h2 id={id} className="font-brand text-t2 font-semibold text-ink">
          {t("lm.work.title")}
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted">{t("lm.work.body")}</p>
      </div>
      {sentences.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-5 py-4 text-sm text-muted">{t("lm.work.empty", { name: child.nickname })}</p>
      ) : (
        <ul className="space-y-2 rounded-lg border border-border bg-panel px-4 py-3.5 text-sm sm:px-5">
          {sentences.map((s, i) => (
            <li key={`${s.key}:${i}`} className="flex gap-3">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-muted" />
              <span className="min-w-0 text-ink">{say(s)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
