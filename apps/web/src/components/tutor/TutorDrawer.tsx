"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { KaizenMark } from "@/components/brand";
import { IconX } from "@/components/icons";
import { TutorDock, type DockContext } from "@/components/practice/tutor-dock";
import { HearContext } from "@/components/stage/hear";
import { useT } from "@/i18n";
import { recordTutorHelp } from "@/lib/practice";
import { recordHelpExposure } from "@/lib/evidence";
import type { Profile } from "@/lib/types";
import { getSkill } from "@/practice/skills";
import { TutorChat } from "./TutorChat";

/**
 * The tutor's seat beside a problem: a side panel on wide screens, a bottom sheet on phones. Opening it
 * is neutral; instructional content commits assistance before its text, cards or audio are released.
 */
export function TutorDrawer({ learner, surface, children }: { learner: Profile; surface: "practice" | "lesson"; children: ReactNode }) {
  const [ctx, setCtx] = useState<DockContext | null>(null);
  const [usedOn, setUsedOn] = useState<string>();
  const open = (c: DockContext) => {
    setCtx(c);
  };
  const beforeHelp = (id: string) => {
    if (!ctx) return false;
    try {
      if (ctx.attemptId) recordHelpExposure({ attemptId: ctx.attemptId, id, kind: "tutor", delivery: "latched" });
      else recordTutorHelp(learner.id, ctx.item.skillId, ctx.item.seed, ctx.item.level);
      setUsedOn(ctx.item.id);
      return true;
    } catch { return false; }
  };
  return (
    <TutorDock.Provider value={{ open, usedOn }}>
      <div className={`transition-[padding] duration-200 ${ctx ? "lg:pr-[400px]" : ""}`}>{children}</div>
      {ctx && <Panel key={ctx.item.id} ctx={ctx} learner={learner} surface={surface} beforeHelp={beforeHelp} onClose={() => setCtx(null)} />}
    </TutorDock.Provider>
  );
}

function Panel({ ctx, learner, surface, onClose, beforeHelp }: { ctx: DockContext; learner: Profile; surface: "practice" | "lesson"; onClose: () => void; beforeHelp: (id: string) => boolean }) {
  const t = useT();
  const panel = useRef<HTMLElement>(null);
  const young = ["K", "1", "2"].includes(learner.grade);
  // Focus goes into the panel on open and back to what opened it (the "Ask the tutor" button) on close.
  const [opener] = useState(() => (typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null));
  useEffect(() => {
    panel.current?.focus();
    return () => opener?.focus?.();
  }, [opener]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <HearContext.Provider value={{ hear: true, young, locale: learner.locale }}>
      <div className="fixed inset-0 z-30 bg-ink/20 lg:hidden" aria-hidden="true" onClick={onClose} />
      <aside
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tutor-panel-title"
        className="fixed inset-x-0 bottom-0 z-40 flex max-h-[80dvh] flex-col rounded-t-xl border border-border bg-panel shadow-lift outline-none lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[400px] lg:rounded-none lg:border-y-0 lg:border-r-0"
      >
        <header className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <KaizenMark size={24} />
          <h2 id="tutor-panel-title" className="font-brand text-t3 font-semibold text-ink">
            {t("tutor.title")}
          </h2>
          <button type="button" onClick={onClose} aria-label={t("common.close")} className="ml-auto grid size-11 place-items-center rounded-full text-muted hover:bg-panel2 hover:text-ink">
            <IconX size={18} />
          </button>
        </header>
        <TutorChat
          setup={{
            learner,
            surface,
            item: ctx.item,
            setId: ctx.setId,
            hintsSeen: ctx.hints,
            tries: ctx.tries,
            lastAnswer: ctx.lastAnswer,
            title: getSkill(ctx.item.skillId)?.title[learner.locale] ?? "",
            beforeHelp,
          }}
        />
      </aside>
    </HearContext.Provider>
  );
}
