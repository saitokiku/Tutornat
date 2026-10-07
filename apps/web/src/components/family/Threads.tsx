"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { useT } from "@/i18n";
import { shortDate, timeLabel } from "@/lib/format";
import { useStore } from "@/lib/store";
import { threadsOf } from "@/lib/tutor";
import type { Profile } from "@/lib/types";

const SHOWN = 20;

/** Every tutor conversation, readable by the family's grown-ups. Flagged ones say so. */
export function Threads({ child }: { child: Profile }) {
  const t = useT();
  const threads = useStore((s) => threadsOf(s, child.id));
  const [all, setAll] = useState(false);
  return (
    <section aria-labelledby={`threads-${child.id}`} className="space-y-3">
      <h2 id={`threads-${child.id}`} className="font-brand text-t2 font-semibold text-ink">
        {t("child.threads")}
      </h2>
      {threads.length === 0 ? (
        <p className="text-sm text-muted">{t("child.noThreads")}</p>
      ) : (
        <ul className="space-y-2">
          {(all ? threads : threads.slice(0, SHOWN)).map((th) => (
            <li key={th.id}>
              <details className={`group rounded-md border bg-panel ${th.flagged ? "border-accent/60" : "border-border"}`}>
                <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
                  <span className="font-medium text-ink">{th.title || t("talk.title")}</span>
                  <span className="text-xs text-muted">
                    {t(`child.surface.${th.surface}`)} · {shortDate(th.startedAt, child.locale)} {timeLabel(th.startedAt, child.locale)} · {t("child.turns", { n: th.lines.length })}
                  </span>
                  {th.flagged && <span className="text-xs font-semibold text-accent">{t("child.flagged")}</span>}
                  <span aria-hidden="true" className="ml-auto text-muted transition-transform group-open:rotate-90 motion-reduce:transition-none">
                    ›
                  </span>
                </summary>
                <ol className="space-y-2 border-t border-border px-4 py-3">
                  {th.lines.map((l, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-semibold text-ink">{l.role === "learner" ? child.nickname : t("tutor.title")}: </span>
                      <span className="whitespace-pre-wrap break-words text-ink">{l.text}</span>
                    </li>
                  ))}
                </ol>
              </details>
            </li>
          ))}
        </ul>
      )}
      {threads.length > SHOWN && (
        <Button variant="ghost" aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? t("lm.list.fewer") : t("lm.list.all", { n: threads.length })}
        </Button>
      )}
    </section>
  );
}
