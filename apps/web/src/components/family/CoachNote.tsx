"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { useT } from "@/i18n";
import { useAiMode } from "@/lib/ai/client";
import type { WeekFacts } from "@/lib/family";
import type { Locale } from "@/lib/types";
import { getSkill } from "@/practice/skills";

/** Optional: a short note for the week, written by AI only from the numbers on this page, and labelled. */
export function CoachNote({ facts, locale, comingUp }: { facts: WeekFacts; locale: Locale; comingUp: string[] }) {
  const t = useT();
  const ai = useAiMode();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!ai || ai === "demo") return null;
  const title = (id: string) => getSkill(id)?.title[locale] ?? id;
  const write = async () => {
    setBusy(true);
    setFailed(false);
    const res = await fetch("/api/ai/coach", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        locale,
        facts: {
          minutes: facts.minutes,
          sets: facts.sets,
          own: facts.own,
          helped: facts.helped,
          missed: facts.missed,
          proved: facts.proved.map(title),
          helpOn: facts.helpOn.map(title),
          checksWaiting: facts.checksWaiting.map(title),
          stuck: facts.stuck.map(title),
          comingUp,
        },
      }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setFailed(true);
    setNote(((await res.json()) as { note: string }).note);
  };
  return (
    <div className="space-y-2 rounded-md border border-border bg-panel2/60 p-4">
      {note ? (
        <>
          <p className="whitespace-pre-wrap text-sm text-ink">{note}</p>
          <p className="text-xs text-muted">{t("child.coachLabel")}</p>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 text-sm text-muted">{failed ? t("child.coachFailed") : t("child.coachOffer")}</p>
          <Button variant="secondary" loading={busy} onClick={write}>
            {t("child.coachWrite")}
          </Button>
        </div>
      )}
    </div>
  );
}
