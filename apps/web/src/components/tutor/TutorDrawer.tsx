"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { KaizenMark } from "@/components/brand";
import { IconArrowRight, IconX } from "@/components/icons";
import { MathText } from "@/components/practice/MathText";
import { TutorDock, type DockContext } from "@/components/practice/tutor-dock";
import { Hear, HearContext, speakText } from "@/components/stage/hear";
import { VisualView } from "@/components/stage/visuals";
import { SUBJECT_TINT } from "@/components/ui";
import { useT } from "@/i18n";
import { recordTutorHelp } from "@/lib/practice";
import { saveThread } from "@/lib/tutor";
import { demoOpening, demoReply, intentOf, type DemoState } from "@/lib/tutor-demo";
import type { Profile } from "@/lib/types";
import { getSkill } from "@/practice/skills";
import type { Item } from "@/practice/types";

type Line = { role: "learner" | "tutor"; text: string; similar?: Item };

/**
 * The tutor's seat beside a problem: a side panel on wide screens, a bottom sheet on phones. Opening it
 * on a problem marks that problem as helped and restarts that skill's check clock — honestly.
 */
export function TutorDrawer({ learner, surface, children }: { learner: Profile; surface: "practice" | "lesson"; children: ReactNode }) {
  const [ctx, setCtx] = useState<DockContext | null>(null);
  const [usedOn, setUsedOn] = useState<string>();
  const open = (c: DockContext) => {
    setCtx(c);
    setUsedOn(c.item.id);
    recordTutorHelp(learner.id, c.item.skillId, c.item.seed, c.item.level);
  };
  return (
    <TutorDock.Provider value={{ open, usedOn }}>
      <div className={`transition-[padding] duration-200 ${ctx ? "lg:pr-[400px]" : ""}`}>{children}</div>
      {ctx && <Panel key={ctx.item.id} ctx={ctx} learner={learner} surface={surface} onClose={() => setCtx(null)} />}
    </TutorDock.Provider>
  );
}

function Panel({ ctx, learner, surface, onClose }: { ctx: DockContext; learner: Profile; surface: "practice" | "lesson"; onClose: () => void }) {
  const t = useT();
  const locale = learner.locale;
  const young = ["K", "1", "2"].includes(learner.grade);
  const [lines, setLines] = useState<Line[]>(() => [{ role: "tutor", ...demoOpening(ctx.item, locale) }]);
  const [state, setState] = useState<DemoState>({ hintsGiven: 1, tries: ctx.tries });
  const [input, setInput] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const threadId = useRef(crypto.randomUUID());
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();
    panel.current?.focus();
    if (young) speakText(lines[0].text, locale);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read the opening once
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    saveThread({
      id: threadId.current,
      profileId: learner.id,
      startedAt: startedAt.current || Date.now(),
      surface,
      title: getSkill(ctx.item.skillId)?.title[locale] ?? "",
      lines: lines.map((l) => ({ role: l.role, text: l.similar ? `${l.text} (${l.similar.say})` : l.text, at: Date.now() })),
    });
  }, [lines, learner.id, surface, ctx.item.skillId, locale]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const send = (text: string) => {
    const clean = text.trim().slice(0, 500);
    if (!clean) return;
    const intent = intentOf(clean);
    const reply = demoReply(ctx.item, locale, intent, state);
    if (intent === "hint") setState((s) => ({ ...s, hintsGiven: s.hintsGiven + 1 }));
    setLines((l) => [...l, { role: "learner", text: clean }, { role: "tutor", ...reply }]);
    setInput("");
    if (young) speakText(reply.text, locale);
  };

  const quick: [string, string][] = [
    [t("tutor.quick.hint"), "hint"],
    [t("tutor.quick.similar"), "similar"],
    [t("tutor.quick.why"), "why"],
  ];
  const tint = SUBJECT_TINT[getSkill(ctx.item.skillId)?.subject ?? "math"];

  return (
    <HearContext.Provider value={{ hear: true, young, locale }}>
      <div className="fixed inset-0 z-30 bg-ink/20 lg:hidden" aria-hidden="true" onClick={onClose} />
      <aside
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tutor-panel-title"
        className="fixed inset-x-0 bottom-0 z-40 flex max-h-[78dvh] flex-col rounded-t-xl border border-border bg-panel shadow-lift outline-none lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[400px] lg:rounded-none lg:border-y-0 lg:border-r-0"
      >
        <header className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <KaizenMark size={24} />
          <h2 id="tutor-panel-title" className="font-brand text-t3 font-semibold text-ink">
            {t("tutor.title")}
          </h2>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-warn" />
            {t("tutor.demoLabel")}
          </span>
          <button type="button" onClick={onClose} aria-label={t("common.close")} className="ml-auto grid size-10 place-items-center rounded-full text-muted hover:bg-panel2 hover:text-ink">
            <IconX size={18} />
          </button>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" role="log" aria-live="polite" aria-relevant="additions">
          <p className="text-xs text-muted">{t("tutor.disclosure")}</p>
          {lines.map((l, i) =>
            l.role === "learner" ? (
              <p key={i} className="ml-10 rounded-lg rounded-br-sm bg-ink px-3.5 py-2.5 text-sm text-paper">
                {l.text}
              </p>
            ) : (
              <div key={i} className="mr-6 space-y-2">
                <div className="flex items-start gap-2">
                  <p className="rounded-lg rounded-bl-sm bg-panel2 px-3.5 py-2.5 text-sm text-ink">{l.text}</p>
                  <Hear text={l.text} />
                </div>
                {l.similar && <Worked item={l.similar} tint={tint} />}
              </div>
            ),
          )}
          <div ref={end} />
        </div>
        <div className="border-t border-border p-3">
          <div className="mb-2 flex flex-wrap gap-2">
            {quick.map(([label, intent]) => (
              <button key={intent} type="button" onClick={() => send(label)} className="k-btn-secondary min-h-9 px-3 text-xs">
                {label}
              </button>
            ))}
          </div>
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <label htmlFor="tutor-say" className="sr-only">
              {t("tutor.placeholder")}
            </label>
            <textarea
              id="tutor-say"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={t("tutor.placeholder")}
              className="min-h-11 flex-1 resize-none rounded-sm border border-border bg-panel px-3 py-2.5 text-sm text-ink placeholder:text-muted/80 focus:border-accent focus:outline-none"
            />
            <button type="submit" aria-label={t("tutor.send")} disabled={!input.trim()} className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-paper disabled:opacity-30">
              <IconArrowRight size={18} />
            </button>
          </form>
        </div>
      </aside>
    </HearContext.Provider>
  );
}

/** A similar problem with its full worked solution, so the learner can follow a model and return to theirs. */
export function Worked({ item, tint }: { item: Item; tint: string }) {
  const t = useT();
  return (
    <div className="rounded-md border border-border bg-panel p-3">
      {item.visual && (
        <div className="mb-2 flex justify-center">
          <VisualView visual={item.visual} alt={item.alt ?? ""} tint={tint} />
        </div>
      )}
      <p className="font-medium text-ink">
        <MathText parts={item.prompt} />
      </p>
      <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-sm text-ink">
        {item.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-muted">{t("tutor.backToYours")}</p>
    </div>
  );
}
