"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { KaizenMark } from "@/components/brand";
import { useTitle } from "@/components/LangSync";
import { IconArrowLeft } from "@/components/icons";
import { HearContext } from "@/components/stage/hear";
import { TutorChat } from "@/components/tutor/TutorChat";
import { Notice } from "@/components/ui";
import { useT } from "@/i18n";
import { BREAK_EVERY_MS } from "@/lib/ai/safety";
import { currentLearner } from "@/lib/profiles";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";

const SITTING_KEY = "kaizenedu.sitting";

/** When this sitting began: kept across reloads, reset after 30 minutes away (SB 243 sitting clock). */
function sittingStart(now: number) {
  try {
    const raw = JSON.parse(sessionStorage.getItem(SITTING_KEY) ?? "null") as { start: number; last: number } | null;
    const start = raw && now - raw.last < 30 * 60_000 ? raw.start : now;
    sessionStorage.setItem(SITTING_KEY, JSON.stringify({ start, last: now }));
    return start;
  } catch {
    return now;
  }
}

export default function TalkPage() {
  const t = useT();
  useTitle(t("talk.title"));
  const router = useRouter();
  const params = useSearchParams();
  const learner = useStore(currentLearner) as Profile;
  const eventId = params.get("event");
  const about = params.get("about");
  const event = useStore((s) => (eventId ? s.events.find((e) => e.id === eventId && e.profileId === learner.id) : undefined));
  const [startedAt] = useState(() => sittingStart(Date.now()));
  const [needBreak, setNeedBreak] = useState(false);
  const young = ["K", "1", "2"].includes(learner.grade);

  useEffect(() => {
    const tick = () => setNeedBreak(Date.now() - startedAt >= BREAK_EVERY_MS);
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [startedAt]);

  const homework = event ? { title: event.title, notes: event.notes ?? event.attachment?.text?.slice(0, 1000) } : about ? { title: about.slice(0, 160) } : undefined;
  // A question carried in from elsewhere (the magic box, a lesson): asked as soon as the tutor opens.
  const [ask] = useState(() => params.get("ask")?.slice(0, 500) || undefined);
  return (
    <HearContext.Provider value={{ hear: true, young, locale: learner.locale }}>
      <div className="flex h-dvh flex-col bg-paper">
        <header className="border-b border-border bg-panel">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
            <button type="button" onClick={() => router.back()} aria-label={t("talk.back")} className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-panel2 hover:text-ink">
              <IconArrowLeft size={20} />
            </button>
            <KaizenMark size={24} />
            <h1 className="min-w-0 truncate font-brand text-t3 font-semibold text-ink">{homework ? homework.title : t("talk.title")}</h1>
          </div>
        </header>
        <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 pb-3 sm:px-6">
          {needBreak && (
            <div className="pt-3">
              <Notice tone="info">{t("talk.break")}</Notice>
            </div>
          )}
          <TutorChat
            board
            setup={{ learner, surface: homework ? "homework" : "talk", homework, ask, title: homework?.title ?? t("talk.title") }}
          />
        </main>
      </div>
    </HearContext.Provider>
  );
}
